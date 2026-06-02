import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { formatMoney, getTouringFee } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import '../styles/Dashboard.css';

interface Profile {
  _id: string;
  firstName: string;
  lastName: string;
  userType: 'renter' | 'landlord';
  role?: string;
  landlordSubscription?: {
    status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'expired';
    planMonths: number;
    paymentProofUrl?: string;
    paymentReference?: string;
    submittedAt?: string;
    reviewedAt?: string;
    reviewNote?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
  };
}

interface NotificationCountResponse {
  unreadCount: number;
}

interface TourRequestSummary {
  _id: string;
}

interface Property {
  _id: string;
  title: string;
  city: string;
  rent: number;
  touringFee?: number;
  available: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
}

const Dashboard: React.FC = () => {
  const { t, tp } = useI18n();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [myProperties, setMyProperties] = React.useState<Property[]>([]);
  const [favoriteCount, setFavoriteCount] = React.useState(0);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [tourRequestCount, setTourRequestCount] = React.useState(0);
  const [listingActionMessage, setListingActionMessage] = React.useState('');
  const [listingActionTone, setListingActionTone] = React.useState<'success' | 'error' | ''>('');


  React.useEffect(() => {
    const bootstrap = async () => {
      try {
        const profileData = await apiRequest<Profile>('/api/auth/profile', { auth: true });
        setProfile(profileData);

        // Keep localStorage role in sync (handles case where user was promoted since last login)
        if (profileData.role) {
          localStorage.setItem('userRole', profileData.role);
        }

        const [favorites, notificationData] = await Promise.all([
          apiRequest<Property[]>('/api/auth/favorites', { auth: true }),
          apiRequest<NotificationCountResponse>('/api/notifications/unread-count', { auth: true })
        ]);
        setFavoriteCount(favorites.length);
        setUnreadNotifications(notificationData.unreadCount || 0);

        if (profileData.userType === 'landlord') {
          const [props, incomingRequests] = await Promise.all([
            apiRequest<Property[]>('/api/properties/user/my-properties', { auth: true }),
            apiRequest<TourRequestSummary[]>('/api/tour-requests/incoming', { auth: true })
          ]);
          setMyProperties(props);
          setTourRequestCount(incomingRequests.length);
        } else {
          const myRequests = await apiRequest<TourRequestSummary[]>('/api/tour-requests/mine', { auth: true });
          setTourRequestCount(myRequests.length);
        }
      } catch (error) {
        console.error(error);
      }
    };

    bootstrap();
  }, []);

  const handleDeleteProperty = async (propertyId: string, propertyTitle: string) => {
    const confirmed = window.confirm(`${tp('Delete')} "${propertyTitle}"? ${tp('This cannot be undone.')}`);
    if (!confirmed) {
      return;
    }

    setListingActionMessage('');
    setListingActionTone('');
    try {
      await apiRequest(`/api/properties/${propertyId}`, {
        method: 'DELETE',
        auth: true
      });
      setMyProperties((prev) => prev.filter((property) => property._id !== propertyId));
      setListingActionTone('success');
      setListingActionMessage(tp('Listing removed successfully.'));
    } catch (error) {
      setListingActionTone('error');
      setListingActionMessage(tp((error as Error).message || 'Failed to remove listing.'));
    }
  };

  const subscriptionStatus = profile?.landlordSubscription?.status || 'not_submitted';
  const canManageListings = subscriptionStatus === 'approved';

  if (!profile) {
    return <div className="loading">{t('common_loading')}</div>;
  }

  return (
    <section className="dashboard-wrap">
      <header className="dashboard-header">
        <h1>{t('dashboard_welcome')}, {profile.firstName}</h1>
        <p>{t('dashboard_manage')}</p>
      </header>

      <div className="dashboard-grid">
        <article className="dashboard-card glass">
          <h3>{tp('Favorites')}</h3>
          <p>{favoriteCount} {tp('saved properties')}</p>
          <div className="dash-actions">
            <Link to="/favorites" className="soft-btn">{tp('View Favorites')}</Link>
            {profile.userType === 'renter' ? (
              <Link to="/properties" className="soft-btn">{tp('Browse Properties')}</Link>
            ) : null}
          </div>
        </article>

        <article className="dashboard-card glass">
          <h3>{tp('Roommate Hub')}</h3>
          <p>{tp('Discover people who match your budget and move-in plan.')}</p>
          <div className="dash-actions">
            <Link to="/roommates" className="soft-btn">{tp('Browse Roommates')}</Link>
            <Link to="/roommates/profile" className="soft-btn">{tp('My Roommate Profile')}</Link>
          </div>
        </article>

        <article className="dashboard-card glass">
          <h3>{profile.userType === 'landlord' ? tp('Incoming Tours') : tp('My Tour Requests')}</h3>
          <p>{tourRequestCount} {tp(tourRequestCount === 1 ? 'active request' : 'active requests')}</p>
          <div className="dash-actions">
            <Link to="/tour-requests" className="soft-btn">{tp('Open Tour Requests')}</Link>
            <Link to="/notifications" className="soft-btn">{unreadNotifications} {tp('unread notifications')}</Link>
          </div>
        </article>

        {profile.userType === 'landlord' && (
          <article className="dashboard-card glass">
            <h3>{tp('Your Listings')}</h3>
            <p>{myProperties.length} {tp('properties posted')}</p>
            {canManageListings ? (
              <Link to="/create-property" className="soft-btn">{tp('Post New Listing')}</Link>
            ) : (
              <p className="dash-subscription-warning">{tp('Subscription approval required before posting listings.')}</p>
            )}
          </article>
        )}
      </div>

      {profile.userType === 'landlord' && (
        <section className="recent-listings glass">
          <div className="section-heading">
            <h2>{tp('Subscription')}</h2>
            <Link to="/pricing" className="soft-btn">{tp('View Plans')}</Link>
          </div>

          <div className="dash-sub-status-row">
            <span className={`dash-status dash-status--${subscriptionStatus}`}>
              {tp(subscriptionStatus.toUpperCase())}
            </span>
            {profile.landlordSubscription?.currentPeriodEnd ? (
              <span className="dash-sub-expiry">
                {tp('Active until:')} {new Date(profile.landlordSubscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          {profile.landlordSubscription?.reviewNote ? (
            <p className="dash-sub-note">{tp('Admin note:')} {profile.landlordSubscription.reviewNote}</p>
          ) : null}

          {subscriptionStatus === 'not_submitted' || subscriptionStatus === 'rejected' || subscriptionStatus === 'expired' ? (
            <p className="dash-subscription-warning">
              {tp('Subscription approval required before posting listings.')}{' '}
              <Link to="/pricing" className="dash-sub-cta-link">{tp('Choose a plan →')}</Link>
            </p>
          ) : subscriptionStatus === 'pending' ? (
            <p className="dash-sub-pending-note">{tp('Your proof is under review. We will notify you once approved.')}</p>
          ) : null}
        </section>
      )}

      {profile.userType === 'landlord' && (
        <section className="recent-listings glass">
          <div className="section-heading">
            <h2>{tp('Recent Listings')}</h2>
            {canManageListings ? <Link to="/create-property" className="soft-btn">{tp('Add Listing')}</Link> : null}
          </div>
          {listingActionMessage ? <p className={listingActionTone === 'success' ? 'success' : 'error'}>{listingActionMessage}</p> : null}
          {myProperties.length === 0 ? (
            <p>{tp('You have not listed any property yet.')}</p>
          ) : (
            <div className="dash-list">
              {myProperties.slice(0, 5).map((property) => (
                <div key={property._id} className="dash-row">
                  <div>
                    <h4>{property.title}</h4>
                    <p>{property.city}</p>
                    <p>
                      <span className={`dash-status dash-status--${property.approvalStatus || 'approved'}`}>
                        {tp((property.approvalStatus || 'approved').toUpperCase())}
                      </span>
                    </p>
                    {property.reviewNote ? <p>{tp('Note:')} {property.reviewNote}</p> : null}
                    <div className="dash-row-actions">
                      {canManageListings ? (
                        <Link to={`/properties/${property._id}/edit`} className="tiny-link-btn">{tp('Edit Listing')}</Link>
                      ) : null}
                      <button
                        type="button"
                        className="tiny-link-btn tiny-link-btn--danger"
                        onClick={() => handleDeleteProperty(property._id, property.title)}
                      >
                        {tp('Remove Listing')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <strong>{formatMoney(property.rent)}{t('per_month')}</strong>
                    <p>{tp('Touring fee:')} {formatMoney(getTouringFee(property.touringFee))}</p>
                    <p>{property.available ? tp('Available') : tp('Occupied')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
};

export default Dashboard;
