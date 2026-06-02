import express from 'express';
import * as messageController from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/', authMiddleware, messageController.sendMessage);
router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/:otherUserId', authMiddleware, messageController.getConversation);
router.put('/:messageId/read', authMiddleware, messageController.markAsRead);

export default router;
