import { Response } from 'express';
import Roommate from '../models/Roommate';
import { AuthRequest } from '../middleware/auth';
import { Request } from 'express';
import User from '../models/User';
import { notifyAdmins } from '../services/notificationService';

export const createOrUpdateRoommateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const incomingImageDetails = Array.isArray(req.body.imageDetails)
      ? req.body.imageDetails
          .filter((item: any) => item && typeof item.url === 'string' && item.url.trim())
          .map((item: any) => ({
            url: item.url.trim(),
            category: (item.category || 'General').toString().trim() || 'General'
          }))
      : [];

    const incomingImages = Array.isArray(req.body.images)
      ? req.body.images.filter((url: any) => typeof url === 'string' && url.trim()).map((url: string) => url.trim())
      : [];

    const normalizedImageDetails = incomingImageDetails.length
      ? incomingImageDetails
      : incomingImages.map((url: string) => ({ url, category: 'General' }));

    const profile = await Roommate.findOneAndUpdate(
      { userId: req.userId },
      {
        ...req.body,
        userId: req.userId,
        imageDetails: normalizedImageDetails,
        images: normalizedImageDetails.map((item: any) => item.url),
        approvalStatus: 'pending',
        reviewNote: '',
        reviewedAt: undefined,
        reviewedBy: undefined
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('userId', 'firstName lastName username location profileImage userType');

    const owner = await User.findById(req.userId).select('firstName lastName username');
    const ownerLabel = owner
      ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.username || 'A user'
      : 'A user';

    await notifyAdmins({
      title: 'Roommate profile submitted',
      message: `${ownerLabel} submitted/updated a roommate profile and it is waiting for approval.`,
      type: 'system',
      link: '/admin'
    });

    res.status(201).json({ message: 'Roommate profile saved and sent for admin review', profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save roommate profile' });
  }
};

export const getMyRoommateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await Roommate.findOne({ userId: req.userId }).populate(
      'userId',
      'firstName lastName username location profileImage userType'
    );

    if (!profile) {
      return res.status(404).json({ error: 'Roommate profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roommate profile' });
  }
};

export const getRoommateProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const {
      location,
      exactAge,
      minAge,
      maxAge,
      occupation,
      gender,
      socialStatus,
      city,
      minBudget,
      maxBudget,
      moveInBefore,
      search,
      sort = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    const filter: any = {
      $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }]
    };
    if (location) {
      filter.city = new RegExp(location as string, 'i');
    }

    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$or = [
        { bio: regex },
        { occupation: regex },
        { socialStatus: regex },
        { city: regex },
        { description: regex }
      ];
    }

    if (exactAge) {
      filter.age = Number(exactAge);
    } else if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = Number(minAge);
      if (maxAge) filter.age.$lte = Number(maxAge);
    }

    if (occupation) {
      filter.occupation = new RegExp(occupation as string, 'i');
    }

    if (gender) {
      filter.gender = gender;
    }

    if (socialStatus) {
      filter.socialStatus = new RegExp(socialStatus as string, 'i');
    }

    if (city) {
      filter.city = new RegExp(city as string, 'i');
    }

    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = Number(minBudget);
      if (maxBudget) filter.budget.$lte = Number(maxBudget);
    }

    if (moveInBefore) {
      filter.moveInDate = { $lte: new Date(moveInBefore as string) };
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      budget_asc: { budget: 1 },
      budget_desc: { budget: -1 },
      age_asc: { age: 1 },
      age_desc: { age: -1 }
    };

    const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNumber - 1) * limitNumber;

    const [profiles, total] = await Promise.all([
      Roommate.find(filter)
        .sort(sortMap[sort as string] || sortMap.newest)
        .skip(skip)
        .limit(limitNumber)
        .populate('userId', 'firstName lastName username location profileImage userType'),
      Roommate.countDocuments(filter)
    ]);

    res.json({
      data: profiles,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roommate profiles' });
  }
};

export const getRoommateProfileById = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await Roommate.findById(req.params.id).populate(
      'userId',
      'firstName lastName username location profileImage userType'
    );

    if (!profile) {
      return res.status(404).json({ error: 'Roommate profile not found' });
    }

    if (profile.approvalStatus && profile.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Roommate profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roommate profile' });
  }
};

export const deleteMyRoommateProfile = async (req: AuthRequest, res: Response) => {
  try {
    await Roommate.findOneAndDelete({ userId: req.userId });
    res.json({ message: 'Roommate profile deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete roommate profile' });
  }
};

export const uploadImages = async (req: Request, res: Response) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    const imageUrls = files.map((file) => `/uploads/${file.filename}`);
    res.status(201).json({ images: imageUrls });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload roommate images' });
  }
};
