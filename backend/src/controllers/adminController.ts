import { Response } from 'express';
import TourRequest from '../models/TourRequest';
import User from '../models/User';
import Report from '../models/Report';
import Feedback from '../models/Feedback';
import Property from '../models/Property';
import Roommate from '../models/Roommate';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

const TOUR_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'] as const;
const LISTING_STATUSES = ['pending', 'approved', 'rejected'] as const;
const ROOMMATE_STATUSES = ['pending', 'approved', 'rejected'] as const;
const LANDLORD_SUBSCRIPTION_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;

const getLandlordPlanType = (planType?: string, planMonths?: number) => {
  if (planType) {
    return planType;
  }

  if (planMonths === 1) {
    return 'starter';
  }

  if (planMonths === 3) {
    return 'professional';
  }

  if (planMonths === 12) {
    return 'enterprise';
  }

  return undefined;
};

const getEntityId = (value: unknown): string => {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const [openReports, openFeedbacks, pendingTours, pendingListings, pendingRoommates, pendingSubscriptions, totalUsers, bannedUsers] = await Promise.all([
      Report.countDocuments({ status: 'open' }),
      Feedback.countDocuments({ status: 'open' }),
      TourRequest.countDocuments({ status: 'pending' }),
      Property.countDocuments({ approvalStatus: 'pending' }),
      Roommate.countDocuments({ approvalStatus: 'pending' }),
      User.countDocuments({ userType: 'landlord', 'landlordSubscription.status': 'pending' }),
      User.countDocuments(),
      User.countDocuments({ banned: true })
    ]);

    res.json({ openReports, openFeedbacks, pendingTours, pendingListings, pendingRoommates, pendingSubscriptions, totalUsers, bannedUsers });
  } catch {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
};

export const getLandlordSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'pending', page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { userType: 'landlord' };
    if (status) {
      filter['landlordSubscription.status'] = status;
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('firstName lastName username email landlordSubscription createdAt')
        .sort({ 'landlordSubscription.submittedAt': -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      User.countDocuments(filter)
    ]);

    const normalizedUsers = users.map((user) => {
      const userObject = user.toObject();
      const subscription = userObject.landlordSubscription;

      if (!subscription) {
        return userObject;
      }

      return {
        ...userObject,
        landlordSubscription: {
          ...subscription,
          planType: getLandlordPlanType(subscription.planType, subscription.planMonths)
        }
      };
    });

    res.json({ users: normalizedUsers, total, page: pageNumber, pages: Math.ceil(total / limitNumber) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch landlord subscriptions' });
  }
};

export const reviewLandlordSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { status, reviewNote } = req.body as { status?: string; reviewNote?: string };
    if (!status || !LANDLORD_SUBSCRIPTION_STATUSES.includes(status as (typeof LANDLORD_SUBSCRIPTION_STATUSES)[number])) {
      return res.status(400).json({ error: 'A valid status is required' });
    }

    const landlord = await User.findById(req.params.id);
    if (!landlord || landlord.userType !== 'landlord') {
      return res.status(404).json({ error: 'Landlord account not found' });
    }

    const existing = landlord.landlordSubscription || { status: 'not_submitted', planMonths: 1 };
    if (!existing.paymentProofUrl && (status === 'approved' || status === 'rejected')) {
      return res.status(400).json({ error: 'No proof submitted by landlord yet' });
    }

    const now = new Date();
    let currentPeriodStart = existing.currentPeriodStart;
    let currentPeriodEnd = existing.currentPeriodEnd;

    if (status === 'approved') {
      const planMonths = Math.max(1, Number(existing.planMonths || 1));
      currentPeriodStart = now;
      currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + planMonths);
    }

    if (status === 'rejected' || status === 'expired' || status === 'pending') {
      currentPeriodStart = undefined;
      currentPeriodEnd = undefined;
    }

    landlord.landlordSubscription = {
      ...existing,
      planType: getLandlordPlanType(existing.planType, existing.planMonths),
      status: status as typeof existing.status,
      reviewNote: reviewNote?.trim() || '',
      reviewedAt: now,
      reviewedBy: req.userId as unknown as import('mongoose').Types.ObjectId,
      currentPeriodStart,
      currentPeriodEnd
    };

    await landlord.save();

    await createNotification({
      userId: String(landlord._id),
      title: `Subscription ${status}`,
      message: `Your landlord subscription has been ${status}.${reviewNote?.trim() ? ` Note: ${reviewNote.trim()}` : ''}`,
      type: 'system',
      link: '/dashboard'
    });

    res.json({ message: 'Landlord subscription updated', landlordSubscription: landlord.landlordSubscription });
  } catch {
    res.status(500).json({ error: 'Failed to review landlord subscription' });
  }
};

export const getAllRoommateProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.approvalStatus = status;
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const [profiles, total] = await Promise.all([
      Roommate.find(filter)
        .populate('userId', 'firstName lastName username email location profileImage')
        .populate('reviewedBy', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Roommate.countDocuments(filter)
    ]);

    res.json({ profiles, total, page: pageNumber, pages: Math.ceil(total / limitNumber) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch roommate profiles' });
  }
};

export const updateRoommateApprovalStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { approvalStatus, reviewNote } = req.body as { approvalStatus?: string; reviewNote?: string };
    if (!approvalStatus || !ROOMMATE_STATUSES.includes(approvalStatus as (typeof ROOMMATE_STATUSES)[number])) {
      return res.status(400).json({ error: 'A valid approvalStatus is required' });
    }

    const profile = await Roommate.findById(req.params.id).populate('userId', '_id firstName lastName');
    if (!profile) {
      return res.status(404).json({ error: 'Roommate profile not found' });
    }

    profile.approvalStatus = approvalStatus as typeof profile.approvalStatus;
    profile.reviewNote = reviewNote?.trim() || '';
    profile.reviewedAt = new Date();
    profile.reviewedBy = req.userId as unknown as import('mongoose').Types.ObjectId;
    await profile.save();

    const owner = profile.userId as unknown as { _id?: string };
    if (owner?._id) {
      await createNotification({
        userId: String(owner._id),
        title: `Roommate profile ${approvalStatus}`,
        message: `Your roommate profile has been ${approvalStatus}.${profile.reviewNote ? ` Note: ${profile.reviewNote}` : ''}`,
        type: 'system',
        link: '/roommates/profile'
      });
    }

    res.json({ message: 'Roommate profile review updated', profile });
  } catch {
    res.status(500).json({ error: 'Failed to update roommate profile review status' });
  }
};

export const getAllListings = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.approvalStatus = status;
    }

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * limitNumber;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate('landlordId', 'firstName lastName username email')
        .populate('reviewedBy', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Property.countDocuments(filter)
    ]);

    res.json({ properties, total, page: pageNumber, pages: Math.ceil(total / limitNumber) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
};

export const updateListingApprovalStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { approvalStatus, reviewNote } = req.body as { approvalStatus?: string; reviewNote?: string };
    if (!approvalStatus || !LISTING_STATUSES.includes(approvalStatus as (typeof LISTING_STATUSES)[number])) {
      return res.status(400).json({ error: 'A valid approvalStatus is required' });
    }

    const property = await Property.findById(req.params.id).populate('landlordId', '_id firstName email');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    property.approvalStatus = approvalStatus as typeof property.approvalStatus;
    property.reviewNote = reviewNote?.trim() || '';
    property.reviewedAt = new Date();
    property.reviewedBy = req.userId as unknown as import('mongoose').Types.ObjectId;
    await property.save();

    const landlord = property.landlordId as unknown as { _id?: string; firstName?: string; email?: string };
    if (landlord?._id) {
      await createNotification({
        userId: String(landlord._id),
        title: `Listing ${approvalStatus}`,
        message: `Your listing "${property.title}" was ${approvalStatus}.${property.reviewNote ? ` Note: ${property.reviewNote}` : ''}`,
        type: 'system',
        link: '/dashboard'
      });
    }

    res.json({ message: 'Listing review updated', property });
  } catch {
    res.status(500).json({ error: 'Failed to update listing review status' });
  }
};

export const getAllTourRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      TourRequest.find(filter)
        .populate([
          { path: 'propertyId', select: 'title city state rent' },
          { path: 'renterId', select: 'firstName lastName username email' },
          { path: 'landlordId', select: 'firstName lastName username email' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TourRequest.countDocuments(filter)
    ]);

    res.json({ requests, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch tour requests' });
  }
};

export const adminUpdateTourRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { status, reviewerNote } = req.body as { status?: string; reviewerNote?: string };
    if (!status || !TOUR_STATUSES.includes(status as (typeof TOUR_STATUSES)[number])) {
      return res.status(400).json({ error: 'A valid status is required' });
    }

    const tourRequest = await TourRequest.findById(req.params.id).populate([
      { path: 'propertyId', select: 'title' },
      { path: 'renterId', select: '_id firstName lastName' }
    ]);

    if (!tourRequest) {
      return res.status(404).json({ error: 'Tour request not found' });
    }

    tourRequest.status = status as typeof tourRequest.status;
    tourRequest.reviewerNote = reviewerNote?.trim() || '';
    tourRequest.reviewedAt = new Date();
    await tourRequest.save();

    const property = tourRequest.propertyId as unknown as { title?: string };
    await createNotification({
      userId: getEntityId(tourRequest.renterId),
      title: `Tour request ${status}`,
      message: `Your tour request for "${property?.title || 'the property'}" has been ${status} by admin.${reviewerNote ? ` Note: ${reviewerNote}` : ''}`,
      type: 'tour_request_status',
      link: '/tour-requests'
    });

    res.json({ message: 'Tour request updated', tourRequest });
  } catch {
    res.status(500).json({ error: 'Failed to update tour request' });
  }
};

export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporterId', 'firstName lastName username email')
        .populate('resolvedBy', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(filter)
    ]);

    res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const updateReport = async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNote } = req.body as { status?: string; adminNote?: string };
    if (!status || !['open', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'A valid status is required' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = status as typeof report.status;
    report.adminNote = adminNote?.trim() || '';
    report.resolvedBy = req.userId as unknown as import('mongoose').Types.ObjectId;
    report.resolvedAt = new Date();
    await report.save();

    res.json({ message: 'Report updated', report });
  } catch {
    res.status(500).json({ error: 'Failed to update report' });
  }
};

export const getAllFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .populate('userId', 'firstName lastName username email')
        .populate('resolvedBy', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Feedback.countDocuments(filter)
    ]);

    res.json({ feedbacks, total, page: parseInt(page, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

export const updateFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNote } = req.body as { status?: string; adminNote?: string };
    if (!status || !['open', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'A valid status is required' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    feedback.status = status as typeof feedback.status;
    feedback.adminNote = adminNote?.trim() || '';
    feedback.resolvedBy = req.userId as unknown as import('mongoose').Types.ObjectId;
    feedback.resolvedAt = new Date();
    await feedback.save();

    res.json({ message: 'Feedback updated', feedback });
  } catch {
    res.status(500).json({ error: 'Failed to update feedback' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (search?.trim()) {
      filter.$or = [
        { firstName: { $regex: search.trim(), $options: 'i' } },
        { lastName: { $regex: search.trim(), $options: 'i' } },
        { username: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const setUserBan = async (req: AuthRequest, res: Response) => {
  try {
    const { banned } = req.body as { banned?: boolean };
    if (typeof banned !== 'boolean') {
      return res.status(400).json({ error: 'banned (boolean) is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot ban an admin account' });
    }

    user.banned = banned;
    await user.save();

    res.json({
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
      user: { _id: user._id, banned: user.banned }
    });
  } catch {
    res.status(500).json({ error: 'Failed to update ban status' });
  }
};

export const promoteToAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = 'admin';
    await user.save();

    res.json({ message: 'User promoted to admin', user: { _id: user._id, role: user.role } });
  } catch {
    res.status(500).json({ error: 'Failed to promote user' });
  }
};
