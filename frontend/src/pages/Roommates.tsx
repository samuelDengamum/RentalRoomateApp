import React from 'react';
import { API_BASE_URL, apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney } from '../lib/propertyFees';
import ImageLightbox from '../components/ImageLightbox';
import ReportModal from '../components/ReportModal';
import { useI18n } from '../lib/useI18n';
import '../styles/Roommates.css';
import '../styles/Forms.css';
import '../styles/Properties.css';

type ImageCategory = 'General' | 'Bedroom' | 'Bathroom' | 'Kitchen' | 'Living Area' | 'Exterior';

interface ImageDetail {
  url: string;
  category: ImageCategory;
}

interface RoommateProfile {
  _id: string;
  bio: string;
  age: number;
  occupation: string;
  moveInDate: string;
  budget: number;
  roomPreference: string;
  description: string;
  images?: string[];
  imageDetails?: ImageDetail[];
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    location: string;
  };
}

interface RoommateListResponse {
  data: RoommateProfile[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

const Roommates: React.FC = () => {
  const { tp } = useI18n();
  const [profiles, setProfiles] = React.useState<RoommateProfile[]>([]);
  const [search, setSearch] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [existingImageDetails, setExistingImageDetails] = React.useState<ImageDetail[]>([]);
  const [newUploads, setNewUploads] = React.useState<Array<{ file: File; category: ImageCategory }>>([]);
  const [lightboxImages, setLightboxImages] = React.useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [reportTarget, setReportTarget] = React.useState<{ userId: string; name: string } | null>(null);
  const [myProfile, setMyProfile] = React.useState({
    bio: '',
    age: '',
    occupation: '',
    moveInDate: '',
    budget: '',
    roomPreference: '',
    description: ''
  });

  const loadProfiles = async (query = '') => {
    const res = await apiRequest<RoommateListResponse>(`/api/roommates?search=${encodeURIComponent(query)}`);
    setProfiles(res.data);
  };

  const loadMyProfile = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const mine = await apiRequest<RoommateProfile>('/api/roommates/me', { auth: true });
      setMyProfile({
        bio: mine.bio || '',
        age: String(mine.age || ''),
        occupation: mine.occupation || '',
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
      // No existing profile yet; that's fine.
    }
  };

  React.useEffect(() => {
    loadProfiles();
    loadMyProfile();
  }, []);

  const submitMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let uploadedImages: string[] = [];
      if (newUploads.length > 0) {
        const token = localStorage.getItem('token');
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
          uploadData = { error: 'Roommate image upload failed.' };
        }

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || 'Roommate image upload failed');
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
      setMessage(tp('Your roommate profile is live.'));
      setNewUploads([]);
      setExistingImageDetails(finalImageDetails);
      loadProfiles(search);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <section className="roommates-wrap">
      <header className="roommates-hero glass">
        <h1>{tp('Find Roommates That Actually Match')}</h1>
        <p>{tp('Search by lifestyle, budget, and move-in timing.')}</p>
      </header>

      <div className="roommates-grid">
        <div className="glass panel">
          <h2>{tp('Create / Update Your Profile')}</h2>
          <form className="modern-form" onSubmit={submitMyProfile}>
            <input placeholder={tp('Short bio')} value={myProfile.bio} onChange={(e) => setMyProfile((p) => ({ ...p, bio: e.target.value }))} required />
            <div className="split-2">
              <input placeholder={tp('Age')} type="number" value={myProfile.age} onChange={(e) => setMyProfile((p) => ({ ...p, age: e.target.value }))} required />
              <input placeholder={tp('Occupation')} value={myProfile.occupation} onChange={(e) => setMyProfile((p) => ({ ...p, occupation: e.target.value }))} required />
            </div>
            <div className="split-2">
              <input placeholder={tp('Budget')} type="number" value={myProfile.budget} onChange={(e) => setMyProfile((p) => ({ ...p, budget: e.target.value }))} required />
              <input type="date" value={myProfile.moveInDate} onChange={(e) => setMyProfile((p) => ({ ...p, moveInDate: e.target.value }))} required />
            </div>
            <input placeholder={tp('Room preference')} value={myProfile.roomPreference} onChange={(e) => setMyProfile((p) => ({ ...p, roomPreference: e.target.value }))} />
            <textarea placeholder={tp('Detailed description')} value={myProfile.description} onChange={(e) => setMyProfile((p) => ({ ...p, description: e.target.value }))} required />

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
                        <option>{tp('General')}</option>
                        <option>{tp('Bedroom')}</option>
                        <option>{tp('Bathroom')}</option>
                        <option>{tp('Kitchen')}</option>
                        <option>{tp('Living Area')}</option>
                        <option>{tp('Exterior')}</option>
                      </select>
                      <button type="button" className="mini-danger" onClick={() => setExistingImageDetails((prev) => prev.filter((_, i) => i !== idx))}>{tp('Remove')}</button>
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
                        <option>{tp('General')}</option>
                        <option>{tp('Bedroom')}</option>
                        <option>{tp('Bathroom')}</option>
                        <option>{tp('Kitchen')}</option>
                        <option>{tp('Living Area')}</option>
                        <option>{tp('Exterior')}</option>
                      </select>
                      <button type="button" className="mini-danger" onClick={() => setNewUploads((prev) => prev.filter((_, i) => i !== idx))}>{tp('Remove')}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit">{tp('Save Profile')}</button>
            {message && <p className={message === tp('Your roommate profile is live.') ? 'success' : 'error'}>{message}</p>}
          </form>
        </div>

        <div className="glass panel">
          <div className="section-heading">
            <h2>{tp('Browse Profiles')}</h2>
          </div>
          <div className="search-row">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tp('Search occupation, lifestyle, or bio')} />
            <button onClick={() => loadProfiles(search)}>{tp('Search')}</button>
          </div>
          <div className="roommate-list">
            {profiles.map((profile) => (
              <article key={profile._id} className="property-listing reveal roommate-property-card">
                {(profile.imageDetails?.length || profile.images?.length) ? (
                  <div className="property-thumb-strip">
                    {(profile.imageDetails?.length ? profile.imageDetails.map((x) => x.url) : profile.images || []).slice(0, 6).map((img, idx) => (
                      <img
                        key={idx}
                        className="property-thumb"
                        src={resolveMediaUrl(img)}
                        alt={`Roommate ${idx + 1}`}
                        onClick={() => {
                          const urls = (profile.imageDetails?.length ? profile.imageDetails.map((x) => x.url) : profile.images || []).map((u) => resolveMediaUrl(u));
                          setLightboxImages(urls);
                          setLightboxIndex(idx);
                        }}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="listing-header">
                  <h3>{profile.userId?.firstName} {profile.userId?.lastName}</h3>
                  <span className="price">{formatMoney(profile.budget)}/mo</span>
                </div>
                <div className="listing-info">
                  <span>{profile.occupation} • {profile.age} {tp('years')}</span>
                  <span className="location">{tp('Move-in:')} {new Date(profile.moveInDate).toLocaleDateString()}</span>
                </div>
                {(profile.imageDetails?.length || profile.images?.length) ? (
                  <>
                    <p className="listing-photo-count">{(profile.imageDetails?.length || profile.images?.length || 0)} photo{(profile.imageDetails?.length || profile.images?.length || 0) > 1 ? 's' : ''}</p>
                    {profile.imageDetails?.length ? (
                      <div className="amenities">
                        {Array.from(new Set(profile.imageDetails.map((item) => item.category))).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
                <p className="description">{profile.description}</p>
                {profile.roomPreference && (
                  <div className="amenities">
                    <span>{profile.roomPreference}</span>
                  </div>
                )}
                {profile.userId?._id && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="report-link-btn"
                      onClick={() => setReportTarget({
                        userId: profile.userId!._id,
                        name: `${profile.userId!.firstName} ${profile.userId!.lastName}`
                      })}
                    >
                      &#9872; {tp('Report user')}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          title={tp('Roommate Photos')}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {reportTarget && (
        <ReportModal
          targetType="user"
          targetId={reportTarget.userId}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </section>
  );
};

export default Roommates;
