import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';
import { useI18n } from '../lib/useI18n';
import '../styles/Auth.css';

const ForgotPassword: React.FC = () => {
  const { t, tp } = useI18n();
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | ''>('');
  const [resetUrl, setResetUrl] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setMessageType('');
    setResetUrl('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const rawBody = await response.text();
      let data: { message?: string; error?: string; resetUrl?: string } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = {};
      }

      if (response.ok) {
        setMessageType('success');
        setMessage(tp(data.message || 'If that email exists, a reset link has been sent.'));
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
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
        <h2>{t('auth_forgot_title')}</h2>
        <p className="login-subtitle">{tp('Enter your account email and we will send you a reset link.')}</p>

        <input
          type="email"
          placeholder={tp('Your email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button className="login-submit" type="submit" disabled={submitting}>
          {submitting ? t('common_loading') : tp('Send Reset Link')}
        </button>

        {message ? <p className={messageType === 'error' ? 'error' : 'success'}>{message}</p> : null}
        {resetUrl ? (
          <p className="helper-text">
            {tp('Development reset link:')} <a href={resetUrl}>{resetUrl}</a>
          </p>
        ) : null}
        <p className="login-footer-text">{tp('Remember your password?')} <Link to="/login">{tp('Back to login')}</Link></p>
      </form>
    </div>
  );
};

export default ForgotPassword;
