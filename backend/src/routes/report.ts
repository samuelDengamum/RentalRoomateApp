import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createReport,
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkBlockStatus
} from '../controllers/reportController';

const router = Router();

router.use(authMiddleware);

router.post('/', createReport);
router.get('/blocked', getBlockedUsers);
router.get('/block/:userId', checkBlockStatus);
router.post('/block/:userId', blockUser);
router.delete('/block/:userId', unblockUser);

export default router;
