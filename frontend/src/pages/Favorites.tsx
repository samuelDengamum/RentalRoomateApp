import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney, getTouringFee } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import '../styles/Properties.css';

interface Property {
  _id: string;
  title: string;
  description: string;
  rent: number;
  touringFee?: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  city: string;
  state: string;
  images?: string[];
}

const Favorites: React.FC = () => {
  const { t, tp } = useI18n();
  const navigate = useNavigate();
  const [favorites, setFavorites] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadFavorites = async () => {
    try {
      const data = await apiRequest<Property[]>('/api/auth/favorites', { auth: true });
      setFavorites(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (propertyId: string) => {
    await apiRequest(`/api/auth/favorites/${propertyId}`, { method: 'POST', auth: true });
    setFavorites((prev) => prev.filter((p) => p._id !== propertyId));
  };

  if (loading) return <div className="loading">{tp('Loading favorites...')}</div>;

  return (
    <section className="properties-page">
      <div className="section-heading">
        <h1>{tp('Saved Favorites')}</h1>
      </div>
      <div className="properties-list">
        {favorites.length === 0 ? (
          <p>{tp('No favorites yet. Save listings from the Properties page.')}</p>
        ) : (
          favorites.map((property) => {
            const localizedTitle = tp(property.title);
            return (
            <article
              key={property._id}
              className="property-listing reveal"
              role="button"
              tabIndex={0}
              aria-label={`${tp('Open details for')} ${localizedTitle}`}
              onClick={() => navigate(`/properties/${property._id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/properties/${property._id}`);
                }
              }}
            >
              {property.images?.[0] && (
                <img className="property-thumb" src={resolveMediaUrl(property.images[0])} alt={localizedTitle} />
              )}
              <div className="listing-header">
                <h3>{localizedTitle}</h3>
                <span className="price">{formatMoney(property.rent)}{t('per_month')}</span>
              </div>
              <p className="description">{t('touring_fee_prefix')} {formatMoney(getTouringFee(property.touringFee))} {t('fixed_suffix')}</p>
              <p className="description">{property.description}</p>
              <div className="listing-info">
                <span>
                  {property.bedrooms} {t('bed_unit')} • {property.bathrooms} {t('bath_unit')} • {property.squareFeet} {tp('sqft')}
                </span>
                <span className="location">
                  {property.city}, {property.state}
                </span>
              </div>
              <button
                className="view-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemove(property._id);
                }}
              >
                {tp('Remove Favorite')}
              </button>
            </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export default Favorites;
