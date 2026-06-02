import express from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { uploadPaymentProof, uploadProfileImage } from '../middleware/upload';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/feedback', authMiddleware, authController.sendFeedback);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post(
	'/subscription/submit',
	authMiddleware,
	uploadPaymentProof.single('proof'),
	authController.submitLandlordSubscriptionProof
);
router.get('/profile/export', authMiddleware, authController.exportMyData);
router.delete('/profile', authMiddleware, authController.deleteMyAccount);
router.post('/profile/upload-image', authMiddleware, uploadProfileImage.single('image'), authController.uploadMyProfileImage);
router.get('/users/search', authMiddleware, authController.searchUsers);
router.get('/users/:userId', authMiddleware, authController.getUserById);
router.get('/favorites', authMiddleware, authController.getFavorites);
router.post('/favorites/:propertyId', authMiddleware, authController.toggleFavorite);

export default router;
