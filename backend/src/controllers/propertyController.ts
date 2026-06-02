import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Property from '../models/Property';
import TourRequest from '../models/TourRequest';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { createNotification, notifyAdmins } from '../services/notificationService';
import { areUsersBlocked } from '../services/blockService';

const FIXED_TOURING_FEE_RWF = Number(process.env.FIXED_TOURING_FEE_RWF || 5000);
const safeTouringFee = Number.isFinite(FIXED_TOURING_FEE_RWF) ? FIXED_TOURING_FEE_RWF : 5000;
const SUPPORTED_PAYMENT_METHODS = ['mobile_money', 'bank_transfer', 'card', 'cash_deposit'] as const;

const parseDateOnly = (dateValue: string) => {
  const [year, month, day] = dateValue.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const parseDateTime = (dateValue: string, timeValue: string) => {
  const datePart = parseDateOnly(dateValue);
  const [hours, minutes] = timeValue.split(':').map((part) => Number(part));
  if (!datePart || Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    hours,
    minutes,
    0,
    0
  );
};

const formatDateMessageValue = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${month}/${day}/${year}`;
};

const isPropertyPubliclyVisible = (property: any) => {
  const status = property?.approvalStatus;
  return !status || status === 'approved';
};

const getRequestUser = async (req: Request) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    return await User.findById(decoded.userId).select('role userType');
  } catch {
    return null;
  }
};

const normalizePropertyForResponse = (property: any) => {
  const item = property?.toObject ? property.toObject() : property;
  return {
    ...item,
    touringFee: typeof item?.touringFee === 'number' ? item.touringFee : safeTouringFee
  };
};

const landlordSubscriptionError =
  'Active subscription required. Upload your monthly subscription proof and wait for admin approval before posting listings.';

const hasActiveLandlordSubscription = async (userId: string) => {
  const user = await User.findById(userId).select('userType landlordSubscription');
  if (!user || user.userType !== 'landlord') {
    return { allowed: false, code: 403, error: 'Only landlords can create property listings' };
  }

  const subscription = user.landlordSubscription;
  if (!subscription) {
    return { allowed: false, code: 402, error: landlordSubscriptionError };
  }

  if (subscription.status !== 'approved') {
    return { allowed: false, code: 402, error: landlordSubscriptionError };
  }

  if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() < Date.now()) {
    user.landlordSubscription = {
      ...subscription,
      status: 'expired'
    };
    await user.save();
    return { allowed: false, code: 402, error: 'Subscription expired. Submit a new payment proof for renewal.' };
  }

  return { allowed: true, code: 200, error: '' };
};

export const createProperty = async (req: AuthRequest, res: Response) => {
  try {
    const subscriptionGate = await hasActiveLandlordSubscription(req.userId as string);
    if (!subscriptionGate.allowed) {
      return res.status(subscriptionGate.code).json({ error: subscriptionGate.error });
    }

    if (!Array.isArray(req.body.images)) {
      req.body.images = [];
    }

    const propertyData = {
      ...req.body,
      touringFee: safeTouringFee,
      landlordId: req.userId,
      approvalStatus: 'pending',
      reviewNote: '',
      reviewedAt: undefined,
      reviewedBy: undefined
    };
    const property = new Property(propertyData);
    await property.save();

    await notifyAdmins({
      title: 'New property listing submitted',
      message: `${req.body?.title || 'A property'} was submitted by a landlord and is waiting for approval.`,
      type: 'system',
      link: '/admin'
    });

    res.status(201).json({
      message: 'Property created and sent for admin review',
      property: normalizePropertyForResponse(property)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create property' });
  }
};

export const getProperties = async (req: AuthRequest, res: Response) => {
  try {
    const {
      city,
      minRent,
      maxRent,
      bedrooms,
      propertyType,
      available,
      search,
      sort = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    const filter: any = {
      available: true,
      $and: [{ $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] }]
    };
    if (available === 'false') {
      filter.available = false;
    }
    if (city) filter.city = city;
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$and.push({
        $or: [{ title: regex }, { description: regex }, { city: regex }, { state: regex }]
      });
    }
    if (minRent || maxRent) {
      filter.rent = {};
      if (minRent) filter.rent.$gte = parseInt(minRent as string);
      if (maxRent) filter.rent.$lte = parseInt(maxRent as string);
    }
    if (bedrooms) filter.bedrooms = { $gte: parseInt(bedrooms as string) };
    if (propertyType) filter.propertyType = propertyType;

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      rent_asc: { rent: 1 },
      rent_desc: { rent: -1 }
    };

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNumber - 1) * limitNumber;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .sort(sortMap[sort as string] || sortMap.newest)
        .skip(skip)
        .limit(limitNumber)
        .populate('landlordId', 'firstName lastName phone'),
      Property.countDocuments(filter)
    ]);

    res.json({
      data: properties.map((property) => normalizePropertyForResponse(property)),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

export const getPropertyById = async (req: AuthRequest, res: Response) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('landlordId', 'firstName lastName email phone');
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!isPropertyPubliclyVisible(property)) {
      const requestUser = await getRequestUser(req);
      const landlordId = typeof property.landlordId === 'object' && property.landlordId && '_id' in property.landlordId
        ? String((property.landlordId as { _id: unknown })._id)
        : String(property.landlordId);

      if (!requestUser || (String(requestUser._id) !== landlordId && requestUser.role !== 'admin')) {
        return res.status(404).json({ error: 'Property not found' });
      }
    }
    
    res.json(normalizePropertyForResponse(property));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch property' });
  }
};

export const updateProperty = async (req: AuthRequest, res: Response) => {
  try {
    const subscriptionGate = await hasActiveLandlordSubscription(req.userId as string);
    if (!subscriptionGate.allowed) {
      return res.status(subscriptionGate.code).json({ error: subscriptionGate.error });
    }

    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.landlordId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updateData = {
      ...req.body,
      touringFee: safeTouringFee,
      approvalStatus: 'pending',
      reviewNote: '',
      reviewedAt: undefined,
      reviewedBy: undefined
    };
    const updated = await Property.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({
      message: 'Property updated and sent for admin review',
      property: normalizePropertyForResponse(updated)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update property' });
  }
};

export const deleteProperty = async (req: AuthRequest, res: Response) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.landlordId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete property' });
  }
};

export const getMyProperties = async (req: AuthRequest, res: Response) => {
  try {
    const properties = await Property.find({ landlordId: req.userId });
    res.json(properties.map((property) => normalizePropertyForResponse(property)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your properties' });
  }
};

export const uploadImages = async (req: Request, res: Response) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    const imageUrls = files.map((file) => `/uploads/${file.filename}`);
    res.status(201).json({ images: imageUrls });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload images' });
  }
};

export const contactLandlord = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const property = await Property.findById(req.params.id).populate('landlordId', 'email firstName lastName');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!isPropertyPubliclyVisible(property)) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const landlord = property.landlordId as any;
    if (!landlord?.email) {
      return res.status(400).json({ error: 'Landlord email is not available' });
    }

    const usersBlocked = await areUsersBlocked(req.userId, String(landlord._id));
    if (usersBlocked) {
      return res.status(403).json({ error: 'Tour requests are unavailable because one user has blocked the other' });
    }

    const sender = await User.findById(req.userId).select('firstName lastName email phone');
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const { requesterName, subject, message, phone, senderEmail, tourDate, tourTime, paymentMethod, paymentReference } = req.body as {
      requesterName?: string;
      subject?: string;
      message?: string;
      phone?: string;
      senderEmail?: string;
      tourDate?: string;
      tourTime?: string;
      paymentMethod?: string;
      paymentReference?: string;
    };
    const paymentProofFile = (req as Request & { file?: Express.Multer.File }).file;
    const normalizedSenderEmail = senderEmail?.trim() || sender.email?.trim() || '';
    const senderPhone = phone?.trim() || sender.phone || '';
    const normalizedPaymentMethod = paymentMethod?.trim().toLowerCase();
    const normalizedPaymentReference = paymentReference?.trim();

    if (!normalizedSenderEmail) {
      return res.status(400).json({ error: 'No valid email found for this account' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedSenderEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!senderPhone) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    if (!normalizedPaymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    if (!SUPPORTED_PAYMENT_METHODS.includes(normalizedPaymentMethod as (typeof SUPPORTED_PAYMENT_METHODS)[number])) {
      return res.status(400).json({ error: 'Unsupported payment method selected' });
    }

    if (!paymentProofFile) {
      return res.status(400).json({ error: 'Payment proof file is required' });
    }

    const normalizedTourDate = tourDate?.trim() || '';
    const normalizedTourTime = tourTime?.trim() || '';

    if (normalizedTourTime && !normalizedTourDate) {
      return res.status(400).json({ error: 'Please choose a tour date. Time cannot be set without a date.' });
    }

    if (normalizedTourDate) {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const requestedDate = parseDateOnly(normalizedTourDate);
      if (!requestedDate) {
        return res.status(400).json({ error: 'That tour date is invalid. Please choose a real calendar date.' });
      }

      if (requestedDate.getTime() < todayStart.getTime()) {
        return res.status(400).json({ error: `Tour date must be ${formatDateMessageValue(todayStart)} or later.` });
      }

      if (normalizedTourTime) {
        const requestedDateTime = parseDateTime(normalizedTourDate, normalizedTourTime);
        if (!requestedDateTime) {
          return res.status(400).json({ error: 'That tour time is invalid. Please choose a valid time.' });
        }

        if (requestedDateTime.getTime() < now.getTime()) {
          return res.status(400).json({ error: 'That time has already passed for the selected date. Please choose a later time.' });
        }
      }
    }

    const paymentProofUrl = `/uploads/${paymentProofFile.filename}`;

    const finalSubject = subject?.trim() || `Tour request: ${property.title}`;
    const fullName = requesterName?.trim() || `${sender.firstName} ${sender.lastName}`.trim();
    const finalMessage = message?.trim() || `Hi, I would like to schedule a tour for ${property.title}. Please share availability details.`;

    const tourRequest = await TourRequest.create({
      propertyId: property._id,
      renterId: req.userId,
      landlordId: landlord._id,
      requesterName: fullName || sender.firstName || 'RentalHub renter',
      senderEmail: normalizedSenderEmail,
      phone: senderPhone,
      subject: finalSubject,
      message: finalMessage,
      tourDate: normalizedTourDate,
      tourTime: normalizedTourTime,
      paymentMethod: normalizedPaymentMethod,
      paymentReference: normalizedPaymentReference || '',
      paymentProofUrl
    });

    await Promise.all([
      createNotification({
        userId: String(landlord._id),
        title: 'New tour request received',
        message: `${fullName || 'A renter'} requested a tour for ${property.title}.`,
        type: 'tour_request_created',
        link: '/tour-requests'
      }),
      createNotification({
        userId: String(req.userId),
        title: 'Tour request submitted',
        message: `Your request for ${property.title} is pending review.`,
        type: 'tour_request_created',
        link: '/tour-requests'
      })
    ]);

    await notifyAdmins({
      title: 'New tour request submitted',
      message: `${fullName || 'A renter'} submitted a tour request for ${property.title}.`,
      type: 'tour_request_created',
      link: '/admin'
    });

    res.json({
      message: 'Tour request submitted successfully',
      paymentProofUrl,
      tourRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit tour request' });
  }
};
