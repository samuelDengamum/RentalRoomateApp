import express from 'express';
import * as roommateController from '../controllers/roommateController';
import { authMiddleware } from '../middleware/auth';
import { uploadRoommateImages } from '../middleware/upload';

const router = express.Router();

router.get('/', roommateController.getRoommateProfiles);
router.get('/me', authMiddleware, roommateController.getMyRoommateProfile);
router.get('/:id', roommateController.getRoommateProfileById);
router.post('/upload-images', authMiddleware, uploadRoommateImages.array('images', 6), roommateController.uploadImages);
router.post('/me', authMiddleware, roommateController.createOrUpdateRoommateProfile);
router.delete('/me', authMiddleware, roommateController.deleteMyRoommateProfile);

export default router;
