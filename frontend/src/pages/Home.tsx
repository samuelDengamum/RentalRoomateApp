import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney, getTouringFee } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import ImageLightbox from '../components/ImageLightbox';
import '../styles/Home.css';

interface Property {
  _id: string;
  title: string;
  rent: number;
  touringFee?: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  propertyType: string;
  images?: string[];
}

interface PropertyListResponse {
  data: Property[];
}

interface PublicPlatformStats {
  satisfiedClients: number;
  propertyListings: number;
  roommateProfiles: number;
}

const IMPACT_FALLBACK_STATS: PublicPlatformStats = {
  satisfiedClients: 50000,
  propertyListings: 50000,
  roommateProfiles: 50000
};

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  city: string;
  initials: string;
  avatarTone: 'sun' | 'sky' | 'mint';
}

const testimonials: Testimonial[] = [
  {
    quote: 'I got a verified roommate in two days and signed a great place the same week. The messaging flow is super smooth.',
    name: 'Aline M.',
    role: 'Graduate Student',
    city: 'Kigali',
    initials: 'AM',
    avatarTone: 'sun'
  },
  {
    quote: 'Listing my apartment took minutes, and every inquiry came from complete profiles. It saved me so much time.',
    name: 'Daniel K.',
    role: 'Property Owner',
    city: 'Huye',
    initials: 'DK',
    avatarTone: 'sky'
  },
  {
    quote: 'The filters are accurate and the photos open fast. I finally found a room that matched my budget and location.',
    name: 'Sonia T.',
    role: 'Remote Worker',
    city: 'Musanze',
    initials: 'ST',
    avatarTone: 'mint'
  }
];

const loopingTestimonials = [...testimonials, ...testimonials];
const HERO_VIDEOS = ['/hero-home.mp4', '/hero-video-a.mp4', '/hero-video-b.mp4'];

const CountUpNumber: React.FC<{ value: number; active: boolean; duration?: number; suffix?: string }> = ({
  value,
  active,
  duration = 2400,
  suffix = ''
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setDisplayValue(0);
      return;
    }

    let rafId = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [active, duration, value]);

  return <>{displayValue.toLocaleString()}{suffix}</>;
};

interface HomeProps {
  isLoggedIn?: boolean;
}

const Home: React.FC<HomeProps> = ({ isLoggedIn = false }) => {
  const { t, tp } = useI18n();
  const navigate = useNavigate();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lightboxImages, setLightboxImages] = React.useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [lightboxTitle, setLightboxTitle] = React.useState('');
  const [activeHeroVideo, setActiveHeroVideo] = React.useState(0);
  const [scrollParallaxY, setScrollParallaxY] = React.useState(0);
  const [platformStats, setPlatformStats] = React.useState<PublicPlatformStats>({
    ...IMPACT_FALLBACK_STATS
  });
  const [statsVisible, setStatsVisible] = React.useState(false);
  const [featuredVisible, setFeaturedVisible] = React.useState(false);
  const [powerVisible, setPowerVisible] = React.useState(false);
  const [testimonialsVisible, setTestimonialsVisible] = React.useState(false);
  const [footerVisible, setFooterVisible] = React.useState(false);
  const statsRef = React.useRef<HTMLElement | null>(null);
  const featuredRef = React.useRef<HTMLDivElement | null>(null);
  const powerRef = React.useRef<HTMLElement | null>(null);
  const testimonialsRef = React.useRef<HTMLElement | null>(null);
  const footerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const fetchProperties = async () => {
      const [propertiesResult, statsResult] = await Promise.allSettled([
        apiRequest<PropertyListResponse>('/api/properties?limit=6&sort=newest'),
        apiRequest<PublicPlatformStats>('/api/stats/public')
      ]);

      if (propertiesResult.status === 'fulfilled') {
        setProperties(propertiesResult.value.data || []);
      } else {
        console.error('Error fetching properties:', propertiesResult.reason);
      }

      if (statsResult.status === 'fulfilled') {
        const liveStats = statsResult.value;
        setPlatformStats({
          satisfiedClients: Math.max(liveStats.satisfiedClients || 0, IMPACT_FALLBACK_STATS.satisfiedClients),
          propertyListings: Math.max(liveStats.propertyListings || 0, IMPACT_FALLBACK_STATS.propertyListings),
          roommateProfiles: Math.max(liveStats.roommateProfiles || 0, IMPACT_FALLBACK_STATS.roommateProfiles)
        });
      } else {
        console.warn('Public stats unavailable; using fallback counters.');
        setPlatformStats(IMPACT_FALLBACK_STATS);
      }

      setLoading(false);
    };

    fetchProperties();
  }, []);

  React.useEffect(() => {
    if (loading) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStatsVisible(true);
      setFeaturedVisible(true);
      setPowerVisible(true);
      setTestimonialsVisible(true);
      setFooterVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIn = entry.isIntersecting;
          if (entry.target === featuredRef.current) setFeaturedVisible(isIn);
          if (entry.target === statsRef.current) setStatsVisible(isIn);
          if (entry.target === powerRef.current) setPowerVisible(isIn);
          if (entry.target === testimonialsRef.current) setTestimonialsVisible(isIn);
          if (entry.target === footerRef.current) setFooterVisible(isIn);
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
    );

    if (statsRef.current) observer.observe(statsRef.current);
    if (featuredRef.current) observer.observe(featuredRef.current);
    if (powerRef.current) observer.observe(powerRef.current);
    if (testimonialsRef.current) observer.observe(testimonialsRef.current);
    if (footerRef.current) observer.observe(footerRef.current);

    return () => observer.disconnect();
  }, [loading]);

  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        setScrollParallaxY(Math.min(window.scrollY, 1600));
        rafId = 0;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  React.useEffect(() => {
    const timerId = window.setInterval(() => {
      setActiveHeroVideo((prev) => (prev + 1) % HERO_VIDEOS.length);
    }, 12000);

    return () => window.clearInterval(timerId);
  }, []);

  if (loading) return <div className="loading">{t('common_loading')}</div>;

  return (
    <div className="home" style={{ '--scroll-y': `${scrollParallaxY}px` } as React.CSSProperties}>
      <div className="hero">
        <div className="home-parallax-layer home-parallax-layer-hero" aria-hidden="true" />
        <video
          key={HERO_VIDEOS[activeHeroVideo]}
          className="hero-background-video"
          src={HERO_VIDEOS[activeHeroVideo]}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
        <div className="hero-video-overlay" aria-hidden="true" />

        <div className="hero-copy">
          <h1>{t('home_hero_title')}</h1>
          <p>{t('home_hero_subtitle')}</p>
          <div className="hero-actions">
            <Link to="/properties" className="primary-cta">{t('home_explore_listings')}</Link>
            <Link to="/roommates" className="secondary-cta">{t('home_find_roommates')}</Link>
          </div>
        </div>
      </div>

      <div ref={featuredRef} className={`featured-properties section-reveal ${featuredVisible ? 'is-visible' : ''}`}>
        <h2>{t('home_featured_properties')}</h2>
        <div className="properties-grid">
          {properties.map((property, idx) => {
            const localizedTitle = tp(property.title);
            return (
            <div
              key={property._id}
              className="property-card reveal"
              style={{ animationDelay: `${idx * 70}ms` }}
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
                <div className="property-image-strip">
                  {property.images.slice(0, 4).map((image, imageIdx) => (
                    <img
                      key={`${property._id}-image-${imageIdx}`}
                      className="property-hero-image"
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
              <div className="property-header">
                <h3>{localizedTitle}</h3>
                <span className="property-type">{property.propertyType}</span>
              </div>
              <div className="property-details">
                <p><strong>{formatMoney(property.rent)}</strong>{t('per_month')}</p>
                <p>{t('touring_fee_prefix')} {formatMoney(getTouringFee(property.touringFee))} {t('fixed_suffix')}</p>
                <p>{property.bedrooms} {t('bed_unit')} • {property.bathrooms} {t('bath_unit')}</p>
                <p className="city">{property.city}</p>
                {property.images && property.images.length > 1 && (
                  <p className="image-count">{property.images.length} {property.images.length === 1 ? t('photo_unit') : t('photos_unit')}</p>
                )}
              </div>
            </div>
            );
          })}
          {properties.length === 0 && (
            <div className="property-card property-card-placeholder" aria-label={tp('Featured listings coming soon')}>
              <div className="property-header">
                <h3>{tp('Featured listings are loading')}</h3>
                <span className="property-type">RentalHub</span>
              </div>
              <div className="property-details">
                <p>{tp('New approved listings will appear here shortly.')}</p>
                <p>{tp('Explore properties to see all available listings now.')}</p>
                <Link to="/properties" className="home-power-link">{tp('Browse all properties')}</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <section ref={statsRef} className={`home-impact-stats section-reveal ${statsVisible ? 'is-visible' : ''}`} aria-labelledby="home-impact-title">
        <div className="home-impact-shell">
          <div className="home-impact-header-row">
            <p className="home-impact-kicker">{t('home_impact_kicker')}</p>
            <span className="home-impact-live-badge" aria-label="Live data">
              <span className="live-dot" aria-hidden="true" />
              LIVE
            </span>
          </div>
          <h2 id="home-impact-title">{t('home_impact_title')}</h2>
          <p className="home-impact-subtext">{t('home_impact_subtitle')}</p>

          <div className="home-impact-grid">
            <article className="home-impact-card">
              <h3>
                <CountUpNumber value={platformStats.satisfiedClients} active={statsVisible} suffix="+" />
              </h3>
              <p>{t('home_impact_clients')}</p>
            </article>

            <article className="home-impact-card">
              <h3>
                <CountUpNumber value={platformStats.propertyListings} active={statsVisible} suffix="+" />
              </h3>
              <p>{t('home_impact_listings')}</p>
            </article>

            <article className="home-impact-card">
              <h3>
                <CountUpNumber value={platformStats.roommateProfiles} active={statsVisible} suffix="+" />
              </h3>
              <p>{t('home_impact_roommates')}</p>
            </article>
          </div>
        </div>
      </section>

      <div className={`section-scroll-bridge ${powerVisible ? 'is-visible' : ''}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section ref={powerRef} className={`home-power-band section-reveal ${powerVisible ? 'is-visible' : ''}`} aria-labelledby="home-power-title">
        <div className="home-power-shell">
          <div className="home-parallax-layer home-parallax-layer-power" aria-hidden="true" />
          <div className="home-power-head">
            <p className="home-power-kicker">{t('home_power_kicker')}</p>
            <h2 id="home-power-title">{t('home_power_title')}</h2>
            <p>{t('home_power_subtitle')}</p>
          </div>

          <div className="home-power-grid">
            <article className="home-power-card home-power-card-renter">
              <div className="home-power-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11.5 12 4l9 7.5" />
                  <path d="M5.5 10.5V20h13V10.5" />
                  <path d="M9.2 20v-5.5h5.6V20" />
                </svg>
              </div>
              <h3>{t('home_power_renter_title')}</h3>
              <p>{t('home_power_renter_body')}</p>
              <Link to="/properties" className="home-power-link">{t('home_power_renter_cta')}</Link>
            </article>

            <article className="home-power-card home-power-card-landlord">
              <div className="home-power-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M7 14h4M7 17h7" />
                </svg>
              </div>
              <h3>{t('home_power_landlord_title')}</h3>
              <p>{t('home_power_landlord_body')}</p>
              <Link to="/pricing" className="home-power-link">{t('home_power_landlord_cta')}</Link>
            </article>

            <article className="home-power-card home-power-card-proof">
              <h3>{t('home_power_proof_title')}</h3>
              <p>{t('home_power_proof_body')}</p>
              <div className="home-power-stats" aria-label={tp('Platform metrics')}>
                <div>
                  <strong>24h</strong>
                  <span>{tp('Average approval window')}</span>
                </div>
                <div>
                  <strong>95%</strong>
                  <span>{tp('Users complete profile setup')}</span>
                </div>
                <div>
                  <strong>4.9/5</strong>
                  <span>{tp('Search and matching satisfaction')}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className={`section-scroll-bridge ${testimonialsVisible ? 'is-visible' : ''}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section
        ref={testimonialsRef}
        className={`testimonials-section section-reveal ${testimonialsVisible ? 'testimonials-section-visible is-visible' : ''}`}
        aria-labelledby="testimonials-heading"
      >
        <div className="home-parallax-layer home-parallax-layer-testimonials" aria-hidden="true" />
        <div className="testimonials-heading-wrap">
          <p className="testimonials-kicker">{t('home_testimonials_kicker')}</p>
          <h2 id="testimonials-heading">{t('home_testimonials_title')}</h2>
        </div>

        <div className="testimonials-grid" aria-live="polite">
          <div className="testimonials-track">
            {loopingTestimonials.map((testimonial, idx) => (
            <article
              key={`${testimonial.name}-${testimonial.city}-${idx}`}
              className={`testimonial-card ${testimonialsVisible ? 'testimonial-card-visible' : ''}`}
              style={{ animationDelay: `${idx * 90}ms` }}
              aria-hidden={idx >= testimonials.length}
            >
              <p className="testimonial-stars" aria-label={tp('5 out of 5 stars')}>★★★★★</p>
              <p className="testimonial-quote">"{tp(testimonial.quote)}"</p>

              <div className="testimonial-profile-row">
                <div className={`testimonial-avatar testimonial-avatar-${testimonial.avatarTone}`} aria-hidden="true">
                  {testimonial.initials}
                </div>

                <div className="testimonial-profile-meta">
                  <p className="testimonial-author">{testimonial.name}</p>
                  <p className="testimonial-meta">{tp(testimonial.role)} • {tp(testimonial.city)}</p>
                </div>

                <span className="testimonial-verified">{t('verified')}</span>
              </div>
            </article>
            ))}
          </div>
        </div>
      </section>

      <div className={`section-scroll-bridge ${footerVisible ? 'is-visible' : ''}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <footer ref={footerRef} className={`home-premium-footer section-reveal ${footerVisible ? 'is-visible' : ''}`} aria-label={tp('RentalHub footer')}>
        <div className="home-parallax-layer home-parallax-layer-footer" aria-hidden="true" />
        <div className="footer-aurora" aria-hidden="true" />
        <div className="footer-content-grid">
          <div className="footer-brand-block">
            <p className="footer-brand">RentalHub</p>
            <h3>{t('footer_tagline')}</h3>
            <p>{t('footer_body')}</p>
            <Link to={isLoggedIn ? '/dashboard' : '/register'} className="footer-main-cta">
              {isLoggedIn ? t('footer_cta_logged_in') : t('footer_cta_guest')}
            </Link>
          </div>

          <div className="footer-link-block">
            <h4>{t('footer_section_explore')}</h4>
            <Link to="/properties">{t('footer_browse')}</Link>
            <Link to="/roommates">{t('footer_find_roommates')}</Link>
            <Link to="/favorites">{t('footer_saved')}</Link>
            <Link to="/messages">{t('footer_messages')}</Link>
          </div>

          <div className="footer-link-block">
            <h4>{t('footer_section_support')}</h4>
            <Link to="/dashboard">{t('footer_dashboard')}</Link>
            <Link to="/profile">{t('footer_profile_settings')}</Link>
            <a href="mailto:support@rentalhub.app">support@rentalhub.app</a>
            <a href="tel:+250796150403">+250 796 150 403</a>
          </div>

          <div className="footer-link-block">
            <h4>{tp('Legal')}</h4>
            <Link to="/terms">{t('legal_terms')}</Link>
            <Link to="/privacy">{t('legal_privacy')}</Link>
          </div>
        </div>

        <div className="footer-bottom-row">
          <p>© {new Date().getFullYear()} RentalHub. {t('footer_copyright')}</p>
          <p className="footer-bottom-tag">{t('footer_tagline_row')}</p>
        </div>
      </footer>

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

export default Home;
