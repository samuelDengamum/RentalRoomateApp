import React from 'react';
import { API_BASE_URL, apiRequest, resolveMediaUrl } from '../lib/api';
import '../styles/Roommates.css';
import '../styles/Forms.css';
import { GENDER_OPTIONS, IMAGE_CATEGORY_OPTIONS, ImageCategory, ImageDetail, RoommateProfile } from '../types/roommate';
import { useI18n } from '../lib/useI18n';

const RoommateProfilePage: React.FC = () => {
  const { tp } = useI18n();
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | ''>('');
  const [approvalStatus, setApprovalStatus] = React.useState<'pending' | 'approved' | 'rejected' | ''>('');
  const [reviewNote, setReviewNote] = React.useState('');
  const [existingImageDetails, setExistingImageDetails] = React.useState<ImageDetail[]>([]);
  const [newUploads, setNewUploads] = React.useState<Array<{ file: File; category: ImageCategory }>>([]);
  const [myProfile, setMyProfile] = React.useState({
    bio: '',
    age: '',
    gender: 'Prefer not to say' as RoommateProfile['gender'],
    occupation: '',
    socialStatus: '',
    city: '',
    phone: '',
    moveInDate: '',
    budget: '',
    roomPreference: '',
    description: ''
  });

  const loadMyProfile = async () => {
    try {
      const mine = await apiRequest<RoommateProfile>('/api/roommates/me', { auth: true });
      setApprovalStatus(mine.approvalStatus || '');
      setReviewNote(mine.reviewNote || '');
      setMyProfile({
        bio: mine.bio || '',
        age: String(mine.age || ''),
        gender: mine.gender || 'Prefer not to say',
        occupation: mine.occupation || '',
        socialStatus: mine.socialStatus || '',
        city: mine.city || '',
        phone: mine.phone || '',
        moveInDate: mine.moveInDate ? mine.moveInDate.slice(0, 10) : '',
        budget: String(mine.budget || ''),
        roomPreference: mine.roomPreference || '',
        description: mine.description || ''
      });

      const details = mine.imageDetails?.length
        ? mine.imageDetails
        : (mine.images || []).map((url) => ({ url, category: 'General' as ImageCategory }));

      setExistingImageDetails(details as ImageDetail[]);
    } catch {
      // No existing profile yet.
    }
  };

  React.useEffect(() => {
    loadMyProfile();
  }, []);

  const submitMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let uploadedImages: string[] = [];
      if (newUploads.length > 0) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error(tp('Your session has expired. Please log in again.'));
        }
        const formData = new FormData();
        newUploads.forEach((entry) => formData.append('images', entry.file));

        const uploadResponse = await fetch(`${API_BASE_URL}/api/roommates/upload-images`, {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          },
          body: formData
        });

        const uploadText = await uploadResponse.text();
        let uploadData: { images?: string[]; error?: string } = {};
        try {
          uploadData = JSON.parse(uploadText);
        } catch {
          uploadData = {
            error: uploadText?.trim()
              ? `Upload failed (${uploadResponse.status}): ${uploadText.trim()}`
              : `Upload failed with status ${uploadResponse.status}`
          };
        }

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || `Roommate image upload failed (${uploadResponse.status})`);
        }
        uploadedImages = uploadData.images || [];
      }

      const uploadedImageDetails: ImageDetail[] = uploadedImages.map((url, idx) => ({
        url,
        category: newUploads[idx]?.category || 'General'
      }));

      const finalImageDetails = [...existingImageDetails, ...uploadedImageDetails];

      await apiRequest('/api/roommates/me', {
        method: 'POST',
        auth: true,
        body: {
          ...myProfile,
          age: Number(myProfile.age),
          budget: Number(myProfile.budget),
          images: finalImageDetails.map((item) => item.url),
          imageDetails: finalImageDetails
        }
      });

      setApprovalStatus('pending');
      setReviewNote('');
      setMessageType('success');
      setMessage(tp('Your roommate profile was saved and submitted for admin review.'));
      setNewUploads([]);
      setExistingImageDetails(finalImageDetails);
    } catch (error) {
      setMessageType('error');
      setMessage(tp((error as Error).message));
    }
  };

  return (
    <section className="roommates-wrap">
      <header className="roommates-hero glass">
        <h1>{tp('My Roommate Profile')}</h1>
        <p>{tp('Update your details anytime and keep your photos current.')}</p>
        {approvalStatus ? (
          <div className="roommate-approval-box">
            <span className={`roommate-approval-pill roommate-approval-pill--${approvalStatus}`}>
              {tp(approvalStatus.toUpperCase())}
            </span>
            {reviewNote ? <p>{tp('Admin note:')} {reviewNote}</p> : null}
          </div>
        ) : null}
      </header>

      <div className="glass panel roommate-profile-panel">
        <form className="modern-form roommate-profile-form" onSubmit={submitMyProfile}>
          <input
            placeholder={tp('Short bio')}
            value={myProfile.bio}
            onChange={(e) => setMyProfile((p) => ({ ...p, bio: e.target.value }))}
            required
          />

          <div className="split-2">
            <input
              placeholder={tp('Age')}
              type="number"
              value={myProfile.age}
              onChange={(e) => setMyProfile((p) => ({ ...p, age: e.target.value }))}
              required
            />
            <select
              value={myProfile.gender}
              onChange={(e) => setMyProfile((p) => ({ ...p, gender: e.target.value as RoommateProfile['gender'] }))}
              required
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>{tp(option)}</option>
              ))}
            </select>
          </div>

          <div className="split-2">
            <input
              placeholder={tp('Occupation')}
              value={myProfile.occupation}
              onChange={(e) => setMyProfile((p) => ({ ...p, occupation: e.target.value }))}
              required
            />
            <input
              placeholder={tp('Social status (Student, Professional, etc.)')}
              value={myProfile.socialStatus}
              onChange={(e) => setMyProfile((p) => ({ ...p, socialStatus: e.target.value }))}
              required
            />
          </div>

          <div className="split-2">
            <input
              placeholder={tp('City')}
              value={myProfile.city}
              onChange={(e) => setMyProfile((p) => ({ ...p, city: e.target.value }))}
              required
            />
            <input
              placeholder={tp('Phone number')}
              value={myProfile.phone}
              onChange={(e) => setMyProfile((p) => ({ ...p, phone: e.target.value }))}
              required
            />
          </div>

          <div className="split-2">
            <input
              placeholder={tp('Budget')}
              type="number"
              value={myProfile.budget}
              onChange={(e) => setMyProfile((p) => ({ ...p, budget: e.target.value }))}
              required
            />
            <input
              type="date"
              value={myProfile.moveInDate}
              onChange={(e) => setMyProfile((p) => ({ ...p, moveInDate: e.target.value }))}
              required
            />
          </div>

          <input
            placeholder={tp('Room preference')}
            value={myProfile.roomPreference}
            onChange={(e) => setMyProfile((p) => ({ ...p, roomPreference: e.target.value }))}
          />
          <textarea
            placeholder={tp('Detailed description')}
            value={myProfile.description}
            onChange={(e) => setMyProfile((p) => ({ ...p, description: e.target.value }))}
            required
          />

          <div className="image-manager">
            <h4>{tp('Existing Photos')}</h4>
            {existingImageDetails.length === 0 ? (
              <p className="muted">{tp('No photos yet')}</p>
            ) : (
              <div className="image-manager-list">
                {existingImageDetails.map((item, idx) => (
                  <div key={`${item.url}-${idx}`} className="image-row">
                    <img src={resolveMediaUrl(item.url)} alt={`Existing ${idx + 1}`} />
                    <select
                      value={item.category}
                      onChange={(e) => {
                        const category = e.target.value as ImageCategory;
                        setExistingImageDetails((prev) => prev.map((it, i) => (i === idx ? { ...it, category } : it)));
                      }}
                    >
                      {IMAGE_CATEGORY_OPTIONS.map((option) => (
                        <option key={option}>{tp(option)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="mini-danger"
                      onClick={() => setExistingImageDetails((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      {tp('Remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h4>{tp('Add New Photos')}</h4>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const selected = Array.from(e.target.files || []).map((file) => ({
                  file,
                  category: 'General' as ImageCategory
                }));
                setNewUploads((prev) => [...prev, ...selected]);
              }}
            />

            {newUploads.length > 0 && (
              <div className="image-manager-list">
                {newUploads.map((entry, idx) => (
                  <div key={`${entry.file.name}-${idx}`} className="image-row">
                    <span className="file-name">{entry.file.name}</span>
                    <select
                      value={entry.category}
                      onChange={(e) => {
                        const category = e.target.value as ImageCategory;
                        setNewUploads((prev) => prev.map((it, i) => (i === idx ? { ...it, category } : it)));
                      }}
                    >
                      {IMAGE_CATEGORY_OPTIONS.map((option) => (
                        <option key={option}>{tp(option)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="mini-danger"
                      onClick={() => setNewUploads((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      {tp('Remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="roommate-btn save-profile-btn">{tp('Save Profile')}</button>
          {message && <p className={message.includes('saved') ? 'success' : 'error'}>{message}</p>}
          {message && <p className={messageType === 'success' ? 'success' : 'error'}>{message}</p>}
        </form>
      </div>
    </section>
  );
};

export default RoommateProfilePage;
