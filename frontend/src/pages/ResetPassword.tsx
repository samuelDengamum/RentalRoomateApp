import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';
import { useI18n } from '../lib/useI18n';
import '../styles/Auth.css';

const ResetPassword: React.FC = () => {
  const { t, tp } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | ''>('');
  const [submitting, setSubmitting] = React.useState(false);

  const token = searchParams.get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMessageType('error');
      setMessage(tp('Reset token is missing. Please use the link from your email.'));
      return;
    }

    if (newPassword.length < 6) {
      setMessageType('error');
      setMessage(tp('Password must be at least 6 characters long.'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageType('error');
      setMessage(tp('Passwords do not match.'));
      return;
    }

    setSubmitting(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const rawBody = await response.text();
      let data: { message?: string; error?: string } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = {};
      }

      if (response.ok) {
        setMessageType('success');
        setMessage(tp(data.message || 'Password reset successful. Redirecting to login...'));
        setTimeout(() => navigate('/login'), 1000);
      } else {
        setMessageType('error');
        setMessage(tp(data.error || `Request failed (${response.status}). Please check backend API status.`));
      }
    } catch {
      setMessageType('error');
      setMessage(tp(`Unable to reach API server at ${API_BASE_URL}.`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container login-form-only-page">
      <form className="auth-form login-modern-card" onSubmit={handleSubmit}>
        <p className="login-badge">{tp('Password Recovery')}</p>
        <h2>{t('auth_reset_title')}</h2>
        <p className="login-subtitle">{tp('Set your new account password below.')}</p>

        <input
          type="password"
          placeholder={tp('New password')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder={tp('Confirm new password')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button className="login-submit" type="submit" disabled={submitting}>
          {submitting ? t('common_loading') : t('auth_reset_title')}
        </button>

        {message ? <p className={messageType === 'success' ? 'success' : 'error'}>{message}</p> : null}
        <p className="login-footer-text">{tp('Back to')} <Link to="/login">{tp('login')}</Link></p>
      </form>
    </div>
  );
};

export default ResetPassword;
