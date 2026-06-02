import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, apiRequest } from '../lib/api';
import { FIXED_TOURING_FEE_RWF, formatMoney } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import '../styles/Forms.css';

interface PropertyModel {
  _id: string;
  landlordId: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: 'apartment' | 'house' | 'condo' | 'room';
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  amenities: string[];
  images: string[];
  availableDate: string;
}

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

interface GalleryItem {
  id: string;
  type: 'existing' | 'new';
  url: string;
  file?: File;
}

const MAX_IMAGES = 8;

const EditProperty: React.FC = () => {
  const { tp } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [messageType, setMessageType] = React.useState<'success' | 'error' | ''>('');
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const newImageUrlsRef = React.useRef<Set<string>>(new Set());

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
  const [gallery, setGallery] = React.useState<GalleryItem[]>([]);

  React.useEffect(() => {
    const loadProperty = async () => {
      if (!id) return;

      try {
        const property = await apiRequest<PropertyModel>(`/api/properties/${id}`, { auth: true });
        const dateValue = property.availableDate ? new Date(property.availableDate).toISOString().slice(0, 10) : '';

        setForm({
          title: property.title,
          description: property.description,
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          propertyType: property.propertyType,
          rent: String(property.rent),
          bedrooms: String(property.bedrooms),
          bathrooms: String(property.bathrooms),
          squareFeet: String(property.squareFeet),
          amenities: property.amenities.join(', '),
          availableDate: dateValue
        });

        setGallery(
          (property.images || []).map((url, index) => ({
            id: `existing-${index}-${url}`,
            type: 'existing',
            url
          }))
        );
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  React.useEffect(() => () => {
    newImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    newImageUrlsRef.current.clear();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const remainingSlots = MAX_IMAGES - gallery.length;
    if (remainingSlots <= 0) {
      setMessageType('error');
      setMessage(`${tp('You can upload up to')} ${MAX_IMAGES} ${tp('images per property.')}`);
      return;
    }

    const trimmedFiles = selected.slice(0, remainingSlots);
    if (selected.length > remainingSlots) {
      setMessageType('error');
      setMessage(`${tp('Only')} ${remainingSlots} ${tp('more image(s) can be added. Maximum is')} ${MAX_IMAGES}.`);
    } else {
      setMessage('');
      setMessageType('');
    }

    const newItems: GalleryItem[] = trimmedFiles.map((file) => {
      const objectUrl = URL.createObjectURL(file);
      newImageUrlsRef.current.add(objectUrl);
      return {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'new',
        url: objectUrl,
        file
      };
    });

    setGallery((prev) => [...prev, ...newItems]);
  };

  const removeImage = (item: GalleryItem) => {
    if (item.type === 'new' && newImageUrlsRef.current.has(item.url)) {
      URL.revokeObjectURL(item.url);
      newImageUrlsRef.current.delete(item.url);
    }

    setGallery((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= gallery.length || to >= gallery.length) return;

    setGallery((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setMessage('');
    setMessageType('');

    try {
      const newItems = gallery.filter((item) => item.type === 'new' && item.file);
      let uploadedUrls: string[] = [];

      if (newItems.length > 0) {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        newItems.forEach((item) => {
          if (item.file) formData.append('images', item.file);
        });

        const uploadRes = await fetch(`${API_BASE_URL}/api/properties/upload-images`, {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          },
          body: formData
        });

        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error((uploadData as { error?: string }).error || 'Failed to upload new images');
        }

        uploadedUrls = ((uploadData as { images?: string[] }).images || []);
      }

      let newUrlCursor = 0;
      const orderedImages = gallery
        .map((item) => {
          if (item.type === 'existing') {
            return item.url;
          }

          const uploaded = uploadedUrls[newUrlCursor];
          newUrlCursor += 1;
          return uploaded;
        })
        .filter(Boolean) as string[];

      await apiRequest(`/api/properties/${id}`, {
        method: 'PUT',
        auth: true,
        body: {
          title: form.title,
          description: form.description,
          address: form.address,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          propertyType: form.propertyType,
          rent: Number(form.rent),
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          squareFeet: Number(form.squareFeet),
          amenities: form.amenities
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          availableDate: form.availableDate,
          images: orderedImages
        }
      });

      setMessageType('success');
      setMessage(tp('Property updated and re-submitted for admin approval. Redirecting...'));
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (error) {
      setMessageType('error');
      setMessage(tp((error as Error).message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    const confirmed = window.confirm(`${tp('Delete this listing?')} ${tp('This cannot be undone.')}`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage('');
    setMessageType('');
    try {
      await apiRequest(`/api/properties/${id}`, {
        method: 'DELETE',
        auth: true
      });
      setMessageType('success');
      setMessage(tp('Property deleted successfully. Redirecting...'));
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (error) {
      setMessageType('error');
      setMessage(tp((error as Error).message || 'Failed to delete property.'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="loading">{tp('Loading property for editing...')}</div>;
  }

  if (!id) {
    return <div className="loading">{tp('Invalid property id.')}</div>;
  }

  return (
    <section className="form-wrap">
      <h1>{tp('Edit Property Listing')}</h1>
      <p>{tp('Update details and manage photo order. Any changes will send the listing back for admin approval.')}</p>

      <form className="modern-form" onSubmit={handleSave}>
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

        <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
        <p className="helper-text">{tp('Drag-and-drop to reorder photos. You can keep, remove, and add images (max 8 total).')}</p>

        {gallery.length > 0 ? (
          <div className="upload-preview-grid">
            {gallery.map((item, index) => (
              <div
                key={item.id}
                className="upload-preview-item"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null) return;
                  moveImage(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <img src={item.url} alt={`Property view ${index + 1}`} />
                <p className="helper-text">{item.type === 'existing' ? tp('Existing image') : tp('New image')}</p>
                <div className="upload-preview-actions">
                  <button type="button" onClick={() => moveImage(index, index - 1)} disabled={index === 0}>{tp('Move Left')}</button>
                  <button type="button" onClick={() => moveImage(index, index + 1)} disabled={index === gallery.length - 1}>{tp('Move Right')}</button>
                  <button type="button" onClick={() => removeImage(item)}>{tp('Remove')}</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-text">{tp('No images selected yet.')}</p>
        )}

        <div className="split-2">
          <button type="submit" disabled={saving}>{saving ? tp('Saving...') : tp('Save And Re-Submit')}</button>
          <Link to="/dashboard" className="secondary-action-link">{tp('Back to Dashboard')}</Link>
        </div>

        <button type="button" className="danger-action-btn" onClick={handleDelete} disabled={deleting || saving}>
          {deleting ? tp('Removing...') : tp('Delete Listing')}
        </button>

        {message && <p className={message.toLowerCase().includes('successfully') ? 'success' : 'error'}>{message}</p>}
        {message && <p className={messageType === 'success' ? 'success' : 'error'}>{message}</p>}
      </form>
    </section>
  );
};

export default EditProperty;
