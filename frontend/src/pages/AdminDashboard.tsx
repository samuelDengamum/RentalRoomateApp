import React from 'react';
import { apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import '../styles/Operations.css';
import '../styles/Admin.css';

type TabKey = 'overview' | 'subscriptions' | 'listings' | 'roommates' | 'feedback' | 'reports' | 'tours' | 'users';

interface AdminStats {
  openReports: number;
  openFeedbacks: number;
  pendingTours: number;
  pendingListings: number;
  pendingRoommates: number;
  pendingSubscriptions: number;
  totalUsers: number;
  bannedUsers: number;
}

interface LandlordSubscription {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'expired';
  planType?: string;
  planMonths: number;
  paymentProofUrl?: string;
  paymentReference?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

interface SubscriptionItem {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  landlordSubscription?: LandlordSubscription;
}

interface PopulatedUser {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

interface PopulatedProperty {
  _id: string;
  title: string;
  city: string;
  state: string;
  rent: number;
}

interface ListingItem {
  _id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  rent: number;
  touringFee?: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  amenities: string[];
  images: string[];
  available: boolean;
  availableDate?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  landlordId?: PopulatedUser | null;
}

interface RoommateItem {
  _id: string;
  bio: string;
  age: number;
  occupation: string;
  socialStatus: string;
  city: string;
  budget: number;
  moveInDate: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  createdAt: string;
  userId?: PopulatedUser | null;
}

interface TourRequestItem {
  _id: string;
  status: string;
  tourDate?: string;
  tourTime?: string;
  paymentMethod?: string;
  paymentProofUrl?: string;
  requesterName?: string;
  subject?: string;
  reviewerNote?: string;
  createdAt: string;
  propertyId?: PopulatedProperty | null;
  renterId?: PopulatedUser | null;
  landlordId?: PopulatedUser | null;
}

interface ReportItem {
  _id: string;
  targetType: 'user' | 'property';
  targetId: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  adminNote: string;
  createdAt: string;
  reporterId?: PopulatedUser | null;
  resolvedBy?: PopulatedUser | null;
}

interface FeedbackItem {
  _id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved' | 'dismissed';
  adminNote: string;
  createdAt: string;
  userId?: PopulatedUser | null;
  resolvedBy?: PopulatedUser | null;
}

interface UserItem {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  userType: string;
  role: string;
  banned: boolean;
  createdAt: string;
  profileImage?: string;
}

interface PagedResponse<T> {
  total: number;
  pages: number;
  page: number;
  properties?: T[];
  profiles?: T[];
  requests?: T[];
  reports?: T[];
  feedbacks?: T[];
  users?: T[];
}

const getSubscriptionPlanLabel = (subscription?: LandlordSubscription) => {
  if (!subscription) {
    return 'Plan not specified';
  }

  const planType = subscription.planType?.trim().toLowerCase();
  if (planType) {
    return `${planType.charAt(0).toUpperCase()}${planType.slice(1)} plan`;
  }

  if (subscription.planMonths === 1) {
    return 'Starter plan';
  }

  if (subscription.planMonths === 3) {
    return 'Professional plan';
  }

  if (subscription.planMonths === 12) {
    return 'Enterprise plan';
  }

  return 'Plan not specified';
};

const STATUS_TONE: Record<string, string> = {
  not_submitted: 'tone-muted',
  pending: 'tone-warning',
  approved: 'tone-success',
  rejected: 'tone-danger',
  expired: 'tone-muted',
  completed: 'tone-info',
  cancelled: 'tone-muted',
  open: 'tone-warning',
  resolved: 'tone-success',
  dismissed: 'tone-muted'
};

const TAB_META: Record<TabKey, { label: string; accent: string }> = {
  overview: { label: 'Overview', accent: 'Performance pulse' },
  subscriptions: { label: 'Subscriptions', accent: 'Landlord billing proofs' },
  listings: { label: 'Listings', accent: 'Publishing queue' },
  roommates: { label: 'Roommates', accent: 'Profile approvals' },
  feedback: { label: 'Feedback', accent: 'User submissions' },
  reports: { label: 'Reports', accent: 'Safety incidents' },
  tours: { label: 'Tour Requests', accent: 'Visit operations' },
  users: { label: 'Users', accent: 'Access controls' }
};

const AdminDashboard: React.FC = () => {
  const { t, tp } = useI18n();
  const [tab, setTab] = React.useState<TabKey>('overview');

  // Overview
  const [stats, setStats] = React.useState<AdminStats | null>(null);

  // Listings
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionItem[]>([]);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = React.useState('pending');
  const [subscriptionPage, setSubscriptionPage] = React.useState(1);
  const [subscriptionPages, setSubscriptionPages] = React.useState(1);
  const [subscriptionLoading, setSubscriptionLoading] = React.useState(false);
  const [activeSubscription, setActiveSubscription] = React.useState<SubscriptionItem | null>(null);
  const [subscriptionNewStatus, setSubscriptionNewStatus] = React.useState<'pending' | 'approved' | 'rejected' | 'expired'>('approved');
  const [subscriptionNote, setSubscriptionNote] = React.useState('');
  const [subscriptionActionMsg, setSubscriptionActionMsg] = React.useState('');

  // Listings
  const [listings, setListings] = React.useState<ListingItem[]>([]);
  const [listingStatusFilter, setListingStatusFilter] = React.useState('pending');
  const [listingPage, setListingPage] = React.useState(1);
  const [listingPages, setListingPages] = React.useState(1);
  const [listingLoading, setListingLoading] = React.useState(false);
  const [activeListing, setActiveListing] = React.useState<ListingItem | null>(null);
  const [listingNewStatus, setListingNewStatus] = React.useState<'pending' | 'approved' | 'rejected'>('approved');
  const [listingNote, setListingNote] = React.useState('');
  const [listingActionMsg, setListingActionMsg] = React.useState('');

  // Roommates
  const [roommates, setRoommates] = React.useState<RoommateItem[]>([]);
  const [roommateStatusFilter, setRoommateStatusFilter] = React.useState('pending');
  const [roommatePage, setRoommatePage] = React.useState(1);
  const [roommatePages, setRoommatePages] = React.useState(1);
  const [roommateLoading, setRoommateLoading] = React.useState(false);
  const [activeRoommate, setActiveRoommate] = React.useState<RoommateItem | null>(null);
  const [roommateNewStatus, setRoommateNewStatus] = React.useState<'pending' | 'approved' | 'rejected'>('approved');
  const [roommateNote, setRoommateNote] = React.useState('');
  const [roommateActionMsg, setRoommateActionMsg] = React.useState('');

  // Tour Requests
  const [tours, setTours] = React.useState<TourRequestItem[]>([]);
  const [tourStatusFilter, setTourStatusFilter] = React.useState('');
  const [tourPage, setTourPage] = React.useState(1);
  const [tourPages, setTourPages] = React.useState(1);
  const [tourLoading, setTourLoading] = React.useState(false);
  const [activeTour, setActiveTour] = React.useState<TourRequestItem | null>(null);
  const [tourNote, setTourNote] = React.useState('');
  const [tourNewStatus, setTourNewStatus] = React.useState('');
  const [tourActionMsg, setTourActionMsg] = React.useState('');

  // Feedback
  const [feedbacks, setFeedbacks] = React.useState<FeedbackItem[]>([]);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = React.useState('open');
  const [feedbackPage, setFeedbackPage] = React.useState(1);
  const [feedbackPages, setFeedbackPages] = React.useState(1);
  const [feedbackLoading, setFeedbackLoading] = React.useState(false);
  const [activeFeedback, setActiveFeedback] = React.useState<FeedbackItem | null>(null);
  const [feedbackNote, setFeedbackNote] = React.useState('');
  const [feedbackNewStatus, setFeedbackNewStatus] = React.useState('');
  const [feedbackActionMsg, setFeedbackActionMsg] = React.useState('');

  // Reports
  const [reports, setReports] = React.useState<ReportItem[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = React.useState('open');
  const [reportPage, setReportPage] = React.useState(1);
  const [reportPages, setReportPages] = React.useState(1);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [activeReport, setActiveReport] = React.useState<ReportItem | null>(null);
  const [reportNote, setReportNote] = React.useState('');
  const [reportNewStatus, setReportNewStatus] = React.useState('');
  const [reportActionMsg, setReportActionMsg] = React.useState('');

  // Users
  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = React.useState('');
  const [userPage, setUserPage] = React.useState(1);
  const [userPages, setUserPages] = React.useState(1);
  const [userLoading, setUserLoading] = React.useState(false);
  const [userActionMsg, setUserActionMsg] = React.useState('');

  // ---- Stats ----
  React.useEffect(() => {
    apiRequest<AdminStats>('/api/admin/stats', { auth: true })
      .then(setStats)
      .catch(() => {});
  }, []);

  // ---- Listings ----
  const loadSubscriptions = React.useCallback(async (page: number, status: string) => {
    setSubscriptionLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (status) qs.set('status', status);
      const data = await apiRequest<PagedResponse<SubscriptionItem>>(`/api/admin/subscriptions?${qs}`, { auth: true });
      setSubscriptions(data.users || []);
      setSubscriptionPages(data.pages || 1);
    } catch {
      setSubscriptions([]);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'subscriptions') {
      loadSubscriptions(subscriptionPage, subscriptionStatusFilter);
    }
  }, [tab, subscriptionPage, subscriptionStatusFilter, loadSubscriptions]);

  const handleSubscriptionReview = async () => {
    if (!activeSubscription) return;
    setSubscriptionActionMsg('');
    try {
      await apiRequest(`/api/admin/subscriptions/${activeSubscription._id}/review`, {
        method: 'PUT',
        auth: true,
        body: {
          status: subscriptionNewStatus,
          reviewNote: subscriptionNote
        }
      });
      setSubscriptionActionMsg(tp('Subscription review updated.'));
      setActiveSubscription(null);
      await Promise.all([
        loadSubscriptions(subscriptionPage, subscriptionStatusFilter),
        apiRequest<AdminStats>('/api/admin/stats', { auth: true }).then(setStats)
      ]);
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err: unknown) {
      setSubscriptionActionMsg(err instanceof Error ? tp(err.message) : tp('Update failed'));
    }
  };

  // ---- Listings ----
  const loadListings = React.useCallback(async (page: number, status: string) => {
    setListingLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (status) qs.set('status', status);
      const data = await apiRequest<PagedResponse<ListingItem>>(`/api/admin/listings?${qs}`, { auth: true });
      setListings(data.properties || []);
      setListingPages(data.pages || 1);
    } catch {
      setListings([]);
    } finally {
      setListingLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'listings') {
      loadListings(listingPage, listingStatusFilter);
    }
  }, [tab, listingPage, listingStatusFilter, loadListings]);

  const handleListingReview = async () => {
    if (!activeListing) return;
    setListingActionMsg('');
    try {
      await apiRequest(`/api/admin/listings/${activeListing._id}/approval`, {
        method: 'PUT',
        auth: true,
        body: {
          approvalStatus: listingNewStatus,
          reviewNote: listingNote
        }
      });
      setListingActionMsg(tp('Listing review updated.'));
      setActiveListing(null);
      await Promise.all([
        loadListings(listingPage, listingStatusFilter),
        apiRequest<AdminStats>('/api/admin/stats', { auth: true }).then(setStats)
      ]);
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err: unknown) {
      setListingActionMsg(err instanceof Error ? tp(err.message) : tp('Update failed'));
    }
  };

  // ---- Roommates ----
  const loadRoommates = React.useCallback(async (page: number, status: string) => {
    setRoommateLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (status) qs.set('status', status);
      const data = await apiRequest<PagedResponse<RoommateItem>>(`/api/admin/roommates?${qs}`, { auth: true });
      setRoommates(data.profiles || []);
      setRoommatePages(data.pages || 1);
    } catch {
      setRoommates([]);
    } finally {
      setRoommateLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'roommates') {
      loadRoommates(roommatePage, roommateStatusFilter);
    }
  }, [tab, roommatePage, roommateStatusFilter, loadRoommates]);

  const handleRoommateReview = async () => {
    if (!activeRoommate) return;
    setRoommateActionMsg('');
    try {
      await apiRequest(`/api/admin/roommates/${activeRoommate._id}/approval`, {
        method: 'PUT',
        auth: true,
        body: {
          approvalStatus: roommateNewStatus,
          reviewNote: roommateNote
        }
      });

      setRoommateActionMsg(tp('Roommate profile review updated.'));
      setActiveRoommate(null);
      await Promise.all([
        loadRoommates(roommatePage, roommateStatusFilter),
        apiRequest<AdminStats>('/api/admin/stats', { auth: true }).then(setStats)
      ]);
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err: unknown) {
      setRoommateActionMsg(err instanceof Error ? tp(err.message) : tp('Update failed'));
    }
  };

  // ---- Tours ----
  const loadTours = React.useCallback(async (page: number, status: string) => {
    setTourLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (status) qs.set('status', status);
      const data = await apiRequest<PagedResponse<TourRequestItem>>(`/api/admin/tour-requests?${qs}`, { auth: true });
      setTours(data.requests || []);
      setTourPages(data.pages || 1);
    } catch {
      setTours([]);
    } finally {
      setTourLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'tours') {
      loadTours(tourPage, tourStatusFilter);
    }
  }, [tab, tourPage, tourStatusFilter, loadTours]);

  const handleTourStatusUpdate = async () => {
    if (!activeTour || !tourNewStatus) return;
    setTourActionMsg('');
    try {
      await apiRequest(`/api/admin/tour-requests/${activeTour._id}/status`, {
        method: 'PUT',
        auth: true,
        body: { status: tourNewStatus, reviewerNote: tourNote }
      });
      setTourActionMsg(tp('Updated successfully'));
      setActiveTour(null);
      loadTours(tourPage, tourStatusFilter);
    } catch (err: unknown) {
      setTourActionMsg(err instanceof Error ? tp(err.message) : tp('Update failed'));
    }
  };

  // ---- Feedback ----
  const loadFeedback = React.useCallback(async (page: number, status: string) => {
    setFeedbackLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (status) qs.set('status', status);
      const data = await apiRequest<PagedResponse<FeedbackItem>>(`/api/admin/feedback?${qs}`, { auth: true });
      setFeedbacks(data.feedbacks || []);
      setFeedbackPages(data.pages || 1);
    } catch {
      setFeedbacks([]);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'feedback') {
      loadFeedback(feedbackPage, feedbackStatusFilter);
    }
  }, [tab, feedbackPage, feedbackStatusFilter, loadFeedback]);

  const handleFeedbackUpdate = async () => {
    if (!activeFeedback || !feedbackNewStatus) return;
    setFeedbackActionMsg('');
    try {
      await apiRequest(`/api/admin/feedback/${activeFeedback._id}`, {
        method: 'PUT',
        auth: true,
        body: { status: feedbackNewStatus, adminNote: feedbackNote }
      });
      setFeedbackActionMsg(tp('Feedback updated'));
      setActiveFeedback(null);
      await Promise.all([
        loadFeedback(feedbackPage, feedbackStatusFilter),
        apiRequest<AdminStats>('/api/admin/stats', { auth: true }).then(setStats)
      ]);
    } catch (err: unknown) {
      setFeedbackActionMsg(err instanceof Error ? tp(err.message) : tp('Update failed'));
    }
  };

  // ---- Reports ----
  const loadReports = React.useCallback(async (page: number, status: string) => {
    setReportLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (status) qs.set('status', status);
      const data = await apiRequest<PagedResponse<ReportItem>>(`/api/admin/reports?${qs}`, { auth: true });
      setReports(data.reports || []);
      setReportPages(data.pages || 1);
    } catch {
      setReports([]);
    } finally {
      setReportLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'reports') {
      loadReports(reportPage, reportStatusFilter);
    }
  }, [tab, reportPage, reportStatusFilter, loadReports]);

  const handleReportUpdate = async () => {
    if (!activeReport || !reportNewStatus) return;
    setReportActionMsg('');
    try {
      await apiRequest(`/api/admin/reports/${activeReport._id}`, {
        method: 'PUT',
        auth: true,
        body: { status: reportNewStatus, adminNote: reportNote }
      });
      setReportActionMsg(tp('Report updated'));
      setActiveReport(null);
      loadReports(reportPage, reportStatusFilter);
    } catch (err: unknown) {
      setReportActionMsg(err instanceof Error ? tp(err.message) : tp('Update failed'));
    }
  };

  // ---- Users ----
  const loadUsers = React.useCallback(async (page: number, search: string) => {
    setUserLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) qs.set('search', search.trim());
      const data = await apiRequest<PagedResponse<UserItem>>(`/api/admin/users?${qs}`, { auth: true });
      setUsers(data.users || []);
      setUserPages(data.pages || 1);
    } catch {
      setUsers([]);
    } finally {
      setUserLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'users') {
      loadUsers(userPage, userSearch);
    }
  }, [tab, userPage, userSearch, loadUsers]);

  const handleBan = async (userId: string, banned: boolean) => {
    setUserActionMsg('');
    try {
      await apiRequest(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        auth: true,
        body: { banned }
      });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, banned } : u));
      setUserActionMsg(`User ${banned ? 'banned' : 'unbanned'}.`);
    } catch (err: unknown) {
      setUserActionMsg(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handlePromote = async (userId: string) => {
    if (!window.confirm('Promote this user to admin? This cannot be reversed here.')) return;
    setUserActionMsg('');
    try {
      await apiRequest(`/api/admin/users/${userId}/promote`, {
        method: 'PUT',
        auth: true
      });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: 'admin' } : u));
      setUserActionMsg('User promoted to admin.');
    } catch (err: unknown) {
      setUserActionMsg(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const userSearchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUserSearchChange = (val: string) => {
    setUserSearch(val);
    setUserPage(1);
    if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);
    userSearchTimeout.current = setTimeout(() => loadUsers(1, val), 400);
  };

  const activeTabLabel = TAB_META[tab].label;
  const totalUsers = stats?.totalUsers || 0;
  const bannedUsers = stats?.bannedUsers || 0;
  const safeUserBase = Math.max(totalUsers, 1);
  const moderationLoad =
    (stats?.openFeedbacks || 0) +
    (stats?.openReports || 0) +
    (stats?.pendingListings || 0) +
    (stats?.pendingRoommates || 0) +
    (stats?.pendingSubscriptions || 0);
  const moderationLoadPercent = Math.min(100, Math.round((moderationLoad / Math.max(totalUsers, 10)) * 100));
  const userSafetyPercent = Math.max(0, Math.min(100, Math.round(((totalUsers - bannedUsers) / safeUserBase) * 100)));
  const pendingToursPercent = Math.min(100, Math.round(((stats?.pendingTours || 0) / Math.max(totalUsers, 10)) * 100));

  return (
    <div className="operations-page admin-page admin-command-center">
      <div className="operations-header admin-hero glass">
        <div className="admin-hero-content">
          <p className="operations-kicker admin-kicker">{tp('Control Center')}</p>
          <h1 className="admin-hero-title">
            <span className="admin-hero-title-main">{tp('Admin')}</span>
            <span className="admin-hero-title-mark">{tp('Console')}</span>
          </h1>
          <p className="admin-hero-lead">{tp('Monitor moderation, approvals, and operations with fast, high-clarity controls.')}</p>
          <div className="admin-hero-highlights" aria-label={tp('Header metrics')}>
            <div className="admin-hero-pill">
              <span>{tp('Open Reports')}</span>
              <strong>{stats?.openReports ?? '—'}</strong>
            </div>
            <div className="admin-hero-pill">
              <span>{tp('Pending Approvals')}</span>
              <strong>{(stats?.pendingListings || 0) + (stats?.pendingRoommates || 0) + (stats?.pendingSubscriptions || 0)}</strong>
            </div>
            <div className="admin-hero-pill">
              <span>{tp('Pending Tours')}</span>
              <strong>{stats?.pendingTours ?? '—'}</strong>
            </div>
          </div>
        </div>
        <div className="admin-hero-meta" aria-live="polite">
          <span className="admin-live-dot" aria-hidden="true" />
          <strong>{tp(activeTabLabel)}</strong>
          <small>{tp(TAB_META[tab].accent)}</small>
        </div>
      </div>

      <div className="admin-tabs">
        {(['overview', 'subscriptions', 'listings', 'roommates', 'feedback', 'reports', 'tours', 'users'] as TabKey[]).map(t => (
          <button
            key={t}
            className={`admin-tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'overview' && tp(TAB_META.overview.label)}
            {t === 'subscriptions' && (
              <>{tp(TAB_META.subscriptions.label)} {stats && stats.pendingSubscriptions > 0 ? <span className="admin-badge">{stats.pendingSubscriptions}</span> : null}</>
            )}
            {t === 'listings' && (
              <>{tp(TAB_META.listings.label)} {stats && stats.pendingListings > 0 ? <span className="admin-badge">{stats.pendingListings}</span> : null}</>
            )}
            {t === 'roommates' && (
              <>{tp(TAB_META.roommates.label)} {stats && stats.pendingRoommates > 0 ? <span className="admin-badge">{stats.pendingRoommates}</span> : null}</>
            )}
            {t === 'feedback' && (
              <>{tp(TAB_META.feedback.label)} {stats && stats.openFeedbacks > 0 ? <span className="admin-badge">{stats.openFeedbacks}</span> : null}</>
            )}
            {t === 'reports' && (
              <>{tp(TAB_META.reports.label)} {stats && stats.openReports > 0 ? <span className="admin-badge">{stats.openReports}</span> : null}</>
            )}
            {t === 'tours' && (
              <>{tp(TAB_META.tours.label)} {stats && stats.pendingTours > 0 ? <span className="admin-badge">{stats.pendingTours}</span> : null}</>
            )}
            {t === 'users' && tp(TAB_META.users.label)}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="admin-panel admin-overview-grid">
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.openReports : '—'}</div>
              <div className="admin-stat-label">{tp('Open Reports')}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.pendingTours : '—'}</div>
              <div className="admin-stat-label">{tp('Pending Tour Requests')}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.pendingListings : '—'}</div>
              <div className="admin-stat-label">{tp('Pending Listings')}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.pendingSubscriptions : '—'}</div>
              <div className="admin-stat-label">{tp('Pending Subscriptions')}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.openFeedbacks : '—'}</div>
              <div className="admin-stat-label">{tp('Open Feedback')}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.pendingRoommates : '—'}</div>
              <div className="admin-stat-label">{tp('Pending Roommate Profiles')}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.totalUsers : '—'}</div>
              <div className="admin-stat-label">{tp('Total Users')}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats ? stats.bannedUsers : '—'}</div>
              <div className="admin-stat-label">{tp('Banned Users')}</div>
            </div>
          </div>

          <aside className="admin-insight-panel" aria-label={tp('Operations snapshot')}>
            <h2>{tp('Operations Snapshot')}</h2>
            <p className="admin-insight-sub">{tp('Live workload and safety posture from current queue counts.')}</p>

            <div className="admin-meter-list">
              <div className="admin-meter-row">
                <div className="admin-meter-head">
                  <span>{tp('Moderation Load')}</span>
                  <strong>{moderationLoadPercent}%</strong>
                </div>
                <div className="admin-meter-track">
                  <span className="admin-meter-fill" style={{ width: `${moderationLoadPercent}%` }} />
                </div>
              </div>

              <div className="admin-meter-row">
                <div className="admin-meter-head">
                  <span>{tp('User Safety')}</span>
                  <strong>{userSafetyPercent}%</strong>
                </div>
                <div className="admin-meter-track">
                  <span className="admin-meter-fill admin-meter-fill--good" style={{ width: `${userSafetyPercent}%` }} />
                </div>
              </div>

              <div className="admin-meter-row">
                <div className="admin-meter-head">
                  <span>{tp('Tour Queue Pressure')}</span>
                  <strong>{pendingToursPercent}%</strong>
                </div>
                <div className="admin-meter-track">
                  <span className="admin-meter-fill admin-meter-fill--hot" style={{ width: `${pendingToursPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="admin-insight-footer">
              <p>{tp('Open reports:')} <strong>{stats?.openReports || 0}</strong></p>
              <p>{tp('Open feedback:')} <strong>{stats?.openFeedbacks || 0}</strong></p>
              <p>{tp('Pending approvals:')} <strong>{(stats?.pendingListings || 0) + (stats?.pendingRoommates || 0) + (stats?.pendingSubscriptions || 0)}</strong></p>
            </div>
          </aside>
        </div>
      )}

      {/* SUBSCRIPTIONS */}
      {tab === 'subscriptions' && (
        <div className="admin-panel">
          <div className="admin-filter-row">
            <label htmlFor="subscription-status-filter">{tp('Status:')}</label>
            <select
              id="subscription-status-filter"
              value={subscriptionStatusFilter}
              onChange={e => { setSubscriptionStatusFilter(e.target.value); setSubscriptionPage(1); }}
            >
              <option value="">{tp('All')}</option>
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
              <option value="expired">{tp('Expired')}</option>
            </select>
          </div>

          {subscriptionLoading && <p className="admin-loading">{tp('Loading…')}</p>}
          {subscriptionActionMsg && <p className="admin-action-msg">{subscriptionActionMsg}</p>}

          {!subscriptionLoading && subscriptions.length === 0 && (
            <p className="admin-empty">{tp('No subscriptions found.')}</p>
          )}

          {subscriptions.map((item, idx) => (
            <div key={item._id} className="operations-item admin-list-item admin-item-animated" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="admin-item-header">
                <span className={`tone-pill ${STATUS_TONE[item.landlordSubscription?.status || 'pending'] || ''}`}>
                  {item.landlordSubscription?.status || 'not_submitted'}
                </span>
                <span className="admin-item-title">{item.firstName} {item.lastName}</span>
                <span className="admin-item-date">
                  {item.landlordSubscription?.submittedAt ? new Date(item.landlordSubscription.submittedAt).toLocaleDateString() : '—'}
                </span>
              </div>

              <p className="admin-item-sub">@{item.username} · {item.email}</p>
              <p className="admin-item-sub">
                {getSubscriptionPlanLabel(item.landlordSubscription) !== 'Plan not specified' ? (
                  <strong style={{ textTransform: 'capitalize', color: '#0f5274' }}>
                    {tp(getSubscriptionPlanLabel(item.landlordSubscription))}
                  </strong>
                ) : (
                  <span style={{ color: '#9ca3af' }}>{tp('Plan not specified')}</span>
                )}
                {' · '}
                {tp('Plan months:')} {item.landlordSubscription?.planMonths || 1}
              </p>
              {item.landlordSubscription?.paymentReference ? (
                <p className="admin-item-sub">{tp('Reference:')} {item.landlordSubscription.paymentReference}</p>
              ) : null}
              {item.landlordSubscription?.currentPeriodEnd ? (
                <p className="admin-item-sub">{tp('Active until:')} {new Date(item.landlordSubscription.currentPeriodEnd).toLocaleDateString()}</p>
              ) : null}
              {item.landlordSubscription?.reviewNote ? (
                <p className="admin-item-note"><em>{tp('Review note:')} {item.landlordSubscription.reviewNote}</em></p>
              ) : null}

              {item.landlordSubscription?.paymentProofUrl ? (
                <a
                  href={resolveMediaUrl(item.landlordSubscription.paymentProofUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-action-btn admin-action-btn--secondary"
                >
                  {tp('View Proof')}
                </a>
              ) : null}

              <button
                className="admin-action-btn"
                onClick={() => {
                  setActiveSubscription(item);
                  setSubscriptionNewStatus(
                    item.landlordSubscription?.status === 'approved'
                      ? 'approved'
                      : item.landlordSubscription?.status === 'expired'
                        ? 'expired'
                        : item.landlordSubscription?.status === 'rejected'
                          ? 'rejected'
                          : 'approved'
                  );
                  setSubscriptionNote(item.landlordSubscription?.reviewNote || '');
                }}
              >
                {tp('Review Subscription')}
              </button>
            </div>
          ))}

          {subscriptionPages > 1 && (
            <div className="admin-pagination">
              <button disabled={subscriptionPage <= 1} onClick={() => setSubscriptionPage(p => p - 1)}>{tp('Prev')}</button>
              <span>{tp('Page')} {subscriptionPage} / {subscriptionPages}</span>
              <button disabled={subscriptionPage >= subscriptionPages} onClick={() => setSubscriptionPage(p => p + 1)}>{tp('Next')}</button>
            </div>
          )}
        </div>
      )}

      {/* LISTINGS */}
      {tab === 'listings' && (
        <div className="admin-panel">
          <div className="admin-filter-row">
            <label htmlFor="listing-status-filter">{tp('Status:')}</label>
            <select
              id="listing-status-filter"
              value={listingStatusFilter}
              onChange={e => { setListingStatusFilter(e.target.value); setListingPage(1); }}
            >
              <option value="">{tp('All')}</option>
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
            </select>
          </div>

          {listingLoading && <p className="admin-loading">{tp('Loading…')}</p>}
          {listingActionMsg && <p className="admin-action-msg">{listingActionMsg}</p>}

          {!listingLoading && listings.length === 0 && (
            <p className="admin-empty">{tp('No listings found.')}</p>
          )}

          {listings.map((listing, idx) => (
            <div key={listing._id} className="operations-item admin-list-item admin-item-animated" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="admin-item-header">
                <span className={`tone-pill ${STATUS_TONE[listing.approvalStatus] || ''}`}>{listing.approvalStatus}</span>
                <span className="admin-item-title">{listing.title}</span>
                <span className="admin-item-date">{new Date(listing.createdAt).toLocaleDateString()}</span>
              </div>
              {listing.images?.length ? (
                <div className="admin-listing-gallery" role="list" aria-label={`Photos for ${listing.title}`}>
                  {listing.images.slice(0, 6).map((image, idx) => (
                    <a
                      key={`${listing._id}-img-${idx}`}
                      href={resolveMediaUrl(image)}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="listitem"
                    >
                      <img src={resolveMediaUrl(image)} alt={`${listing.title} view ${idx + 1}`} loading="lazy" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="admin-item-sub">{tp('No images uploaded')}</p>
              )}
              <p className="admin-item-sub">{listing.propertyType} · {listing.city}, {listing.state} {listing.zipCode} · {formatMoney(listing.rent)}{t('per_month')}</p>
              <p className="admin-item-sub">{tp('Bedrooms:')} {listing.bedrooms} · {tp('Bathrooms:')} {listing.bathrooms} · {tp('Area:')} {listing.squareFeet} {tp('sqft')}</p>
              <p className="admin-item-sub">{tp('Address:')} {listing.address}</p>
              <p className="admin-item-sub">{tp('Touring fee:')} {formatMoney(listing.touringFee || 5000)} · {tp('Availability:')} {listing.available ? tp('Available') : tp('Not available')}</p>
              {listing.availableDate ? <p className="admin-item-sub">{tp('Available from:')} {new Date(listing.availableDate).toLocaleDateString()}</p> : null}
              {listing.amenities?.length ? (
                <p className="admin-item-sub">{tp('Amenities:')} {listing.amenities.join(', ')}</p>
              ) : null}
              <p className="admin-item-reason"><strong>{tp('Description:')}</strong> {listing.description}</p>
              {listing.landlordId && (
                <p className="admin-item-sub">
                  {tp('Landlord:')} {listing.landlordId.firstName} {listing.landlordId.lastName} ({listing.landlordId.email})
                </p>
              )}
              {listing.reviewNote && (
                <p className="admin-item-note"><em>{tp('Review note:')} {listing.reviewNote}</em></p>
              )}
              <button
                className="admin-action-btn"
                onClick={() => {
                  setActiveListing(listing);
                  setListingNewStatus(listing.approvalStatus === 'pending' ? 'approved' : listing.approvalStatus);
                  setListingNote(listing.reviewNote || '');
                }}
              >
                {tp('Review Listing')}
              </button>
            </div>
          ))}

          {listingPages > 1 && (
            <div className="admin-pagination">
              <button disabled={listingPage <= 1} onClick={() => setListingPage(p => p - 1)}>{tp('Prev')}</button>
              <span>{tp('Page')} {listingPage} / {listingPages}</span>
              <button disabled={listingPage >= listingPages} onClick={() => setListingPage(p => p + 1)}>{tp('Next')}</button>
            </div>
          )}
        </div>
      )}

      {/* ROOMMATES */}
      {tab === 'roommates' && (
        <div className="admin-panel">
          <div className="admin-filter-row">
            <label htmlFor="roommate-status-filter">{tp('Status:')}</label>
            <select
              id="roommate-status-filter"
              value={roommateStatusFilter}
              onChange={e => { setRoommateStatusFilter(e.target.value); setRoommatePage(1); }}
            >
              <option value="">{tp('All')}</option>
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
            </select>
          </div>

          {roommateLoading && <p className="admin-loading">{tp('Loading…')}</p>}
          {roommateActionMsg && <p className="admin-action-msg">{roommateActionMsg}</p>}

          {!roommateLoading && roommates.length === 0 && (
            <p className="admin-empty">{tp('No roommate profiles found.')}</p>
          )}

          {roommates.map((profile, idx) => (
            <div key={profile._id} className="operations-item admin-list-item admin-item-animated" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="admin-item-header">
                <span className={`tone-pill ${STATUS_TONE[profile.approvalStatus] || ''}`}>{profile.approvalStatus}</span>
                <span className="admin-item-title">
                  {profile.userId ? `${profile.userId.firstName} ${profile.userId.lastName}` : tp('Roommate Profile')}
                </span>
                <span className="admin-item-date">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="admin-item-sub">{profile.occupation} · {profile.age} {tp('years')} · {profile.city}</p>
              <p className="admin-item-sub">{tp('Budget:')} {formatMoney(profile.budget)}{t('per_month')} · {tp('Move-in:')} {new Date(profile.moveInDate).toLocaleDateString()}</p>
              {profile.userId && (
                <p className="admin-item-sub">{tp('Owner:')} @{profile.userId.username} ({profile.userId.email})</p>
              )}
              <p className="admin-item-reason"><strong>{tp('Bio:')}</strong> {profile.bio}</p>
              {profile.reviewNote && (
                <p className="admin-item-note"><em>{tp('Review note:')} {profile.reviewNote}</em></p>
              )}
              <button
                className="admin-action-btn"
                onClick={() => {
                  setActiveRoommate(profile);
                  setRoommateNewStatus(profile.approvalStatus === 'pending' ? 'approved' : profile.approvalStatus);
                  setRoommateNote(profile.reviewNote || '');
                }}
              >
                {tp('Review Profile')}
              </button>
            </div>
          ))}

          {roommatePages > 1 && (
            <div className="admin-pagination">
              <button disabled={roommatePage <= 1} onClick={() => setRoommatePage(p => p - 1)}>{tp('Prev')}</button>
              <span>{tp('Page')} {roommatePage} / {roommatePages}</span>
              <button disabled={roommatePage >= roommatePages} onClick={() => setRoommatePage(p => p + 1)}>{tp('Next')}</button>
            </div>
          )}
        </div>
      )}

      {/* FEEDBACK */}
      {tab === 'feedback' && (
        <div className="admin-panel">
          <div className="admin-filter-row">
            <label htmlFor="feedback-status-filter">{tp('Status:')}</label>
            <select
              id="feedback-status-filter"
              value={feedbackStatusFilter}
              onChange={e => { setFeedbackStatusFilter(e.target.value); setFeedbackPage(1); }}
            >
              <option value="">{tp('All')}</option>
              <option value="open">{tp('Open')}</option>
              <option value="resolved">{tp('Resolved')}</option>
              <option value="dismissed">{tp('Dismissed')}</option>
            </select>
          </div>

          {feedbackLoading && <p className="admin-loading">{tp('Loading…')}</p>}
          {feedbackActionMsg && <p className="admin-action-msg">{feedbackActionMsg}</p>}

          {!feedbackLoading && feedbacks.length === 0 && (
            <p className="admin-empty">{tp('No feedback found.')}</p>
          )}

          {feedbacks.map((feedback, idx) => (
            <div key={feedback._id} className="operations-item admin-list-item admin-item-animated" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="admin-item-header">
                <span className={`tone-pill ${STATUS_TONE[feedback.status] || ''}`}>{feedback.status}</span>
                <span className="admin-item-title">{feedback.subject}</span>
                <span className="admin-item-date">{new Date(feedback.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="admin-item-sub">{feedback.senderName} ({feedback.senderEmail})</p>
              {feedback.userId ? (
                <p className="admin-item-sub">{tp('User:')} {feedback.userId.firstName} {feedback.userId.lastName} (@{feedback.userId.username})</p>
              ) : null}
              <p className="admin-item-reason"><strong>{tp('Message:')}</strong> {feedback.message}</p>
              {feedback.adminNote ? (
                <p className="admin-item-note"><em>{tp('Admin note:')} {feedback.adminNote}</em></p>
              ) : null}
              <button
                className="admin-action-btn"
                onClick={() => {
                  setActiveFeedback(feedback);
                  setFeedbackNote(feedback.adminNote || '');
                  setFeedbackNewStatus(feedback.status);
                  setFeedbackActionMsg('');
                }}
              >
                {tp('Review Feedback')}
              </button>
            </div>
          ))}

          {feedbackPages > 1 && (
            <div className="admin-pagination">
              <button disabled={feedbackPage <= 1} onClick={() => setFeedbackPage(p => p - 1)}>{tp('Prev')}</button>
              <span>{tp('Page')} {feedbackPage} / {feedbackPages}</span>
              <button disabled={feedbackPage >= feedbackPages} onClick={() => setFeedbackPage(p => p + 1)}>{tp('Next')}</button>
            </div>
          )}
        </div>
      )}

      {/* REPORTS */}
      {tab === 'reports' && (
        <div className="admin-panel">
          <div className="admin-filter-row">
            <label htmlFor="report-status-filter">{tp('Status:')}</label>
            <select
              id="report-status-filter"
              value={reportStatusFilter}
              onChange={e => { setReportStatusFilter(e.target.value); setReportPage(1); }}
            >
              <option value="">{tp('All')}</option>
              <option value="open">{tp('Open')}</option>
              <option value="resolved">{tp('Resolved')}</option>
              <option value="dismissed">{tp('Dismissed')}</option>
            </select>
          </div>

          {reportLoading && <p className="admin-loading">{tp('Loading…')}</p>}
          {reportActionMsg && <p className="admin-action-msg">{reportActionMsg}</p>}

          {!reportLoading && reports.length === 0 && (
            <p className="admin-empty">{tp('No reports found.')}</p>
          )}

          {reports.map((report, idx) => (
            <div key={report._id} className="operations-item admin-list-item admin-item-animated" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="admin-item-header">
                <span className={`tone-pill ${STATUS_TONE[report.status] || ''}`}>{report.status}</span>
                <span className="admin-item-type">{report.targetType} report</span>
                <span className="admin-item-date">{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="admin-item-reason">
                <strong>{tp('Reason:')}</strong> {report.reason}
                {report.details ? ` — ${report.details}` : ''}
              </p>
              {report.reporterId && (
                <p className="admin-item-sub">
                  Reported by: {report.reporterId.firstName} {report.reporterId.lastName} ({report.reporterId.email})
                </p>
              )}
              <p className="admin-item-sub">Target ID: {report.targetId}</p>
              {report.adminNote && (
                <p className="admin-item-note"><em>Admin note: {report.adminNote}</em></p>
              )}
              <button
                className="admin-action-btn"
                onClick={() => {
                  setActiveReport(report);
                  setReportNote(report.adminNote || '');
                  setReportNewStatus(report.status);
                  setReportActionMsg('');
                }}
              >
                Review
              </button>
            </div>
          ))}

          {reportPages > 1 && (
            <div className="admin-pagination">
              <button disabled={reportPage <= 1} onClick={() => setReportPage(p => p - 1)}>{tp('Prev')}</button>
              <span>{tp('Page')} {reportPage} / {reportPages}</span>
              <button disabled={reportPage >= reportPages} onClick={() => setReportPage(p => p + 1)}>{tp('Next')}</button>
            </div>
          )}
        </div>
      )}

      {/* TOUR REQUESTS */}
      {tab === 'tours' && (
        <div className="admin-panel">
          <div className="admin-filter-row">
            <label htmlFor="tour-status-filter">{tp('Status:')}</label>
            <select
              id="tour-status-filter"
              value={tourStatusFilter}
              onChange={e => { setTourStatusFilter(e.target.value); setTourPage(1); }}
            >
              <option value="">{tp('All')}</option>
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
              <option value="completed">{tp('Completed')}</option>
              <option value="cancelled">{tp('Cancelled')}</option>
            </select>
          </div>

          {tourLoading && <p className="admin-loading">{tp('Loading…')}</p>}
          {tourActionMsg && <p className="admin-action-msg">{tourActionMsg}</p>}

          {!tourLoading && tours.length === 0 && (
            <p className="admin-empty">{tp('No tour requests found.')}</p>
          )}

          {tours.map((t, idx) => (
            <div key={t._id} className="operations-item admin-list-item admin-item-animated" style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="admin-item-header">
                <span className={`tone-pill ${STATUS_TONE[t.status] || ''}`}>{t.status}</span>
                {t.propertyId && (
                  <span className="admin-item-title">{t.propertyId.title}</span>
                )}
                <span className="admin-item-date">{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
              {t.renterId && (
                <p className="admin-item-sub">Renter: {t.renterId.firstName} {t.renterId.lastName} ({t.renterId.email})</p>
              )}
              {t.landlordId && (
                <p className="admin-item-sub">Landlord: {t.landlordId.firstName} {t.landlordId.lastName} ({t.landlordId.email})</p>
              )}
              {t.paymentMethod && (
                <p className="admin-item-sub">Payment: {t.paymentMethod}{t.paymentProofUrl ? ' — ' : ''}{t.paymentProofUrl && (
                  <a href={resolveMediaUrl(t.paymentProofUrl)} target="_blank" rel="noopener noreferrer">{tp('View proof')}</a>
                )}</p>
              )}
              {t.reviewerNote && (
                <p className="admin-item-note"><em>Note: {t.reviewerNote}</em></p>
              )}
              <button
                className="admin-action-btn"
                onClick={() => {
                  setActiveTour(t);
                  setTourNote(t.reviewerNote || '');
                  setTourNewStatus(t.status);
                  setTourActionMsg('');
                }}
              >
                Override Status
              </button>
            </div>
          ))}

          {tourPages > 1 && (
            <div className="admin-pagination">
              <button disabled={tourPage <= 1} onClick={() => setTourPage(p => p - 1)}>{tp('Prev')}</button>
              <span>{tp('Page')} {tourPage} / {tourPages}</span>
              <button disabled={tourPage >= tourPages} onClick={() => setTourPage(p => p + 1)}>{tp('Next')}</button>
            </div>
          )}
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="admin-panel">
          <div className="admin-filter-row">
            <label htmlFor="user-search">{tp('Search:')}</label>
            <input
              id="user-search"
              type="text"
              placeholder={tp('Name, username, or email…')}
              value={userSearch}
              onChange={e => handleUserSearchChange(e.target.value)}
              className="admin-search-input"
            />
          </div>

          {userLoading && <p className="admin-loading">{tp('Loading…')}</p>}
          {userActionMsg && <p className="admin-action-msg">{userActionMsg}</p>}

          {!userLoading && users.length === 0 && (
            <p className="admin-empty">{tp('No users found.')}</p>
          )}

          {users.map((u, idx) => (
            <div key={u._id} className="operations-item admin-list-item admin-user-item admin-item-animated" style={{ animationDelay: `${idx * 40}ms` }}>
              {u.profileImage && (
                <img
                  src={resolveMediaUrl(u.profileImage)}
                  alt={u.username}
                  className="admin-user-avatar"
                />
              )}
              <div className="admin-user-info">
                <strong>{u.firstName} {u.lastName}</strong>
                <span className="admin-item-sub">@{u.username} · {u.email}</span>
                <span className="admin-item-sub">{u.userType} · {tp('joined')} {new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="admin-user-badges">
                {u.role === 'admin' && <span className="tone-pill tone-info">{tp('admin')}</span>}
                {u.banned && <span className="tone-pill tone-danger">{tp('banned')}</span>}
              </div>
              <div className="admin-user-actions">
                {u.role !== 'admin' && (
                  <>
                    <button
                      className={`admin-action-btn${u.banned ? ' admin-action-btn--secondary' : ' admin-action-btn--danger'}`}
                      onClick={() => handleBan(u._id, !u.banned)}
                    >
                      {u.banned ? tp('Unban') : tp('Ban')}
                    </button>
                    <button
                      className="admin-action-btn admin-action-btn--secondary"
                      onClick={() => handlePromote(u._id)}
                    >
                      {tp('Promote to Admin')}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {userPages > 1 && (
            <div className="admin-pagination">
              <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}>{tp('Prev')}</button>
              <span>{tp('Page')} {userPage} / {userPages}</span>
              <button disabled={userPage >= userPages} onClick={() => setUserPage(p => p + 1)}>{tp('Next')}</button>
            </div>
          )}
        </div>
      )}

      {/* FEEDBACK REVIEW MODAL */}
      {activeFeedback && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={tp('Review feedback')}>
          <div className="admin-modal">
            <h2>{tp('Review Feedback')}</h2>
            <p><strong>{activeFeedback.senderName}</strong> · {activeFeedback.senderEmail}</p>
            <p><strong>{tp('Subject:')}</strong> {activeFeedback.subject}</p>
            <p><strong>{tp('Message:')}</strong> {activeFeedback.message}</p>
            <label htmlFor="feedback-new-status">{tp('New Status')}</label>
            <select
              id="feedback-new-status"
              value={feedbackNewStatus}
              onChange={e => setFeedbackNewStatus(e.target.value)}
            >
              <option value="open">{tp('Open')}</option>
              <option value="resolved">{tp('Resolved')}</option>
              <option value="dismissed">{tp('Dismissed')}</option>
            </select>
            <label htmlFor="feedback-admin-note">{tp('Admin Note')}</label>
            <textarea
              id="feedback-admin-note"
              rows={3}
              value={feedbackNote}
              onChange={e => setFeedbackNote(e.target.value)}
              placeholder={tp('Internal note (optional)')}
            />
            {feedbackActionMsg && <p className="admin-action-msg">{feedbackActionMsg}</p>}
            <div className="admin-modal-actions">
              <button className="admin-action-btn" onClick={handleFeedbackUpdate}>{tp('Save')}</button>
              <button className="admin-action-btn admin-action-btn--secondary" onClick={() => setActiveFeedback(null)}>{tp('Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT REVIEW MODAL */}
      {activeSubscription && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={tp('Review subscription')}>
          <div className="admin-modal">
            <h2>{tp('Review Subscription')}</h2>
            <p>
              <strong>{activeSubscription.firstName} {activeSubscription.lastName}</strong> · @{activeSubscription.username}
            </p>
            <p>
              <strong>{tp(getSubscriptionPlanLabel(activeSubscription.landlordSubscription))}</strong>
            </p>
            <p>{tp('Plan months:')} {activeSubscription.landlordSubscription?.planMonths || 1}</p>
            {activeSubscription.landlordSubscription?.paymentProofUrl ? (
              <p>
                <a href={resolveMediaUrl(activeSubscription.landlordSubscription.paymentProofUrl)} target="_blank" rel="noopener noreferrer">
                  {tp('Open uploaded proof')}
                </a>
              </p>
            ) : null}

            <label htmlFor="subscription-new-status">{tp('New Status')}</label>
            <select
              id="subscription-new-status"
              value={subscriptionNewStatus}
              onChange={e => setSubscriptionNewStatus(e.target.value as 'pending' | 'approved' | 'rejected' | 'expired')}
            >
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
              <option value="expired">{tp('Expired')}</option>
            </select>

            <label htmlFor="subscription-review-note">{tp('Review Note')}</label>
            <textarea
              id="subscription-review-note"
              rows={3}
              value={subscriptionNote}
              onChange={e => setSubscriptionNote(e.target.value)}
              placeholder={tp('Optional note to landlord')}
            />

            {subscriptionActionMsg && <p className="admin-action-msg">{subscriptionActionMsg}</p>}
            <div className="admin-modal-actions">
              <button className="admin-action-btn" onClick={handleSubscriptionReview}>{tp('Save')}</button>
              <button className="admin-action-btn admin-action-btn--secondary" onClick={() => setActiveSubscription(null)}>{tp('Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT REVIEW MODAL */}
      {activeReport && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={tp('Review report')}>
          <div className="admin-modal">
            <h2>{tp('Review Report')}</h2>
            <p><strong>{tp('Type:')}</strong> {activeReport.targetType} · <strong>{tp('Reason:')}</strong> {activeReport.reason}</p>
            {activeReport.details && <p><strong>{tp('Details:')}</strong> {activeReport.details}</p>}
            <p><strong>{tp('Target ID:')}</strong> {activeReport.targetId}</p>
            <label htmlFor="report-new-status">{tp('New Status')}</label>
            <select
              id="report-new-status"
              value={reportNewStatus}
              onChange={e => setReportNewStatus(e.target.value)}
            >
              <option value="open">{tp('Open')}</option>
              <option value="resolved">{tp('Resolved')}</option>
              <option value="dismissed">{tp('Dismissed')}</option>
            </select>
            <label htmlFor="report-admin-note">{tp('Admin Note')}</label>
            <textarea
              id="report-admin-note"
              rows={3}
              value={reportNote}
              onChange={e => setReportNote(e.target.value)}
              placeholder={tp('Internal note (optional)')}
            />
            {reportActionMsg && <p className="admin-action-msg">{reportActionMsg}</p>}
            <div className="admin-modal-actions">
              <button className="admin-action-btn" onClick={handleReportUpdate}>{tp('Save')}</button>
              <button className="admin-action-btn admin-action-btn--secondary" onClick={() => setActiveReport(null)}>{tp('Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOUR STATUS OVERRIDE MODAL */}
      {activeTour && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={tp('Override tour request status')}>
          <div className="admin-modal">
            <h2>{tp('Override Tour Status')}</h2>
            <p>{activeTour.propertyId?.title || tp('Property')} — {activeTour.requesterName || activeTour.renterId?.firstName}</p>
            <label htmlFor="tour-new-status">{tp('New Status')}</label>
            <select
              id="tour-new-status"
              value={tourNewStatus}
              onChange={e => setTourNewStatus(e.target.value)}
            >
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
              <option value="completed">{tp('Completed')}</option>
              <option value="cancelled">{tp('Cancelled')}</option>
            </select>
            <label htmlFor="tour-admin-note">{tp('Reviewer Note')}</label>
            <textarea
              id="tour-admin-note"
              rows={3}
              value={tourNote}
              onChange={e => setTourNote(e.target.value)}
              placeholder={tp('Reason for override (optional)')}
            />
            {tourActionMsg && <p className="admin-action-msg">{tourActionMsg}</p>}
            <div className="admin-modal-actions">
              <button className="admin-action-btn" onClick={handleTourStatusUpdate}>{tp('Save')}</button>
              <button className="admin-action-btn admin-action-btn--secondary" onClick={() => setActiveTour(null)}>{tp('Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* LISTING REVIEW MODAL */}
      {activeListing && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={tp('Review listing')}>
          <div className="admin-modal">
            <h2>{tp('Review Listing')}</h2>
            <p><strong>{activeListing.title}</strong> — {activeListing.city}, {activeListing.state}</p>
            <p>{tp('Rent:')} {formatMoney(activeListing.rent)}{t('per_month')}</p>
            {activeListing.images?.length ? (
              <div className="admin-listing-gallery" role="list" aria-label={`Photos for ${activeListing.title}`}>
                {activeListing.images.slice(0, 6).map((image, idx) => (
                  <a
                    key={`${activeListing._id}-modal-img-${idx}`}
                    href={resolveMediaUrl(image)}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="listitem"
                  >
                    <img src={resolveMediaUrl(image)} alt={`${activeListing.title} view ${idx + 1}`} loading="lazy" />
                  </a>
                ))}
              </div>
            ) : null}
            <p>{tp('Address:')} {activeListing.address}, {activeListing.city}, {activeListing.state} {activeListing.zipCode}</p>
            <p>{activeListing.bedrooms} {tp('bed')} · {activeListing.bathrooms} {tp('bath')} · {activeListing.squareFeet} {tp('sqft')}</p>
            <p>{activeListing.amenities?.length ? `${tp('Amenities:')} ${activeListing.amenities.join(', ')}` : tp('No amenities listed')}</p>
            <p>{activeListing.description}</p>
            <label htmlFor="listing-new-status">{tp('New Status')}</label>
            <select
              id="listing-new-status"
              value={listingNewStatus}
              onChange={e => setListingNewStatus(e.target.value as 'pending' | 'approved' | 'rejected')}
            >
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
            </select>
            <label htmlFor="listing-review-note">{tp('Review Note')}</label>
            <textarea
              id="listing-review-note"
              rows={3}
              value={listingNote}
              onChange={e => setListingNote(e.target.value)}
              placeholder={tp('Optional note to landlord')}
            />
            {listingActionMsg && <p className="admin-action-msg">{listingActionMsg}</p>}
            <div className="admin-modal-actions">
              <button className="admin-action-btn" onClick={handleListingReview}>{tp('Save')}</button>
              <button className="admin-action-btn admin-action-btn--secondary" onClick={() => setActiveListing(null)}>{tp('Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ROOMMATE REVIEW MODAL */}
      {activeRoommate && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label={tp('Review roommate profile')}>
          <div className="admin-modal">
            <h2>{tp('Review Roommate Profile')}</h2>
            <p>
              <strong>
                {activeRoommate.userId
                  ? `${activeRoommate.userId.firstName} ${activeRoommate.userId.lastName}`
                  : tp('Roommate Profile')}
              </strong>
              {' '}— {activeRoommate.occupation}, {activeRoommate.city}
            </p>
            <label htmlFor="roommate-new-status">{tp('New Status')}</label>
            <select
              id="roommate-new-status"
              value={roommateNewStatus}
              onChange={e => setRoommateNewStatus(e.target.value as 'pending' | 'approved' | 'rejected')}
            >
              <option value="pending">{tp('Pending')}</option>
              <option value="approved">{tp('Approved')}</option>
              <option value="rejected">{tp('Rejected')}</option>
            </select>
            <label htmlFor="roommate-review-note">{tp('Review Note')}</label>
            <textarea
              id="roommate-review-note"
              rows={3}
              value={roommateNote}
              onChange={e => setRoommateNote(e.target.value)}
              placeholder={tp('Optional note to profile owner')}
            />
            {roommateActionMsg && <p className="admin-action-msg">{roommateActionMsg}</p>}
            <div className="admin-modal-actions">
              <button className="admin-action-btn" onClick={handleRoommateReview}>{tp('Save')}</button>
              <button className="admin-action-btn admin-action-btn--secondary" onClick={() => setActiveRoommate(null)}>{tp('Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
