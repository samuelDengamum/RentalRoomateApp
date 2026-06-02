import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import {
  getAdminStats,
  getLandlordSubscriptions,
  reviewLandlordSubscription,
  getAllListings,
  updateListingApprovalStatus,
  getAllRoommateProfiles,
  updateRoommateApprovalStatus,
  getAllTourRequests,
  adminUpdateTourRequest,
  getAllReports,
  getAllFeedback,
  updateReport,
  updateFeedback,
  getAllUsers,
  setUserBan,
  promoteToAdmin
} from '../controllers/adminController';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', getAdminStats);
router.get('/subscriptions', getLandlordSubscriptions);
router.put('/subscriptions/:id/review', reviewLandlordSubscription);
router.get('/listings', getAllListings);
router.put('/listings/:id/approval', updateListingApprovalStatus);
router.get('/roommates', getAllRoommateProfiles);
router.put('/roommates/:id/approval', updateRoommateApprovalStatus);
router.get('/tour-requests', getAllTourRequests);
router.put('/tour-requests/:id/status', adminUpdateTourRequest);
router.get('/reports', getAllReports);
router.put('/reports/:id', updateReport);
router.get('/feedback', getAllFeedback);
router.put('/feedback/:id', updateFeedback);
router.get('/users', getAllUsers);
router.put('/users/:id/ban', setUserBan);
router.put('/users/:id/promote', promoteToAdmin);

export default router;
