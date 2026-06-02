import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';
import { useI18n } from '../lib/useI18n';
import '../styles/Auth.css';

interface LoginProps {
  onAuthSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
  const { t, tp } = useI18n();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | ''>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirect = searchParams.get('redirect') || '/';
  const redirectPath = redirect.startsWith('/') ? redirect : '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        if (data.user?.role) {
          localStorage.setItem('userRole', data.user.role);
        }
        onAuthSuccess();
        setMessageType('success');
        setMessage(tp('Login successful! Redirecting...'));
        setTimeout(() => navigate(redirectPath), 1000);
      } else {
        setMessageType('error');
        setMessage(tp(data.error));
      }
    } catch (error) {
      setMessageType('error');
      setMessage(tp('Login failed'));
    }
  };

  return (
    <div className="auth-container login-form-only-page">
      <form className="auth-form login-modern-card" onSubmit={handleSubmit}>
        <p className="login-badge">{tp('RentalHub Access')}</p>
        <h2>{t('auth_login_title')}</h2>
        <p className="login-subtitle">{tp('Welcome back. Continue with your rental and roommate search.')}</p>
        <input type="email" placeholder={tp('Email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder={tp('Password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="login-footer-text"><Link to="/forgot-password">{tp('Forgot your password?')}</Link></p>
        <button className="login-submit" type="submit">{tp('Sign In')}</button>
        {message && <p className={messageType === 'success' ? 'success' : 'error'}>{message}</p>}
        <p className="login-footer-text">{tp("Don't have an account?")} <Link to="/register">{tp('Register here')}</Link></p>
      </form>
    </div>
  );
};

export default Login;
