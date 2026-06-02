import { Response } from 'express';
import Report from '../models/Report';
import Block from '../models/Block';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { getBlockRelationship } from '../services/blockService';

const REPORT_REASONS = ['spam', 'inappropriate', 'fraud', 'harassment', 'misleading', 'other'] as const;

export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const { targetType, targetId, reason, details } = req.body as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      details?: string;
    };

    if (!targetType || !['user', 'property'].includes(targetType)) {
      return res.status(400).json({ error: 'Valid targetType (user or property) is required' });
    }

    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }

    if (!reason || !REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) {
      return res.status(400).json({ error: 'A valid reason is required' });
    }

    if (targetType === 'user' && targetId === req.userId) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }

    const report = await Report.create({
      reporterId: req.userId,
      targetType,
      targetId,
      reason,
      details: (details || '').trim().slice(0, 1000)
    });

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: blockedId } = req.params;

    if (blockedId === req.userId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    const target = await User.findById(blockedId).select('_id');
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Block.findOneAndUpdate(
      { blockerId: req.userId, blockedId },
      { blockerId: req.userId, blockedId },
      { upsert: true, new: true }
    );

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: blockedId } = req.params;
    await Block.findOneAndDelete({ blockerId: req.userId, blockedId });
    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

export const getBlockedUsers = async (req: AuthRequest, res: Response) => {
  try {
    const blocks = await Block.find({ blockerId: req.userId })
      .populate('blockedId', 'firstName lastName username profileImage')
      .sort({ createdAt: -1 });

    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
};

export const checkBlockStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId: targetId } = req.params;
    const relationship = await getBlockRelationship(req.userId, targetId);
    res.json({
      blocked: relationship.blockedByMe,
      blockedByMe: relationship.blockedByMe,
      blockedMe: relationship.blockedMe,
      eitherBlocked: relationship.eitherBlocked
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check block status' });
  }
};
