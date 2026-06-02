import express from 'express';
import { getPublicPlatformStats } from '../controllers/statsController';

const router = express.Router();

router.get('/public', getPublicPlatformStats);

export default router;
