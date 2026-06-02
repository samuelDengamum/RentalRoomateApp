import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, apiRequest, resolveMediaUrl } from '../lib/api';
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, saveIntlPreferences } from '../lib/international';
import { useI18n } from '../lib/useI18n';
import '../styles/Auth.css';
import '../styles/Forms.css';

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  location: string;
  phone?: string;
  profileImage?: string;
  userType: 'renter' | 'landlord';
  role?: string;
  bio?: string;
  country?: string;
  preferredLanguage?: 'en' | 'fr' | 'ar';
  preferredLocale?: string;
  preferredCurrency?: 'RWF' | 'USD' | 'EUR';
  marketingConsent?: boolean;
}

const Profile: React.FC = () => {
  const { tp } = useI18n();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    location: '',
    country: 'RW',
    phone: '',
    bio: '',
    profileImage: '',
    preferredLanguage: 'en' as 'en' | 'fr' | 'ar',
    preferredLocale: 'en-RW',
    preferredCurrency: 'RWF' as 'RWF' | 'USD' | 'EUR',
    marketingConsent: false
  });
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  const exportData = async () => {
    setFormError('');
    setFeedback('');
    try {
      const payload = await apiRequest<{ exportedAt: string; data: unknown }>('/api/auth/profile/export', { auth: true });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentalhub-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setFeedback(tp('Data export downloaded successfully.'));
    } catch (err) {
      setFormError(tp((err as Error).message || 'Failed to export account data.'));
    }
  };

  const deleteAccount = async () => {
    setFormError('');
    setFeedback('');

    const password = window.prompt(tp('Enter your password to permanently delete your account:'));
    if (!password) return;

    const confirmation = window.prompt(tp('Type DELETE to confirm permanent deletion:'));
    if (!confirmation) return;

    try {
      await apiRequest('/api/auth/profile', {
        method: 'DELETE',
        auth: true,
        body: { password, confirmText: confirmation }
      });

      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    } catch (err) {
      setFormError(tp((err as Error).message || 'Failed to delete account.'));
    }
  };

  const resetFormFromProfile = React.useCallback((user: UserProfile) => {
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      location: user.location || '',
      country: user.country || 'RW',
      phone: user.phone || '',
      bio: user.bio || '',
      profileImage: user.profileImage || '',
      preferredLanguage: user.preferredLanguage || 'en',
      preferredLocale: user.preferredLocale || 'en-RW',
      preferredCurrency: user.preferredCurrency || 'RWF',
      marketingConsent: !!user.marketingConsent
    });
  }, []);

  const loadProfile = React.useCallback(async () => {
    try {
      const data = await apiRequest<UserProfile>('/api/auth/profile', { auth: true });
      setProfile(data);
      resetFormFromProfile(data);
    } catch (err) {
      setLoadError(tp((err as Error).message || 'Could not connect to the server.'));
    } finally {
      setLoading(false);
    }
  }, [resetFormFromProfile, tp]);

  React.useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoadError(tp('Please log in to view your profile.'));
      setLoading(false);
      return;
    }
    loadProfile();
  }, [loadProfile, tp]);

  React.useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImage]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setFormError('');

    try {
      let uploadedProfileImage = form.profileImage;

      if (selectedImage) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error(tp('Your session has expired. Please log in again.'));
        }

        const formData = new FormData();
        formData.append('image', selectedImage);

        const response = await fetch(`${API_BASE_URL}/api/auth/profile/upload-image`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        const raw = await response.text();
        let payload: { error?: string; profileImage?: string } = {};
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = {
            error: raw?.trim()
              ? `Upload failed (${response.status}): ${raw.trim()}`
              : `Upload failed with status ${response.status}`
          };
        }
        if (!response.ok) {
          throw new Error(payload.error || `Failed to upload profile image (${response.status})`);
        }

        uploadedProfileImage = payload.profileImage || uploadedProfileImage;
      }

      const result = await apiRequest<{ user: UserProfile }>('/api/auth/profile', {
        method: 'PUT',
        auth: true,
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          location: form.location,
          country: form.country,
          phone: form.phone,
          bio: form.bio,
          preferredLanguage: form.preferredLanguage,
          preferredLocale: form.preferredLocale,
          preferredCurrency: form.preferredCurrency,
          marketingConsent: form.marketingConsent,
          profileImage: uploadedProfileImage
        }
      });

      setProfile(result.user);
      setForm((prev) => ({ ...prev, profileImage: result.user.profileImage || uploadedProfileImage || '' }));
      saveIntlPreferences({
        language: form.preferredLanguage,
        locale: form.preferredLocale,
        currency: form.preferredCurrency
      });
      window.dispatchEvent(new Event('intl:updated'));
      setSelectedImage(null);
      setFeedback(tp('Profile updated successfully.'));
      setIsEditing(false);
    } catch (err) {
      setFormError(tp((err as Error).message || 'Failed to save profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">{tp('Loading profile...')}</div>;
  }

  if (loadError) {
    return <div className="auth-container"><p className="error">{loadError}</p></div>;
  }

  if (!profile) {
    return <div className="auth-container"><p className="error">{tp('Profile not found.')}</p></div>;
  }

  const displayName = `${form.firstName} ${form.lastName}`.trim() || tp('Your Profile');

  return (
    <div className="profile-modern-page">
      <span className="profile-ambient profile-ambient-one" aria-hidden="true" />
      <span className="profile-ambient profile-ambient-two" aria-hidden="true" />

      <div className="profile-card profile-modern-card">
        <div className="profile-header-modern">
          <div className="profile-image-row profile-image-row-modern">
            {previewUrl ? (
              <img className="profile-avatar" src={previewUrl} alt={tp('Selected profile preview')} />
            ) : form.profileImage ? (
              <img className="profile-avatar" src={resolveMediaUrl(form.profileImage)} alt={tp('Profile')} />
            ) : (
              <span className="profile-avatar profile-avatar-fallback">
                {(form.firstName?.[0] || '') + (form.lastName?.[0] || '') || 'U'}
              </span>
            )}

            <div className="profile-header-meta">
              <p className="profile-overline">{tp('Account Center')}</p>
              <h2>{displayName}</h2>
              <p className="profile-subtitle">{tp('Edit your details anytime and keep your account information up to date.')}</p>
            </div>
          </div>

          <div className="profile-role-pill">{profile.role === 'admin' ? tp('Admin') : profile.userType === 'landlord' ? tp('Landlord') : tp('Renter')}</div>
        </div>

        <div className="profile-quick-info" aria-label={tp('Profile summary')}>
          <span>@{form.username}</span>
          <span>{form.email}</span>
          <span>{form.location || tp('Location not set')}</span>
          <span className={`profile-mode-pill ${isEditing ? 'profile-mode-editing' : 'profile-mode-view'}`}>
            {isEditing ? tp('Editing Mode') : tp('View Mode')}
          </span>
        </div>

        <form className={`modern-form profile-form-modern ${isEditing ? 'profile-form-editing' : 'profile-form-readonly'}`} onSubmit={saveProfile}>
        <div className="split-2">
          <input
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
            placeholder={tp('First name')}
            disabled={!isEditing}
            required
          />
          <input
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            placeholder={tp('Last name')}
            disabled={!isEditing}
            required
          />
        </div>

        <div className="split-2">
          <input
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            placeholder={tp('Username')}
            disabled={!isEditing}
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder={tp('Email')}
            disabled={!isEditing}
            required
          />
        </div>

        <div className="split-2">
          <input
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder={tp('Location')}
            disabled={!isEditing}
            required
          />
          <select
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            disabled={!isEditing}
          >
            <option value="RW">{tp('Rwanda')}</option>
            <option value="KE">{tp('Kenya')}</option>
            <option value="UG">{tp('Uganda')}</option>
            <option value="TZ">{tp('Tanzania')}</option>
            <option value="US">{tp('United States')}</option>
            <option value="FR">{tp('France')}</option>
          </select>
        </div>

        <div className="split-2">
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder={tp('Phone number')}
            disabled={!isEditing}
          />
          <select
            value={form.preferredLanguage}
            onChange={(e) => {
              const selectedLanguage = e.target.value as 'en' | 'fr' | 'ar';
              const matched = LANGUAGE_OPTIONS.find((item) => item.value === selectedLanguage);
              setForm((prev) => ({
                ...prev,
                preferredLanguage: selectedLanguage,
                preferredLocale: matched?.locale || prev.preferredLocale
              }));
            }}
            disabled={!isEditing}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{tp(option.label)}</option>
            ))}
          </select>
        </div>

        <div className="split-2">
          <select
            value={form.preferredCurrency}
            onChange={(e) => setForm((prev) => ({ ...prev, preferredCurrency: e.target.value as 'RWF' | 'USD' | 'EUR' }))}
            disabled={!isEditing}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{tp(option.label)}</option>
            ))}
          </select>
          <label className="profile-checkbox-row">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(e) => setForm((prev) => ({ ...prev, marketingConsent: e.target.checked }))}
              disabled={!isEditing}
            />
            <span>{tp('Receive product updates')}</span>
          </label>
        </div>

        <textarea
          value={form.bio}
          onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
          placeholder={tp('Bio')}
          disabled={!isEditing}
        />

        <div className="profile-upload-wrap">
          <label className="helper-text">{tp('Profile image')}</label>
          <input
            type="file"
            accept="image/*"
            disabled={!isEditing}
            onChange={(e) => setSelectedImage((e.target.files && e.target.files[0]) || null)}
          />
        </div>

          <div className="profile-actions-row">
            <button
              type="button"
              className="profile-edit-btn"
              disabled={isEditing || saving}
              onClick={() => {
                setFeedback('');
                setFormError('');
                setIsEditing(true);
              }}
            >
              {tp('Edit Profile')}
            </button>
            <button type="submit" disabled={!isEditing || saving}>{saving ? tp('Saving...') : tp('Save Profile')}</button>
            <button type="button" className="profile-link-btn" onClick={exportData}>{tp('Export My Data')}</button>
            <button type="button" className="profile-link-btn profile-link-danger" onClick={deleteAccount}>{tp('Delete Account')}</button>
            <Link to="/roommates/profile" className="profile-link-btn profile-link-secondary">{tp('Manage Roommate Profile')}</Link>
          </div>
        </form>

        {feedback ? <p className="success">{feedback}</p> : null}
        {formError ? <p className="error">{formError}</p> : null}
      </div>
    </div>
  );
};

export default Profile;
