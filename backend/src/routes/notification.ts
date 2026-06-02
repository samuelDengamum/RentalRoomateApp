import express from 'express';
import * as notificationController from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/', authMiddleware, notificationController.getNotifications);
router.get('/unread-count', authMiddleware, notificationController.getUnreadNotificationCount);
router.put('/read-all', authMiddleware, notificationController.markAllNotificationsRead);
router.put('/:id/read', authMiddleware, notificationController.markNotificationRead);

export default router;