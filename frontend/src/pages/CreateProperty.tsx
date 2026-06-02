import React from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, apiRequest } from '../lib/api';
import { FIXED_TOURING_FEE_RWF, formatMoney } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import '../styles/Forms.css';

interface FormState {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: 'apartment' | 'house' | 'condo' | 'room';
  rent: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  amenities: string;
  availableDate: string;
}

const CreateProperty: React.FC = () => {
  const { tp } = useI18n();
  const MAX_IMAGES = 8;
  const navigate = useNavigate();
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | ''>('');
  const [saving, setSaving] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<FormState>({
    title: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'apartment',
    rent: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    amenities: '',
    availableDate: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > MAX_IMAGES) {
      setMessageType('error');
      setMessage(`${tp('You can upload up to')} ${MAX_IMAGES} ${tp('images per property.')}`);
      setFiles(selected.slice(0, MAX_IMAGES));
      return;
    }

    setMessage('');
    setMessageType('');
    setFiles(selected);
  };

  const removeSelectedImage = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= files.length || to >= files.length) return;

    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  React.useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('');

    try {
      let uploadedImages: string[] = [];
      if (files.length > 0) {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        files.forEach((file) => formData.append('images', file));
        const uploadResponse = await fetch(`${API_BASE_URL}/api/properties/upload-images`, {
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
          uploadData = { error: 'Upload failed. Please check backend server logs.' };
        }
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || 'Image upload failed');
        }
        uploadedImages = uploadData.images || [];
      }

      await apiRequest('/api/properties', {
        method: 'POST',
        auth: true,
        body: {
          ...form,
          rent: Number(form.rent),
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          squareFeet: Number(form.squareFeet),
          amenities: form.amenities
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
          images: uploadedImages
        }
      });

      setMessageType('success');
      setMessage(tp('Property submitted successfully. It is now waiting for admin approval. Redirecting...'));
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      setMessageType('error');
      setMessage(tp((error as Error).message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-wrap">
      <h1>{tp('Create Property Listing')}</h1>
      <p>{tp('Submit a complete listing with all the details renters care about. Your listing will stay pending until admin approval.')}</p>
      <form className="modern-form" onSubmit={handleSubmit}>
        <input name="title" placeholder={tp('Listing title')} value={form.title} onChange={handleChange} required />
        <textarea name="description" placeholder={tp('Description')} value={form.description} onChange={handleChange} required />
        <input name="address" placeholder={tp('Address')} value={form.address} onChange={handleChange} required />
        <div className="split-3">
          <input name="city" placeholder={tp('City')} value={form.city} onChange={handleChange} required />
          <input name="state" placeholder={tp('State')} value={form.state} onChange={handleChange} required />
          <input name="zipCode" placeholder={tp('Zip code')} value={form.zipCode} onChange={handleChange} required />
        </div>
        <div className="split-4">
          <select name="propertyType" value={form.propertyType} onChange={handleChange}>
            <option value="apartment">{tp('Apartment')}</option>
            <option value="house">{tp('House')}</option>
            <option value="condo">{tp('Condo')}</option>
            <option value="room">{tp('Room')}</option>
          </select>
          <input name="rent" type="number" placeholder={tp('Rent')} value={form.rent} onChange={handleChange} required />
          <input name="bedrooms" type="number" placeholder={tp('Bedrooms')} value={form.bedrooms} onChange={handleChange} required />
          <input name="bathrooms" type="number" placeholder={tp('Bathrooms')} value={form.bathrooms} onChange={handleChange} required />
        </div>
        <p className="helper-text">{tp('Fixed touring fee for all properties:')} {formatMoney(FIXED_TOURING_FEE_RWF)}.</p>
        <div className="split-2">
          <input name="squareFeet" type="number" placeholder={tp('Square feet')} value={form.squareFeet} onChange={handleChange} required />
          <input name="availableDate" type="date" value={form.availableDate} onChange={handleChange} required />
        </div>
        <input
          name="amenities"
          placeholder={tp('Amenities (comma separated)')}
          value={form.amenities}
          onChange={handleChange}
        />
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
        />
        <p className="helper-text">{tp('Upload up to 8 photos (rooms, bathrooms, kitchen, exterior, etc.).')}</p>
        {files.length > 0 && (
          <>
            <p>{files.length} {tp('image(s) selected for upload')}</p>
            <div className="upload-preview-grid">
              {previewUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="upload-preview-item"
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    moveImage(dragIndex, idx);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <img src={url} alt={`Selected upload ${idx + 1}`} />
                  <div className="upload-preview-actions">
                    <button type="button" onClick={() => moveImage(idx, idx - 1)} disabled={idx === 0}>{tp('Move Left')}</button>
                    <button type="button" onClick={() => moveImage(idx, idx + 1)} disabled={idx === files.length - 1}>{tp('Move Right')}</button>
                    <button type="button" onClick={() => removeSelectedImage(idx)}>{tp('Remove')}</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <button type="submit" disabled={saving}>{saving ? tp('Submitting...') : tp('Submit Listing For Review')}</button>
        {message && <p className={messageType === 'success' ? 'success' : 'error'}>{message}</p>}
      </form>
    </section>
  );
};

export default CreateProperty;
