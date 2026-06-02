import React from 'react';
import { useI18n } from '../lib/useI18n';
import '../styles/OnboardingTour.css';

interface TourStep {
  id: string;
  title: string;
  description: string;
  role: 'all' | 'renter' | 'landlord';
  icon: React.ReactNode;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RentalHub!',
    description: 'Your one-stop platform for finding rentals, roommates, and trusted matches. Let\'s take a quick tour.',
    role: 'all',
    color: '#0f5274',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="url(#tour-grad-welcome)" opacity="0.15"/>
        <path d="M32 8 L8 28 L56 28 Z" fill="#0f5274" opacity="0.18"/>
        <path d="M32 10 L10 29 V54 H54 V29 L32 10Z" stroke="#0f5274" strokeWidth="2.2" fill="rgba(15,82,116,0.08)" strokeLinejoin="round"/>
        <path d="M22 54 V38 H42 V54" stroke="#0f5274" strokeWidth="2.2" fill="rgba(15,82,116,0.12)" strokeLinejoin="round"/>
        <rect x="27" y="38" width="10" height="16" rx="2" fill="#0f5274" opacity="0.2"/>
        <defs>
          <linearGradient id="tour-grad-welcome" x1="0" y1="0" x2="64" y2="64">
            <stop stopColor="#0f5274"/><stop offset="1" stopColor="#2b7f95"/>
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 'properties',
    title: 'Browse Properties',
    description: 'Explore hundreds of rental listings. Filter by city, price, and type to find your perfect home.',
    role: 'all',
    color: '#2b7f95',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#2b7f95" opacity="0.1"/>
        <rect x="10" y="22" width="44" height="32" rx="4" stroke="#2b7f95" strokeWidth="2.2" fill="rgba(43,127,149,0.08)"/>
        <rect x="18" y="32" width="10" height="10" rx="2" fill="#2b7f95" opacity="0.3"/>
        <rect x="36" y="32" width="10" height="10" rx="2" fill="#2b7f95" opacity="0.3"/>
        <rect x="18" y="44" width="28" height="10" rx="2" fill="#2b7f95" opacity="0.2"/>
        <path d="M20 22 V16 Q20 12 24 12 H40 Q44 12 44 16 V22" stroke="#2b7f95" strokeWidth="2.2" fill="none"/>
        <circle cx="32" cy="10" r="3" fill="#e7683a" opacity="0.8"/>
      </svg>
    ),
  },
  {
    id: 'roommates',
    title: 'Find Roommates',
    description: 'Browse roommate profiles and find compatible housemates based on lifestyle, budget, and location.',
    role: 'renter',
    color: '#5b6bff',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#5b6bff" opacity="0.1"/>
        <circle cx="22" cy="24" r="8" stroke="#5b6bff" strokeWidth="2.2" fill="rgba(91,107,255,0.12)"/>
        <circle cx="42" cy="24" r="8" stroke="#5b6bff" strokeWidth="2.2" fill="rgba(91,107,255,0.12)"/>
        <path d="M8 52 C8 42 15 38 22 38 C26 38 30 40 32 43 C34 40 38 38 42 38 C49 38 56 42 56 52" stroke="#5b6bff" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <path d="M28 43 L36 43" stroke="#e7683a" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'listings',
    title: 'Create Listings',
    description: 'Post your properties with photos, pricing, and details. Subscribe to a plan to start publishing.',
    role: 'landlord',
    color: '#e7683a',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#e7683a" opacity="0.1"/>
        <rect x="12" y="20" width="40" height="30" rx="4" stroke="#e7683a" strokeWidth="2.2" fill="rgba(231,104,58,0.08)"/>
        <path d="M24 20 V14 Q24 10 28 10 H36 Q40 10 40 14 V20" stroke="#e7683a" strokeWidth="2.2" fill="none"/>
        <circle cx="32" cy="35" r="6" stroke="#e7683a" strokeWidth="2.2" fill="rgba(231,104,58,0.15)"/>
        <path d="M32 32 V38 M29 35 H35" stroke="#e7683a" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'messages',
    title: 'Direct Messaging',
    description: 'Chat with landlords or renters in real-time. Ask questions, schedule tours, and close deals.',
    role: 'all',
    color: '#10a08a',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#10a08a" opacity="0.1"/>
        <rect x="10" y="16" width="44" height="30" rx="5" stroke="#10a08a" strokeWidth="2.2" fill="rgba(16,160,138,0.08)"/>
        <path d="M10 40 L18 52 V40" stroke="#10a08a" strokeWidth="2.2" fill="rgba(16,160,138,0.12)" strokeLinejoin="round"/>
        <path d="M18 26 H46" stroke="#10a08a" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <path d="M18 32 H38" stroke="#10a08a" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'Manage your listings, track tour requests, and monitor your activity from one central hub.',
    role: 'all',
    color: '#7c3aed',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#7c3aed" opacity="0.1"/>
        <rect x="10" y="10" width="20" height="20" rx="4" stroke="#7c3aed" strokeWidth="2.2" fill="rgba(124,58,237,0.1)"/>
        <rect x="34" y="10" width="20" height="20" rx="4" stroke="#7c3aed" strokeWidth="2.2" fill="rgba(124,58,237,0.1)"/>
        <rect x="10" y="34" width="20" height="20" rx="4" stroke="#7c3aed" strokeWidth="2.2" fill="rgba(124,58,237,0.1)"/>
        <rect x="34" y="34" width="20" height="20" rx="4" stroke="#7c3aed" strokeWidth="2.2" fill="rgba(124,58,237,0.1)"/>
        <path d="M16 22 L22 18 L26 22" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M38 16 H50 M38 20 H46" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 42 H24 M14 46 H20" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
        <path d="M40 42 H50 M40 46 H46 M40 50 H48" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    description: 'Complete your profile to get better matches. Explore, connect, and find your perfect home — good luck!',
    role: 'all',
    color: '#e7683a',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#e7683a" opacity="0.12"/>
        <circle cx="32" cy="32" r="22" stroke="#e7683a" strokeWidth="2.2" fill="rgba(231,104,58,0.08)"/>
        <path d="M20 32 L28 40 L44 24" stroke="#0f5274" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="32" cy="32" r="4" fill="#e7683a" opacity="0.2"/>
      </svg>
    ),
  },
];

interface OnboardingTourProps {
  userType?: string;
  onDismiss: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ userType = 'renter', onDismiss }) => {
  const { tp } = useI18n();
  const [step, setStep] = React.useState(0);
  const [exiting, setExiting] = React.useState(false);

  const isLandlord = userType === 'landlord';
  const visibleSteps = TOUR_STEPS.filter(
    s => s.role === 'all' || s.role === (isLandlord ? 'landlord' : 'renter')
  );

  const current = visibleSteps[step];
  const isLast = step === visibleSteps.length - 1;

  const dismiss = React.useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 280);
  }, [onDismiss]);

  const handleNext = () => {
    if (isLast) {
      dismiss();
    } else {
      setStep(s => s + 1);
    }
  };

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isLast]);

  return (
    <div
      className={`tour-backdrop${exiting ? ' tour-backdrop--exit' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={tp('Platform tour')}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className={`tour-card${exiting ? ' tour-card--exit' : ''}`}>

        {/* Skip button */}
        <button className="tour-skip" onClick={dismiss} aria-label={tp('Skip tour')}>
          {tp('Skip')}
        </button>

        {/* Step icon */}
        <div className="tour-icon-wrap" style={{ '--tour-color': current.color } as React.CSSProperties}>
          {current.icon}
        </div>

        {/* Step counter pill */}
        <div className="tour-step-pill">
          {tp('Step')} {step + 1} / {visibleSteps.length}
        </div>

        {/* Content */}
        <h2 key={`title-${step}`} className="tour-title">{tp(current.title)}</h2>
        <p key={`desc-${step}`} className="tour-desc">{tp(current.description)}</p>

        {/* Dot navigation */}
        <div className="tour-dots" role="tablist" aria-label={tp('Tour steps')}>
          {visibleSteps.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === step}
              aria-label={`${tp('Step')} ${i + 1}`}
              className={`tour-dot${i === step ? ' tour-dot--active' : ''}${i < step ? ' tour-dot--done' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="tour-actions">
          {step > 0 && (
            <button className="tour-btn-back" onClick={() => setStep(s => s - 1)}>
              {tp('Back')}
            </button>
          )}
          <button
            className="tour-btn-next"
            style={{ '--tour-color': current.color } as React.CSSProperties}
            onClick={handleNext}
          >
            {isLast ? tp('Get Started') : tp('Next')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
