import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import ImageLightbox from '../components/ImageLightbox';
import '../styles/Roommates.css';
import '../styles/Properties.css';
import { GENDER_OPTIONS, RoommateListResponse, RoommateProfile } from '../types/roommate';

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
    <div className={`roommate-custom-select${isOpen ? ' open' : ''}`} ref={wrapperRef}>
      <button
        id={id}
        type="button"
        className="roommate-custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selected?.label}</span>
        <span className="roommate-custom-select-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="roommate-custom-select-menu" role="listbox" aria-labelledby={id}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`roommate-custom-select-option${option.value === value ? ' active' : ''}`}
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

const RoommateBrowse: React.FC = () => {
  const { t, tp } = useI18n();
  const [profiles, setProfiles] = React.useState<RoommateProfile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [cardDensity, setCardDensity] = React.useState<'comfortable' | 'compact'>('comfortable');
  const [sort, setSort] = React.useState('newest');
  const [lightboxImages, setLightboxImages] = React.useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const navigate = useNavigate();
  const hasHydratedRef = React.useRef(false);

  const [filters, setFilters] = React.useState({
    search: '',
    minAge: '',
    maxAge: '',
    occupation: '',
    gender: '',
    socialStatus: '',
    city: '',
    minBudget: '',
    maxBudget: ''
  });

  const socialStatusOptions = React.useMemo<SelectOption[]>(() => ([
    { value: '', label: tp('Any social status') },
    { value: 'single', label: tp('Single') },
    { value: 'marriage', label: tp('Marriage') },
    { value: 'divorce', label: tp('Divorce') },
    { value: 'in relationship', label: tp('In Relationship') }
  ]), [tp]);

  const loadProfiles = async (activeFilters = filters) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      }
    });
    params.set('sort', sort);

    const endpoint = params.toString() ? `/api/roommates?${params.toString()}` : '/api/roommates';
    try {
      const res = await apiRequest<RoommateListResponse>(endpoint);
      setProfiles(res.data);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadProfiles();
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      loadProfiles(filters);
    }, 320);

    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  const genderOptions = React.useMemo<SelectOption[]>(() => ([
    { value: '', label: tp('Any gender') },
    ...GENDER_OPTIONS.map((option) => ({ value: option, label: tp(option) }))
  ]), [tp]);

  const sortOptions = React.useMemo<SelectOption[]>(() => ([
    { value: 'newest', label: tp('Newest') },
    { value: 'budget_asc', label: tp('Budget: Low to High') },
    { value: 'budget_desc', label: tp('Budget: High to Low') },
    { value: 'age_asc', label: tp('Age: Youngest First') },
    { value: 'age_desc', label: tp('Age: Oldest First') }
  ]), [tp]);

  const quickFilter = (preset: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...preset }));
  };

  const activeFilterCount = Object.values(filters).filter((value) => value.trim()).length;

  const openMessage = (userId?: string) => {
    if (!userId) return;
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    navigate(`/messages?userId=${encodeURIComponent(userId)}`);
  };

  const resetFilters = () => {
    const emptyFilters = {
      search: '',
      minAge: '',
      maxAge: '',
      occupation: '',
      gender: '',
      socialStatus: '',
      city: '',
      minBudget: '',
      maxBudget: ''
    };
    setFilters(emptyFilters);
    setSort('newest');
    loadProfiles(emptyFilters);
  };

  return (
    <section className="roommates-wrap">
      <header className="roommates-hero glass">
        <h1>{t('roommates_browse_title')}</h1>
        <p>{tp('Filter by age, occupation, gender, social status, city, and budget.')}</p>
      </header>

      <div className="glass panel filters-panel filters-modern">
        <div className="section-heading">
          <div>
            <p className="filters-kicker">{tp('Roommate Explorer')}</p>
            <h2>{tp('Filters')}</h2>
            <p className="filters-subtext">{tp('Use presets or tune personal preferences to find a better roommate fit fast.')}</p>
          </div>
          <div className="filters-meta">
            <span>{tp('Active filters')}: <strong>{activeFilterCount}</strong></span>
            <span>{tp('Results')}: <strong>{profiles.length}</strong></span>
          </div>
        </div>

        <div className="quick-filters" role="group" aria-label={tp('Quick roommate filters')}>
          <button type="button" onClick={() => quickFilter({ city: 'Kigali' })}>{tp('Kigali')}</button>
          <button type="button" onClick={() => quickFilter({ minBudget: '150000', maxBudget: '350000' })}>{tp('Budget Friendly')}</button>
          <button type="button" onClick={() => quickFilter({ socialStatus: 'student' })}>{tp('Students')}</button>
          <button type="button" onClick={() => quickFilter({ occupation: 'professional' })}>{tp('Professionals')}</button>
        </div>

        <div className="section-heading section-heading--compact">
          <Link to="/roommates/profile" className="roommate-btn profile-shortcut-btn">{tp('Create or Edit My Profile')}</Link>
        </div>

        <div className="roommate-toolbar">
          <CustomSelect
            id="roommate-sort-select"
            value={sort}
            options={sortOptions}
            onChange={setSort}
            ariaLabel={tp('Sort roommate profiles')}
          />
          <div className="density-toggle" role="group" aria-label={tp('Card density')}>
            <button
              type="button"
              className={cardDensity === 'comfortable' ? 'active' : ''}
              onClick={() => setCardDensity('comfortable')}
            >
              {tp('Comfortable')}
            </button>
            <button
              type="button"
              className={cardDensity === 'compact' ? 'active' : ''}
              onClick={() => setCardDensity('compact')}
            >
              {tp('Compact')}
            </button>
          </div>
        </div>

        <div className="roommate-filters">
          <input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder={tp('Search bio, occupation, social status, city')}
          />
          <input
            type="number"
            value={filters.minAge}
            onChange={(e) => setFilters((prev) => ({ ...prev, minAge: e.target.value }))}
            placeholder={tp('Min age')}
          />
          <input
            type="number"
            value={filters.maxAge}
            onChange={(e) => setFilters((prev) => ({ ...prev, maxAge: e.target.value }))}
            placeholder={tp('Max age')}
          />
          <input
            value={filters.occupation}
            onChange={(e) => setFilters((prev) => ({ ...prev, occupation: e.target.value }))}
            placeholder={tp('Occupation')}
          />
          <CustomSelect
            id="roommate-gender-select"
            value={filters.gender}
            options={genderOptions}
            onChange={(selectedValue) => setFilters((prev) => ({ ...prev, gender: selectedValue }))}
            ariaLabel={tp('Gender filter')}
          />
          <CustomSelect
            id="roommate-social-status-select"
            value={filters.socialStatus}
            options={socialStatusOptions}
            onChange={(selectedValue) => setFilters((prev) => ({ ...prev, socialStatus: selectedValue }))}
            ariaLabel={tp('Social status filter')}
          />
          <input
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
            placeholder={tp('City')}
          />
          <input
            type="number"
            value={filters.minBudget}
            onChange={(e) => setFilters((prev) => ({ ...prev, minBudget: e.target.value }))}
            placeholder={tp('Min budget')}
          />
          <input
            type="number"
            value={filters.maxBudget}
            onChange={(e) => setFilters((prev) => ({ ...prev, maxBudget: e.target.value }))}
            placeholder={tp('Max budget')}
          />
        </div>

        <div className="roommate-filter-actions">
          <button type="button" className="roommate-btn search-btn" onClick={() => loadProfiles()}>{loading ? tp('Searching...') : tp('Search')}</button>
          <button type="button" className="roommate-btn reset-btn" onClick={resetFilters}>{tp('Reset')}</button>
        </div>
      </div>

      <div className="glass panel profiles-panel">
        <div className="section-heading">
          <h2>{t('roommates_profiles')}</h2>
          <span className="roommate-count">{profiles.length} {tp(profiles.length === 1 ? 'result' : 'results')}</span>
        </div>

        <div className={`roommate-list ${cardDensity === 'compact' ? 'roommate-list--compact' : ''}`}>
          {profiles.length === 0 && (
            <div className="roommate-empty-state">
              <h3>{tp('No profiles found')}</h3>
              <p>{tp('Try changing age, city, budget, or gender filters and search again.')}</p>
            </div>
          )}
          {profiles.map((profile) => (
            <article key={profile._id} className="property-listing reveal roommate-property-card">
              {(profile.imageDetails?.length || profile.images?.length) ? (
                <div className="property-thumb-strip">
                  {(profile.imageDetails?.length ? profile.imageDetails.map((x) => x.url) : profile.images || [])
                    .slice(0, 6)
                    .map((img, idx) => (
                      <img
                        key={idx}
                        className="property-thumb"
                        src={resolveMediaUrl(img)}
                        alt={tp(`Roommate ${idx + 1}`)}
                        onClick={() => {
                          const urls = (profile.imageDetails?.length
                            ? profile.imageDetails.map((x) => x.url)
                            : profile.images || []).map((u) => resolveMediaUrl(u));
                          setLightboxImages(urls);
                          setLightboxIndex(idx);
                        }}
                      />
                    ))}
                </div>
              ) : null}

              <div className="listing-header">
                <div>
                  <h3>{profile.userId?.firstName} {profile.userId?.lastName}</h3>
                  <p className="roommate-identity-line">{profile.occupation} · {profile.city}</p>
                </div>
                <span className="price">{formatMoney(profile.budget)}{t('per_month')}</span>
              </div>

              <div className="roommate-details-grid">
                <div className="roommate-detail-item">
                  <span className="detail-label">{tp('Occupation')}</span>
                  <span>{profile.occupation}</span>
                </div>
                <div className="roommate-detail-item">
                  <span className="detail-label">{tp('Age')}</span>
                  <span>{profile.age} {tp('years')}</span>
                </div>
                <div className="roommate-detail-item">
                  <span className="detail-label">{tp('Gender')}</span>
                  <span>{tp(profile.gender)}</span>
                </div>
                <div className="roommate-detail-item">
                  <span className="detail-label">{tp('Social Status')}</span>
                  <span>{profile.socialStatus}</span>
                </div>
                <div className="roommate-detail-item">
                  <span className="detail-label">{tp('City')}</span>
                  <span>{profile.city}</span>
                </div>
                <div className="roommate-detail-item">
                  <span className="detail-label">{tp('Move-in')}</span>
                  <span>{new Date(profile.moveInDate).toLocaleDateString()}</span>
                </div>
                <div className="roommate-detail-item roommate-detail-item--full">
                  <span className="detail-label">{tp('Phone')}</span>
                  <span>{profile.phone}</span>
                </div>
              </div>

              {(profile.imageDetails?.length || profile.images?.length) ? (
                <>
                  <p className="listing-photo-count">
                    {(profile.imageDetails?.length || profile.images?.length || 0)} {tp((profile.imageDetails?.length || profile.images?.length || 0) > 1 ? 'photos' : 'photo')}
                  </p>
                  {profile.imageDetails?.length ? (
                    <div className="amenities">
                      {Array.from(new Set(profile.imageDetails.map((item) => item.category))).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}

              <p className="description roommate-description">{profile.description}</p>
              {profile.roomPreference && (
                <div className="amenities">
                  <span>{profile.roomPreference}</span>
                </div>
              )}

              <div className="roommate-card-actions">
                <button type="button" className="roommate-btn message-btn" onClick={() => openMessage(profile.userId?._id)}>
                  {tp('Chat with roommate')}
                </button>
              </div>
            </article>
          ))}
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
    </section>
  );
};

export default RoommateBrowse;
