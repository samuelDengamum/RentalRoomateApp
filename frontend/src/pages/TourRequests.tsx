import React from 'react';
import { apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney, getTouringFee } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import '../styles/Operations.css';

interface Profile {
  _id: string;
  firstName: string;
  userType: 'renter' | 'landlord';
}

interface TourRequestRecord {
  _id: string;
  requesterName: string;
  senderEmail: string;
  phone: string;
  subject: string;
  message: string;
  tourDate?: string;
  tourTime?: string;
  paymentMethod: string;
  paymentReference?: string;
  paymentProofUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reviewerNote?: string;
  reviewedAt?: string;
  createdAt: string;
  propertyId: {
    _id: string;
    title: string;
    city: string;
    state: string;
    rent: number;
    touringFee?: number;
    images?: string[];
  };
  renterId?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  landlordId?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

const statusToneMap: Record<TourRequestRecord['status'], string> = {
  pending: 'tone-pending',
  approved: 'tone-approved',
  rejected: 'tone-rejected',
  completed: 'tone-completed',
  cancelled: 'tone-neutral'
};

const TourRequests: React.FC = () => {
  const { tp } = useI18n();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [myRequests, setMyRequests] = React.useState<TourRequestRecord[]>([]);
  const [incomingRequests, setIncomingRequests] = React.useState<TourRequestRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'mine' | 'incoming'>('mine');
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState('');

  const loadData = React.useCallback(async () => {
    const profileData = await apiRequest<Profile>('/api/auth/profile', { auth: true });
    setProfile(profileData);

    const mine = await apiRequest<TourRequestRecord[]>('/api/tour-requests/mine', { auth: true });
    setMyRequests(mine);

    if (profileData.userType === 'landlord') {
      const incoming = await apiRequest<TourRequestRecord[]>('/api/tour-requests/incoming', { auth: true });
      setIncomingRequests(incoming);
      setActiveTab('incoming');
    } else {
      setActiveTab('mine');
    }
  }, []);

  React.useEffect(() => {
    loadData()
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [loadData]);

  const updateStatus = async (requestId: string, status: TourRequestRecord['status']) => {
    setBusyId(requestId);
    try {
      await apiRequest<{ tourRequest: TourRequestRecord }>(`/api/tour-requests/${requestId}/status`, {
        method: 'PUT',
        auth: true,
        body: { status, reviewerNote: notes[requestId] || '' }
      });

      await loadData();
      window.dispatchEvent(new Event('notifications:updated'));
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return <div className="loading">{tp('Loading...')}</div>;
  }

  const items = activeTab === 'incoming' ? incomingRequests : myRequests;

  return (
    <section className="operations-page">
      <header className="operations-header glass">
        <div>
          <p className="operations-kicker">{tp('Tour Workflow')}</p>
          <h1>{tp('Tour Requests')}</h1>
          <p>{tp('Manage manual proof-based viewing requests entirely inside the app.')}</p>
        </div>
        <div className="operations-tab-row" role="tablist" aria-label={tp('Tour request views')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mine'}
            className={`operations-tab ${activeTab === 'mine' ? 'operations-tab-active' : ''}`}
            onClick={() => setActiveTab('mine')}
          >
              {tp('My Requests')} ({myRequests.length})
          </button>
          {profile?.userType === 'landlord' ? (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'incoming'}
              className={`operations-tab ${activeTab === 'incoming' ? 'operations-tab-active' : ''}`}
              onClick={() => setActiveTab('incoming')}
            >
              {tp('Incoming')} ({incomingRequests.length})
            </button>
          ) : null}
        </div>
      </header>

      <div className="operations-grid">
        {items.length === 0 ? (
          <div className="operations-empty-state glass">
            <h2>{tp('No tour requests yet')}</h2>
            <p>
              {activeTab === 'incoming'
                ? tp('Incoming viewing requests will appear here after renters submit proof and scheduling details.')
                : tp('Submit a tour request from any property details page to start tracking it here.')}
            </p>
          </div>
        ) : items.map((request) => (
          <article key={request._id} className="operations-card glass">
            <div className="operations-card-head">
              <div>
                <p className="operations-card-kicker">{request.propertyId.title}</p>
                <h2>{request.requesterName}</h2>
                <p>{request.propertyId.city}, {request.propertyId.state}</p>
              </div>
              <span className={`operations-status-pill ${statusToneMap[request.status]}`}>{request.status}</span>
            </div>

            <div className="operations-card-body">
              <div className="operations-property-row">
                {request.propertyId.images?.[0] ? (
                  <img src={resolveMediaUrl(request.propertyId.images[0])} alt={request.propertyId.title} className="operations-property-thumb" />
                ) : null}
                <div>
                  <p><strong>{tp('Rent:')}</strong> {formatMoney(request.propertyId.rent)}{tp('/month')}</p>
                  <p><strong>{tp('Touring fee:')}</strong> {formatMoney(getTouringFee(request.propertyId.touringFee))}</p>
                  <p><strong>{tp('Submitted:')}</strong> {new Date(request.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="operations-meta-grid">
                <p><strong>{tp('Email:')}</strong> {request.senderEmail}</p>
                <p><strong>{tp('Phone:')}</strong> {request.phone}</p>
                <p><strong>{tp('Date:')}</strong> {request.tourDate || tp('Flexible')}</p>
                <p><strong>{tp('Time:')}</strong> {request.tourTime || tp('Flexible')}</p>
                <p><strong>{tp('Payment:')}</strong> {request.paymentMethod.replace(/_/g, ' ')}</p>
                <p><strong>{tp('Reference:')}</strong> {request.paymentReference || tp('Not provided')}</p>
              </div>

              <div className="operations-message-box">
                <strong>{request.subject}</strong>
                <p>{request.message}</p>
              </div>

              <div className="operations-proof-row">
                <a href={resolveMediaUrl(request.paymentProofUrl)} target="_blank" rel="noreferrer" className="soft-btn">
                  {tp('View Payment Proof')}
                </a>
                {request.reviewedAt ? (
                  <small>{tp('Last reviewed')} {new Date(request.reviewedAt).toLocaleString()}</small>
                ) : (
                  <small>{tp('Awaiting review')}</small>
                )}
              </div>

              {request.reviewerNote ? (
                <div className="operations-note-box">
                  <strong>{tp('Review note')}</strong>
                  <p>{request.reviewerNote}</p>
                </div>
              ) : null}

              {activeTab === 'incoming' ? (
                <div className="operations-review-panel">
                  <textarea
                    value={notes[request._id] || request.reviewerNote || ''}
                    onChange={(event) => setNotes((prev) => ({ ...prev, [request._id]: event.target.value }))}
                    placeholder={tp('Add a note for the renter before updating status')}
                  />
                  <div className="operations-action-row">
                    <button type="button" className="soft-btn" disabled={busyId === request._id} onClick={() => updateStatus(request._id, 'approved')}>
                      {busyId === request._id ? tp('Updating...') : tp('Approve')}
                    </button>
                    <button type="button" className="soft-btn alt" disabled={busyId === request._id} onClick={() => updateStatus(request._id, 'rejected')}>
                      {tp('Reject')}
                    </button>
                    <button type="button" className="soft-btn" disabled={busyId === request._id} onClick={() => updateStatus(request._id, 'completed')}>
                      {tp('Mark Completed')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default TourRequests;