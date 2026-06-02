import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/useI18n';
import '../styles/Auth.css';

interface RegisterProps {
  onAuthSuccess: () => void;
}

const Register: React.FC<RegisterProps> = ({ onAuthSuccess }) => {
  const { t, tp } = useI18n();
  const [formData, setFormData] = React.useState({
    username: '',
    email: '',
    password: '',
    userType: 'renter',
    location: '',
    country: 'RW',
    preferredLanguage: 'en',
    preferredLocale: 'en-RW',
    preferredCurrency: 'RWF',
    marketingConsent: false,
    acceptTerms: false,
    consentVersion: '2026-03'
  });

  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | ''>('');
  const navigate = useNavigate();

  interface RegisterResponse {
    token: string;
    user?: { role?: string };
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === 'preferredLanguage') {
      const locale = value === 'fr' ? 'fr-RW' : value === 'ar' ? 'ar-SA' : 'en-RW';
      setFormData(prev => ({ ...prev, preferredLanguage: value, preferredLocale: locale }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiRequest<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: formData
      });

      setMessageType('success');
      setMessage(tp('Registration successful! Redirecting...'));
      localStorage.setItem('token', data.token);
      if (data.user?.role) {
        localStorage.setItem('userRole', data.user.role);
      }
      // Flag a first-time tour for the new user
      localStorage.setItem('showOnboardingTour', 'true');
      localStorage.setItem('onboardingUserType', formData.userType);
      onAuthSuccess();
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      setMessageType('error');
      setMessage(tp((error as Error)?.message || 'Registration failed'));
    }
  };

  return (
    <div className="auth-container login-form-only-page">
      <form className="auth-form login-modern-card" onSubmit={handleSubmit}>
        <p className="login-badge">{tp('RentalHub Access')}</p>
        <h2>{t('auth_register_title')}</h2>
        <p className="login-subtitle">{tp('Create your profile to find rentals, roommates, and trusted matches.')}</p>
        <input type="text" name="username" placeholder={tp('Username')} value={formData.username} onChange={handleChange} required />
        <input type="email" name="email" placeholder={tp('Email')} value={formData.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder={tp('Password')} value={formData.password} onChange={handleChange} required />
        <input type="text" name="location" placeholder={tp('Location')} value={formData.location} onChange={handleChange} required />
        <div className="split-2">
          <select name="country" value={formData.country} onChange={handleChange}>
            <option value="RW">{tp('Rwanda')}</option>
            <option value="KE">{tp('Kenya')}</option>
            <option value="UG">{tp('Uganda')}</option>
            <option value="TZ">{tp('Tanzania')}</option>
            <option value="US">{tp('United States')}</option>
            <option value="FR">{tp('France')}</option>
          </select>
          <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange}>
            <option value="en">{tp('English')}</option>
            <option value="fr">{tp('Francais')}</option>
            <option value="ar">{tp('Arabic (Saudi)')}</option>
          </select>
        </div>

        <select name="preferredCurrency" value={formData.preferredCurrency} onChange={handleChange}>
          <option value="RWF">{tp('RWF (Rwandan Franc)')}</option>
          <option value="USD">{tp('USD (US Dollar)')}</option>
          <option value="EUR">{tp('EUR (Euro)')}</option>
        </select>

        <select name="userType" value={formData.userType} onChange={handleChange}>
          <option value="renter">{tp("I'm Looking for a Place")}</option>
          <option value="landlord">{tp("I'm Listing Properties")}</option>
        </select>

        <label className="auth-checkbox-row">
          <input type="checkbox" name="marketingConsent" checked={formData.marketingConsent} onChange={handleChange} />
          <span>{tp('I agree to receive product updates and service emails.')}</span>
        </label>

        <label className="auth-checkbox-row">
          <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} required />
          <span>
            {tp('I agree to the')} <Link to="/terms">{tp('Terms')}</Link> {tp('and')} <Link to="/privacy">{tp('Privacy Policy')}</Link>.
          </span>
        </label>

        <button className="login-submit" type="submit">{tp('Create Account')}</button>
        {message && <p className={messageType === 'success' ? 'success' : 'error'}>{message}</p>}
        <p className="login-footer-text">{tp('Already have an account?')} <Link to="/login">{tp('Login here')}</Link></p>
      </form>
    </div>
  );
};

export default Register;
