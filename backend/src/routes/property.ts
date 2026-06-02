import express from 'express';
import * as propertyController from '../controllers/propertyController';
import { authMiddleware } from '../middleware/auth';
import { uploadPaymentProof, uploadPropertyImages } from '../middleware/upload';

const router = express.Router();

router.post('/', authMiddleware, propertyController.createProperty);
router.post('/upload-images', authMiddleware, uploadPropertyImages.array('images', 8), propertyController.uploadImages);
router.post('/:id/contact', authMiddleware, uploadPaymentProof.single('paymentProof'), propertyController.contactLandlord);
router.get('/', propertyController.getProperties);
router.get('/user/my-properties', authMiddleware, propertyController.getMyProperties);
router.get('/:id', propertyController.getPropertyById);
router.put('/:id', authMiddleware, propertyController.updateProperty);
router.delete('/:id', authMiddleware, propertyController.deleteProperty);

export default router;
