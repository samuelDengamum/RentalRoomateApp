import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney, getTouringFee } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import ImageLightbox from '../components/ImageLightbox';
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
  propertyType: string;
  amenities: string[];
  images?: string[];
}

interface PropertyListResponse {
  data: Property[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ id, value, options, onChange, ariaLabel }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div className={`custom-select${isOpen ? ' open' : ''}`} ref={wrapperRef}>
      <button
        id={id}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
      >
        <span>{selected?.label}</span>
        <span className="custom-select-caret" aria-hidden="true">▾</span>
      </button>
      {isOpen && (
        <div className="custom-select-menu" role="listbox" aria-labelledby={id}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`custom-select-option${option.value === value ? ' active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Properties: React.FC = () => {
  const { t, tp } = useI18n();
  const navigate = useNavigate();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [filters, setFilters] = React.useState({ city: '', minRent: '', maxRent: '', bedrooms: '', search: '', propertyType: '' });
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalResults, setTotalResults] = React.useState(0);
  const [favoriteIds, setFavoriteIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [lightboxImages, setLightboxImages] = React.useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [lightboxTitle, setLightboxTitle] = React.useState('');
  const hasHydratedRef = React.useRef(false);

  const sortOptions = React.useMemo<SelectOption[]>(() => ([
    { value: 'newest', label: t('sort_newest') },
    { value: 'rent_asc', label: t('sort_rent_low') },
    { value: 'rent_desc', label: t('sort_rent_high') }
  ]), [t]);

  const propertyTypeOptions = React.useMemo<SelectOption[]>(() => ([
    { value: '', label: tp('Any Property Type') },
    { value: 'apartment', label: tp('Apartment') },
    { value: 'house', label: tp('House') },
    { value: 'condo', label: tp('Condo') },
    { value: 'room', label: tp('Room') }
  ]), [tp]);

  const loadFavorites = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const favorites = await apiRequest<Property[]>('/api/auth/favorites', { auth: true });
      setFavoriteIds(favorites.map((f) => f._id));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProperties = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.minRent) params.append('minRent', filters.minRent);
      if (filters.maxRent) params.append('maxRent', filters.maxRent);
      if (filters.bedrooms) params.append('bedrooms', filters.bedrooms);
      if (filters.search) params.append('search', filters.search);
      if (filters.propertyType) params.append('propertyType', filters.propertyType);
      params.append('sort', sort);
      params.append('page', String(targetPage));
      params.append('limit', '9');

      const response = await apiRequest<PropertyListResponse>(`/api/properties?${params.toString()}`);
      setProperties(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalResults(response.pagination.total || 0);
      setPage(targetPage);
    } catch (error) {
      setError((error as Error).message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProperties();
    loadFavorites();
    // Run only once on first load; searches are manual via form submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      fetchProperties(1);
    }, 320);

    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties(1);
  };

  const clearFilters = () => {
    setFilters({ city: '', minRent: '', maxRent: '', bedrooms: '', search: '', propertyType: '' });
    setSort('newest');
    setPage(1);
    fetchProperties(1);
  };

  const applyQuickFilter = (preset: Partial<typeof filters>) => {
    const next = { ...filters, ...preset };
    setFilters(next);
    setPage(1);
  };

  const activeFilterCount = [
    filters.search,
    filters.city,
    filters.minRent,
    filters.maxRent,
    filters.bedrooms,
    filters.propertyType
  ].filter(Boolean).length;

  const toggleFavorite = async (propertyId: string) => {
    if (!localStorage.getItem('token')) {
      setError(tp('Log in to save favorites.'));
      return;
    }

    try {
      const res = await apiRequest<{ isFavorited: boolean }>(`/api/auth/favorites/${propertyId}`, {
        method: 'POST',
        auth: true
      });

      setFavoriteIds((prev) => {
        if (res.isFavorited) {
          return [...prev, propertyId];
        }
        return prev.filter((id) => id !== propertyId);
      });
    } catch (err) {
      setError(tp((err as Error).message));
    }
  };

  return (
    <div className="properties-page">
      <div className="filters filters-modern">
        <div className="filters-top-row">
          <div>
            <p className="filters-kicker">{tp('Property Explorer')}</p>
            <h2>{tp('Smart Search')}</h2>
            <p className="filters-subtext">{tp('Use quick presets or fine-tune filters to find your best match faster.')}</p>
          </div>
          <div className="filters-meta">
            <span>{tp('Active filters')}: <strong>{activeFilterCount}</strong></span>
            <span>{tp('Results')}: <strong>{totalResults}</strong></span>
          </div>
        </div>

        <div className="quick-filters" role="group" aria-label={tp('Quick filters')}>
          <button type="button" onClick={() => applyQuickFilter({ maxRent: '250000', bedrooms: '1' })}>{tp('Budget Starter')}</button>
          <button type="button" onClick={() => applyQuickFilter({ minRent: '250000', maxRent: '600000', bedrooms: '2' })}>{tp('Family Comfort')}</button>
          <button type="button" onClick={() => applyQuickFilter({ city: 'Kigali' })}>{tp('Kigali Only')}</button>
          <button type="button" onClick={() => applyQuickFilter({ propertyType: 'apartment' })}>{tp('Apartments')}</button>
        </div>

        <form onSubmit={handleSearch}>
          <input type="text" name="search" placeholder={tp('Search title, location, or features')} value={filters.search} onChange={handleFilterChange} />
          <input type="text" name="city" placeholder={tp('City')} value={filters.city} onChange={handleFilterChange} />
          <input type="number" name="minRent" placeholder={tp('Min Rent')} value={filters.minRent} onChange={handleFilterChange} />
          <input type="number" name="maxRent" placeholder={tp('Max Rent')} value={filters.maxRent} onChange={handleFilterChange} />
          <input type="number" name="bedrooms" placeholder={tp('Min Bedrooms')} value={filters.bedrooms} onChange={handleFilterChange} />
          <CustomSelect
            id="property-type-select"
            value={filters.propertyType}
            options={propertyTypeOptions}
            onChange={(selectedValue) => setFilters(prev => ({ ...prev, propertyType: selectedValue }))}
            ariaLabel={tp('Property type')}
          />
          <CustomSelect
            id="sort-select"
            value={sort}
            options={sortOptions}
            onChange={setSort}
            ariaLabel={tp('Sort properties')}
          />
          <button type="submit" className="filters-submit">{t('properties_search_button')}</button>
          <button type="button" className="filters-clear" onClick={clearFilters}>{tp('Reset')}</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      {loading ? <div className="loading">{t('common_loading')}</div> : (
        <div className="properties-list">
          {properties.length === 0 ? <p>{t('properties_no_results')}</p> : properties.map((property, idx) => {
            const localizedTitle = tp(property.title);
            return (
            <div
              key={property._id}
              className="property-listing reveal"
              style={{ animationDelay: `${idx * 50}ms` }}
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
              {property.images && property.images.length > 0 && (
                <div className="property-thumb-strip">
                  {property.images.slice(0, 5).map((image, imageIdx) => (
                    <img
                      key={`${property._id}-thumb-${imageIdx}`}
                      className="property-thumb"
                      src={resolveMediaUrl(image)}
                      alt={`${localizedTitle} view ${imageIdx + 1}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setLightboxImages(property.images!.map((img) => resolveMediaUrl(img)));
                        setLightboxIndex(imageIdx);
                        setLightboxTitle(localizedTitle);
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="listing-header">
                <h3>{localizedTitle}</h3>
                <span className="price">{formatMoney(property.rent)}{t('per_month')}</span>
              </div>
              <p className="description">{t('touring_fee_prefix')} {formatMoney(getTouringFee(property.touringFee))} {t('fixed_suffix')}</p>
              <p className="description">{property.description}</p>
              <div className="listing-info">
                <span>{property.bedrooms} {t('bed_unit')} • {property.bathrooms} {t('bath_unit')} • {property.squareFeet} {tp('sqft')}</span>
                <span className="location">{property.city}, {property.state}</span>
              </div>
              {property.images && property.images.length > 1 && (
                <p className="listing-photo-count">{property.images.length} {t('photos_available')}</p>
              )}
              {property.amenities.length > 0 && (
                <div className="amenities">
                  {property.amenities.slice(0, 3).map((amenity, idx) => <span key={idx}>{amenity}</span>)}
                </div>
              )}
              <div className="card-actions">
                <button className="view-btn" onClick={(e) => { e.stopPropagation(); navigate(`/properties/${property._id}`); }}>{t('prop_view_details')}</button>
                <button className="view-btn alt" onClick={(e) => { e.stopPropagation(); toggleFavorite(property._id); }}>
                  {favoriteIds.includes(property._id) ? t('prop_saved') : t('prop_save')}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <div className="pager">
        <button disabled={page === 1} onClick={() => fetchProperties(page - 1)}>{t('pager_prev')}</button>
        <span>{t('pager_page')} {page} {t('pager_of')} {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => fetchProperties(page + 1)}>{t('pager_next')}</button>
      </div>

      {lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          title={lightboxTitle}
          onClose={() => setLightboxImages([])}
        />
      )}
    </div>
  );
};

export default Properties;
