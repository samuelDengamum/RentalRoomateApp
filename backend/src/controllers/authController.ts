import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User';
import Property from '../models/Property';
import Roommate from '../models/Roommate';
import Message from '../models/Message';
import Report from '../models/Report';
import Feedback from '../models/Feedback';
import Block from '../models/Block';
import Notification from '../models/Notification';
import TourRequest from '../models/TourRequest';
import { AuthRequest } from '../middleware/auth';
import { notifyAdmins } from '../services/notificationService';

const FIXED_TOURING_FEE_RWF = Number(process.env.FIXED_TOURING_FEE_RWF || 5000);
const safeTouringFee = Number.isFinite(FIXED_TOURING_FEE_RWF) ? FIXED_TOURING_FEE_RWF : 5000;

/**
 * Register a new user in the system.
 * Validates request data, hashes the password, and creates a User record.
 * 
 * @param req Express AuthRequest containing registration details in body
 * @param res Express Response to send JWT token and user info
 */
export const register = async (req: AuthRequest, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      userType,
      location,
      country,
      preferredLanguage,
      preferredLocale,
      preferredCurrency,
      marketingConsent,
      acceptTerms,
      consentVersion
    } = req.body;

    if (!acceptTerms) {
      return res.status(400).json({ error: 'You must accept the Terms and Privacy Policy to create an account' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const cleanedUsername = typeof username === 'string' ? username.trim() : '';
    const resolvedFirstName = typeof firstName === 'string' && firstName.trim() ? firstName.trim() : cleanedUsername || 'RentalHub';
    const resolvedLastName = typeof lastName === 'string' && lastName.trim() ? lastName.trim() : 'User';

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      userType,
      location,
      country: (country || 'RW').toString().slice(0, 2).toUpperCase(),
      preferredLanguage: ['en', 'fr', 'ar'].includes(preferredLanguage) ? preferredLanguage : 'en',
      preferredLocale: typeof preferredLocale === 'string' ? preferredLocale.slice(0, 10) : 'en-RW',
      preferredCurrency: ['RWF', 'USD', 'EUR'].includes(preferredCurrency) ? preferredCurrency : 'RWF',
      marketingConsent: !!marketingConsent,
      consentVersion: typeof consentVersion === 'string' ? consentVersion.slice(0, 20) : '2026-03',
      consentAcceptedAt: new Date(),
      privacyPolicyAcceptedAt: new Date()
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d'
    });

    res.status(201).json({ 
      message: 'User registered successfully', 
      token,
      user: {
        id: user._id,
        username,
        email,
        userType,
        role: user.role,
        landlordSubscriptionStatus: user.landlordSubscription?.status || 'not_submitted',
        preferredLanguage: user.preferredLanguage,
        preferredLocale: user.preferredLocale,
        preferredCurrency: user.preferredCurrency
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.banned) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d'
    });

    res.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email,
        userType: user.userType,
        role: user.role,
        landlordSubscriptionStatus: user.landlordSubscription?.status || 'not_submitted'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const submitLandlordSubscriptionProof = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.userType !== 'landlord') {
      return res.status(403).json({ error: 'Only landlords can submit subscription proof' });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'Subscription proof file is required' });
    }

    const planMonthsRaw = Number(req.body?.planMonths || 1);
    const planMonths = Number.isFinite(planMonthsRaw) ? Math.max(1, Math.min(12, Math.round(planMonthsRaw))) : 1;
    const ALLOWED_PLAN_TYPES = ['starter', 'professional', 'enterprise'];
    const planTypeRaw = typeof req.body?.planType === 'string' ? req.body.planType.trim().toLowerCase() : '';
    const planType = ALLOWED_PLAN_TYPES.includes(planTypeRaw) ? planTypeRaw : undefined;
    const paymentReference = typeof req.body?.paymentReference === 'string' ? req.body.paymentReference.trim().slice(0, 120) : '';

    const paymentProofUrl = `/uploads/${file.filename}`;
    user.landlordSubscription = {
      status: 'pending',
      planType,
      planMonths,
      paymentProofUrl,
      paymentReference,
      submittedAt: new Date(),
      reviewedAt: undefined,
      reviewedBy: undefined,
      reviewNote: '',
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined
    };

    await user.save();

    const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'A landlord';
    const planLabel = planType ? ` (${planType.charAt(0).toUpperCase() + planType.slice(1)} plan)` : '';
    await notifyAdmins({
      title: 'Landlord subscription proof submitted',
      message: `${senderName} submitted a subscription proof${planLabel} for review.`,
      type: 'system',
      link: '/admin'
    });

    res.status(201).json({
      message: 'Subscription proof submitted. Waiting for admin approval.',
      landlordSubscription: user.landlordSubscription
    });
  } catch {
    res.status(500).json({ error: 'Failed to submit subscription proof' });
  }
};

export const forgotPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      // Return success message to avoid account enumeration.
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendBase}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!host || !smtpUser || !smtpPass) {
      if ((process.env.NODE_ENV || 'development') !== 'production') {
        console.warn('[forgotPassword] SMTP is not configured. Returning development reset URL.');
        return res.json({
          message: 'Email service is not configured. Use the development reset link below.',
          resetUrl
        });
      }
      return res.status(503).json({ error: 'Email service is not configured on server.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });

    const fromAddress = process.env.MAIL_FROM || smtpUser;

    await transporter.sendMail({
      from: fromAddress,
      to: user.email,
      subject: 'Reset your RentalHub password',
      text: [
        `Hi ${user.firstName || 'there'},`,
        '',
        'We received a request to reset your password.',
        `Use this link to set a new password (valid for 30 minutes): ${resetUrl}`,
        '',
        'If you did not request this, you can safely ignore this email.'
      ].join('\n')
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or expired' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscription = user.landlordSubscription;
    if (
      user.userType === 'landlord' &&
      subscription?.status === 'approved' &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd.getTime() < Date.now()
    ) {
      user.landlordSubscription = {
        ...subscription,
        status: 'expired'
      };
      await user.save();
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const allowedFields = [
      'firstName',
      'lastName',
      'username',
      'email',
      'phone',
      'bio',
      'location',
      'country',
      'profileImage',
      'preferredLanguage',
      'preferredLocale',
      'preferredCurrency',
      'marketingConsent'
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key))
    );

    if (updates.username) {
      const usernameOwner = await User.findOne({ username: updates.username, _id: { $ne: req.userId } });
      if (usernameOwner) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    if (updates.email) {
      const emailOwner = await User.findOne({ email: updates.email, _id: { $ne: req.userId } });
      if (emailOwner) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const uploadMyProfileImage = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageUrl = `/uploads/${file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: imageUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(201).json({ message: 'Profile image uploaded', profileImage: imageUrl, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const propertyExists = await Property.exists({ _id: propertyId });
    if (!propertyExists) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const alreadyFavorited = user.favorites.some((id) => id.toString() === propertyId);
    if (alreadyFavorited) {
      user.favorites = user.favorites.filter((id) => id.toString() !== propertyId);
    } else {
      user.favorites.push(propertyId as any);
    }

    await user.save();
    res.json({
      message: alreadyFavorited ? 'Removed from favorites' : 'Added to favorites',
      isFavorited: !alreadyFavorited
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update favorites' });
  }
};

export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: 'favorites',
      populate: { path: 'landlordId', select: 'firstName lastName phone' }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favorites = (user.favorites as any[]).map((property) => {
      const item = property?.toObject ? property.toObject() : property;
      return {
        ...item,
        touringFee: typeof item?.touringFee === 'number' ? item.touringFee : safeTouringFee
      };
    });

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const regex = new RegExp(q, 'i');

    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [{ username: regex }, { firstName: regex }, { lastName: regex }, { location: regex }]
    })
      .select('_id username firstName lastName email location userType profileImage')
      .limit(25);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('_id username firstName lastName email location userType profileImage');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

export const sendFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const sender = await User.findById(req.userId).select('firstName lastName email');
    if (!sender) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { subject, message } = req.body as { subject?: string; message?: string };
    const feedbackMessage = message?.trim();

    if (!feedbackMessage) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'RentalHub user';
    const normalizedSubject = (subject?.trim() || 'RentalHub feedback').slice(0, 160);

    await Feedback.create({
      userId: sender._id,
      senderName,
      senderEmail: sender.email,
      subject: normalizedSubject,
      message: feedbackMessage,
      status: 'open'
    });

    await notifyAdmins({
      title: 'New user feedback submitted',
      message: `${senderName} submitted feedback: ${normalizedSubject.slice(0, 80)}`,
      type: 'system',
      link: '/admin'
    });

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!host || !smtpUser || !smtpPass) {
      if ((process.env.NODE_ENV || 'development') !== 'production') {
        const feedbackRecipient = process.env.FEEDBACK_EMAIL || 'support@rentalhub.app';
        const fallbackMailto = `mailto:${encodeURIComponent(feedbackRecipient)}?subject=${encodeURIComponent(normalizedSubject)}&body=${encodeURIComponent(feedbackMessage)}`;
        return res.json({
          message: 'Feedback prepared. Email service is not configured on server; use your email app link below.',
          fallbackMailto
        });
      }
      return res.status(503).json({ error: 'Email service is not configured on server.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });

    const fromAddress = process.env.MAIL_FROM || smtpUser;
    const feedbackRecipient = process.env.FEEDBACK_EMAIL || smtpUser;

    await transporter.sendMail({
      from: fromAddress,
      to: feedbackRecipient,
      replyTo: sender.email,
      subject: normalizedSubject,
      text: [
        `Feedback from: ${senderName}`,
        `User email: ${sender.email}`,
        '',
        feedbackMessage
      ].join('\n')
    });

    res.json({ message: 'Feedback email sent successfully. Thank you!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send feedback email' });
  }
};

export const exportMyData = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [
      user,
      properties,
      roommateProfile,
      messages,
      reports,
      blocks,
      notifications,
      tourRequests
    ] = await Promise.all([
      User.findById(req.userId).select('-password -resetPasswordToken -resetPasswordExpires').lean(),
      Property.find({ landlordId: req.userId }).lean(),
      Roommate.findOne({ userId: req.userId }).lean(),
      Message.find({ $or: [{ senderId: req.userId }, { receiverId: req.userId }] }).lean(),
      Report.find({ reporterId: req.userId }).lean(),
      Block.find({ $or: [{ blockerId: req.userId }, { blockedId: req.userId }] }).lean(),
      Notification.find({ userId: req.userId }).lean(),
      TourRequest.find({ $or: [{ renterId: req.userId }, { landlordId: req.userId }] }).lean()
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      exportedAt: new Date().toISOString(),
      data: {
        user,
        properties,
        roommateProfile,
        messages,
        reports,
        blocks,
        notifications,
        tourRequests
      }
    });
  } catch {
    res.status(500).json({ error: 'Failed to export account data' });
  }
};

export const deleteMyAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { password, confirmText } = req.body as { password?: string; confirmText?: string };
    if (!password || confirmText !== 'DELETE') {
      return res.status(400).json({ error: 'Password and DELETE confirmation are required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await Promise.all([
      Property.deleteMany({ landlordId: req.userId }),
      Roommate.deleteMany({ userId: req.userId }),
      Message.deleteMany({ $or: [{ senderId: req.userId }, { receiverId: req.userId }] }),
      Report.deleteMany({ reporterId: req.userId }),
      Block.deleteMany({ $or: [{ blockerId: req.userId }, { blockedId: req.userId }] }),
      Notification.deleteMany({ userId: req.userId }),
      TourRequest.deleteMany({ $or: [{ renterId: req.userId }, { landlordId: req.userId }] }),
      User.findByIdAndDelete(req.userId)
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
