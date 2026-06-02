import { Response } from 'express';
import Message from '../models/Message';
import User from '../models/User';
import Block from '../models/Block';
import { AuthRequest } from '../middleware/auth';
import { getSocketServer } from '../socket';
import { isUserOnline } from '../socket';
import { areUsersBlocked } from '../services/blockService';

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { receiverId, content } = req.body;

    if (!receiverId || receiverId.toString() === req.userId) {
      return res.status(400).json({ error: 'You cannot message yourself' });
    }

    const blocked = await areUsersBlocked(req.userId, receiverId.toString());
    if (blocked) {
      return res.status(403).json({ error: 'Messaging is unavailable because one user has blocked the other' });
    }

    const delivered = isUserOnline(receiverId);
    
    const message = new Message({
      senderId: req.userId,
      receiverId,
      content,
      delivered
    });
    
    await message.save();

    const io = getSocketServer();
    if (io) {
      const payload = {
        _id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        delivered: message.delivered,
        read: message.read,
        createdAt: message.createdAt
      };
      io.to(`user:${receiverId}`).emit('message:new', payload);
      io.to(`user:${req.userId}`).emit('message:new', payload);
      io.to(`user:${req.userId}`).emit('message:status', {
        messageId: message._id,
        delivered: message.delivered,
        read: message.read
      });
    }

    res.status(201).json({ message: 'Message sent', data: message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { otherUserId } = req.params;

    if (!otherUserId || otherUserId.toString() === req.userId) {
      return res.status(400).json({ error: 'Invalid conversation target' });
    }

    const blocked = await areUsersBlocked(req.userId, otherUserId.toString());
    if (blocked) {
      return res.status(403).json({ error: 'Conversation unavailable because one user has blocked the other' });
    }
    
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.userId }
      ]
    }).sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await Message.find({
      $or: [{ senderId: req.userId }, { receiverId: req.userId }]
    }).sort({ createdAt: -1 });
    
    // Group by conversation partner
    const conversations = new Map();
    messages.forEach(msg => {
      const otherId = msg.senderId.toString() === req.userId ? msg.receiverId : msg.senderId;
      if (otherId.toString() === req.userId) {
        return;
      }
      if (!conversations.has(otherId.toString())) {
        conversations.set(otherId.toString(), []);
      }
      conversations.get(otherId.toString()).push(msg);
    });

    const participantIds = Array.from(conversations.keys());
    if (participantIds.length === 0) {
      return res.json([]);
    }

    const blockedByMeRows = await Block
      .find({ blockerId: req.userId, blockedId: { $in: participantIds } })
      .select('blockedId');
    const blockedMeRows = await Block
      .find({ blockerId: { $in: participantIds }, blockedId: req.userId })
      .select('blockerId');

    const excludedParticipants = new Set<string>([
      ...blockedByMeRows.map((row: any) => row.blockedId.toString()),
      ...blockedMeRows.map((row: any) => row.blockerId.toString())
    ]);

    const visibleParticipantIds = participantIds.filter((id) => !excludedParticipants.has(id));

    const participants = await User.find({ _id: { $in: visibleParticipantIds } }).select(
      '_id username firstName lastName email profileImage location userType'
    );

    const participantMap = new Map(participants.map((user) => [user._id.toString(), user]));

    const result = visibleParticipantIds.map((userId) => {
      const msgs = conversations.get(userId) || [];
      return {
        userId,
        participant: participantMap.get(userId) || null,
        lastMessage: msgs[0],
        unreadCount: msgs.filter((m: any) => !m.read && m.receiverId.toString() === req.userId).length
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    
    const updated = await Message.findByIdAndUpdate(messageId, { delivered: true, read: true }, { new: true });

    const io = getSocketServer();
    if (io && updated) {
      io.to(`user:${updated.senderId.toString()}`).emit('message:read', {
        messageId: updated._id,
        readerId: req.userId
      });
      io.to(`user:${updated.senderId.toString()}`).emit('message:status', {
        messageId: updated._id,
        delivered: true,
        read: true
      });
    }

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};
