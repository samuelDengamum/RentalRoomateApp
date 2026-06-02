import { Request, Response } from 'express';
import User from '../models/User';
import Property from '../models/Property';
import Roommate from '../models/Roommate';

export const getPublicPlatformStats = async (_req: Request, res: Response) => {
  try {
    const [clients, listings, roommates] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' }, banned: { $ne: true } }),
      Property.countDocuments({ $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] }),
      Roommate.countDocuments({ $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] })
    ]);

    res.json({
      satisfiedClients: clients,
      propertyListings: listings,
      roommateProfiles: roommates
    });
  } catch {
    res.status(500).json({ error: 'Failed to load platform statistics' });
  }
};
