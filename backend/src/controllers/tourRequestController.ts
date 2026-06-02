import { Response } from 'express';
import TourRequest from '../models/TourRequest';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';

const TOUR_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'] as const;

const getEntityId = (value: unknown): string => {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
};

const basePopulate = [
  { path: 'propertyId', select: 'title city state rent touringFee images' },
  { path: 'renterId', select: 'firstName lastName username profileImage' },
  { path: 'landlordId', select: 'firstName lastName username profileImage' }
];

export const getMyTourRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await TourRequest.find({ renterId: req.userId })
      .populate(basePopulate)
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your tour requests' });
  }
};

export const getIncomingTourRequests = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('userType');
    if (!user || user.userType !== 'landlord') {
      return res.status(403).json({ error: 'Only landlords can view incoming tour requests' });
    }

    const requests = await TourRequest.find({ landlordId: req.userId })
      .populate(basePopulate)
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incoming tour requests' });
  }
};

export const updateTourRequestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('userType firstName lastName');
    if (!user || user.userType !== 'landlord') {
      return res.status(403).json({ error: 'Only landlords can update tour requests' });
    }

    const { status, reviewerNote } = req.body as { status?: string; reviewerNote?: string };
    if (!status || !TOUR_REQUEST_STATUSES.includes(status as (typeof TOUR_REQUEST_STATUSES)[number])) {
      return res.status(400).json({ error: 'A valid tour request status is required' });
    }

    const tourRequest = await TourRequest.findOne({ _id: req.params.id, landlordId: req.userId })
      .populate(basePopulate);

    if (!tourRequest) {
      return res.status(404).json({ error: 'Tour request not found' });
    }

    tourRequest.status = status as typeof tourRequest.status;
    tourRequest.reviewerNote = reviewerNote?.trim() || '';
    tourRequest.reviewedAt = new Date();
    await tourRequest.save();

    const property = tourRequest.propertyId as unknown as { _id?: string; title?: string };
    const landlordName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'The landlord';

    await createNotification({
      userId: getEntityId(tourRequest.renterId),
      title: 'Tour request updated',
      message: `${landlordName} marked your request for ${property?.title || 'this property'} as ${status}.`,
      type: 'tour_request_status',
      link: '/tour-requests'
    });

    const refreshed = await TourRequest.findById(tourRequest._id)
      .populate(basePopulate);

    res.json({ message: 'Tour request updated', tourRequest: refreshed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tour request' });
  }
};