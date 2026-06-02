import React from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/useI18n';

interface ReportModalProps {
  targetType: 'user' | 'property';
  targetId: string;
  targetName: string;
  onClose: () => void;
}

const REASONS = [
  { value: 'spam', label: 'Spam or unsolicited content' },
  { value: 'inappropriate', label: 'Inappropriate or offensive' },
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'harassment', label: 'Harassment or threats' },
  { value: 'misleading', label: 'Misleading information' },
  { value: 'other', label: 'Other' }
];

const ReportModal: React.FC<ReportModalProps> = ({ targetType, targetId, targetName, onClose }) => {
  const { tp } = useI18n();
  const [reason, setReason] = React.useState('');
  const [details, setDetails] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  const isLoggedIn = !!localStorage.getItem('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setErrorMsg(tp('Please select a reason.'));
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await apiRequest('/api/reports', {
        method: 'POST',
        auth: true,
        body: { targetType, targetId, reason, details }
      });
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? tp(err.message) : tp('Failed to submit report'));
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="admin-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={tp(`Report ${targetType}`)}
      onClick={handleOverlayClick}
    >
      <div className="admin-modal report-modal">
        {!isLoggedIn ? (
          <>
            <h2>{tp('Login Required')}</h2>
            <p>{tp('You need to be logged in to report')} {targetType === 'user' ? tp('a user') : tp('a listing')}.</p>
            <div className="admin-modal-actions">
              <Link to="/login" className="admin-action-btn" onClick={onClose}>{tp('Log In')}</Link>
              <button className="admin-action-btn admin-action-btn--secondary" onClick={onClose}>{tp('Cancel')}</button>
            </div>
          </>
        ) : status === 'success' ? (
          <>
            <h2>{tp('Report Submitted')}</h2>
            <p>{tp('Thank you. Our moderation team will review your report about')} <strong>{targetName}</strong>.</p>
            <button className="admin-action-btn" onClick={onClose}>{tp('Close')}</button>
          </>
        ) : (
          <>
            <h2>{tp('Report')} {targetType === 'user' ? tp('User') : tp('Listing')}</h2>
            <p className="report-modal-target">{tp('Reporting:')} <strong>{targetName}</strong></p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="report-reason">{tp('Reason *')}</label>
              <select
                id="report-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              >
                <option value="">{tp('Select a reason…')}</option>
                {REASONS.map(r => (
                  <option key={r.value} value={r.value}>{tp(r.label)}</option>
                ))}
              </select>

              <label htmlFor="report-details">{tp('Additional details (optional)')}</label>
              <textarea
                id="report-details"
                rows={3}
                value={details}
                onChange={e => setDetails(e.target.value.slice(0, 1000))}
                placeholder={tp('Describe the issue…')}
                maxLength={1000}
              />

              {errorMsg && <p className="admin-action-msg error">{errorMsg}</p>}

              <div className="admin-modal-actions">
                <button
                  type="submit"
                  className="admin-action-btn admin-action-btn--danger"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? tp('Submitting…') : tp('Submit Report')}
                </button>
                <button
                  type="button"
                  className="admin-action-btn admin-action-btn--secondary"
                  onClick={onClose}
                >
                  {tp('Cancel')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
