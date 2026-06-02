import express from 'express';
import * as tourRequestController from '../controllers/tourRequestController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/mine', authMiddleware, tourRequestController.getMyTourRequests);
router.get('/incoming', authMiddleware, tourRequestController.getIncomingTourRequests);
router.put('/:id/status', authMiddleware, tourRequestController.updateTourRequestStatus);

export default router;