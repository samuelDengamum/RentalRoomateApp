import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/useI18n';
import '../styles/Pricing.css';

// ─── Plan definitions ────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceRWF: number;
  planMonths: number;
  priceLabel: string;
  perMonthLabel: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
  gradient: string;
  accentColor: string;
  free: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Get started at no cost',
    priceRWF: 0,
    planMonths: 0,
    priceLabel: '0 RWF',
    perMonthLabel: 'forever',
    features: [
      '1 active listing',
      'Basic property page',
      'Contact via messages',
      'Community support',
    ],
    cta: 'Current plan',
    highlight: false,
    gradient: 'linear-gradient(135deg,#1a2a3a 0%,#243447 100%)',
    accentColor: '#64748b',
    free: true,
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Perfect for individual landlords',
    priceRWF: 5000,
    planMonths: 1,
    priceLabel: '5,000 RWF',
    perMonthLabel: '/ 1 month',
    features: [
      'Up to 5 active listings',
      'Standard listing placement',
      'Email support',
      'Tour request management',
      'Analytics overview',
    ],
    cta: 'Subscribe',
    highlight: false,
    gradient: 'linear-gradient(135deg,#0f3460 0%,#16213e 100%)',
    accentColor: '#38bdf8',
    free: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'For growing property portfolios',
    priceRWF: 30000,
    planMonths: 3,
    priceLabel: '30,000 RWF',
    perMonthLabel: '/ 3 months',
    features: [
      'Up to 15 active listings',
      'Priority listing placement',
      'Featured ★ badge on listings',
      'Priority email & chat support',
      'Full analytics dashboard',
      'Bulk tour request handling',
    ],
    cta: 'Subscribe',
    highlight: true,
    badge: 'Most Popular',
    gradient: 'linear-gradient(135deg,#0f5274 0%,#0a3d5c 100%)',
    accentColor: '#34d399',
    free: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Maximum power for large portfolios',
    priceRWF: 120000,
    planMonths: 12,
    priceLabel: '120,000 RWF',
    perMonthLabel: '/ 12 months',
    features: [
      'Unlimited active listings',
      'Top-of-page listing placement',
      'Featured ★ + Premium badge',
      'Dedicated account manager',
      'Advanced analytics & reports',
      'Bulk management tools',
      'Early access to new features',
    ],
    cta: 'Subscribe',
    highlight: false,
    badge: 'Best Value',
    gradient: 'linear-gradient(135deg,#1e0a4a 0%,#2d1b69 100%)',
    accentColor: '#a78bfa',
    free: false,
  },
];

// ─── Check icon ──────────────────────────────────────────────────────────────
const CheckIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0, marginTop: 1 }}
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

// ─── Subscription modal ───────────────────────────────────────────────────────
interface SubscribeModalProps {
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}

const SubscribeModal: React.FC<SubscribeModalProps> = ({ plan, onClose, onSuccess }) => {
  const { tp } = useI18n();
  const [paymentMethod, setPaymentMethod] = React.useState<'mobile_money' | 'bank_transfer'>('mobile_money');
  const [reference, setReference] = React.useState('');
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setErrorMsg(tp('Please upload your payment proof (screenshot or receipt).'));
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('proof', proofFile);
      fd.append('planMonths', String(plan.planMonths));
      fd.append('planType', plan.id);
      if (reference.trim()) fd.append('paymentReference', reference.trim());

      await apiRequest('/api/auth/subscription/submit', {
        method: 'POST',
        auth: true,
        body: fd,
      });
      onSuccess();
    } catch (err) {
      setErrorMsg(tp((err as Error).message || 'Failed to submit. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pricing-modal-overlay" role="dialog" aria-modal="true" aria-label={`${tp('Subscribe to')} ${tp(plan.name)}`}>
      <div className="pricing-modal">
        <button className="pricing-modal-close" onClick={onClose} aria-label={tp('Close')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {/* Plan summary */}
        <div className="pricing-modal-header" style={{ background: plan.gradient }}>
          <span className="pricing-modal-plan-name">{tp(plan.name)} {tp('Plan')}</span>
          <span className="pricing-modal-price">{plan.priceLabel}</span>
          <span className="pricing-modal-period">{tp(plan.perMonthLabel)}</span>
        </div>

        <div className="pricing-modal-body">
          <h3>{tp('Complete your subscription')}</h3>
          <p className="pricing-modal-subtitle">
            {tp('Choose your payment method, make the transfer, then upload proof below.')}
          </p>

          {/* Payment method toggle */}
          <div className="pricing-payment-tabs" role="tablist" aria-label={tp('Payment method')}>
            <button
              role="tab"
              aria-selected={paymentMethod === 'mobile_money'}
              className={`pricing-pay-tab${paymentMethod === 'mobile_money' ? ' active' : ''}`}
              onClick={() => setPaymentMethod('mobile_money')}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
              {tp('Mobile Money')}
            </button>
            <button
              role="tab"
              aria-selected={paymentMethod === 'bank_transfer'}
              className={`pricing-pay-tab${paymentMethod === 'bank_transfer' ? ' active' : ''}`}
              onClick={() => setPaymentMethod('bank_transfer')}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
              </svg>
              {tp('Bank Transfer')}
            </button>
          </div>

          {/* Payment details box */}
          <div className="pricing-payment-details">
            {paymentMethod === 'mobile_money' ? (
              <>
                <p className="pricing-pd-label">{tp('Send to Mobile Money:')}</p>
                <p className="pricing-pd-value">📱 <strong>+250 788 000 000</strong></p>
                <p className="pricing-pd-name">RentalHub Ltd</p>
                <p className="pricing-pd-amount">{tp('Amount:')} <strong>{plan.priceLabel}</strong></p>
                <p className="pricing-pd-note">{tp('Use your username or email as the reason/note when transferring.')}</p>
              </>
            ) : (
              <>
                <p className="pricing-pd-label">{tp('Bank Transfer details:')}</p>
                <p className="pricing-pd-value">🏦 <strong>Bank of Kigali</strong></p>
                <p className="pricing-pd-name">{tp('Account:')} <strong>100-234-567-8</strong></p>
                <p className="pricing-pd-name">{tp('Name:')} <strong>RentalHub Ltd</strong></p>
                <p className="pricing-pd-amount">{tp('Amount:')} <strong>{plan.priceLabel}</strong></p>
                <p className="pricing-pd-note">{tp('Use your username or email as the payment reference.')}</p>
              </>
            )}
          </div>

          {/* Proof upload form */}
          <form onSubmit={handleSubmit} className="pricing-proof-form">
            <label htmlFor="pricing-reference">{tp('Payment reference / transaction ID')} <span className="opt">({tp('optional')})</span></label>
            <input
              id="pricing-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={tp('e.g. TXN123456789')}
              maxLength={120}
              autoComplete="off"
            />

            <label htmlFor="pricing-proof-file">{tp('Upload payment proof')} <span className="req">*</span></label>
            <div
              className={`pricing-file-drop${proofFile ? ' has-file' : ''}`}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={tp('Upload payment proof')}
            >
              {proofFile ? (
                <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  <span>{proofFile.name}</span>
                  <button
                    type="button"
                    className="pricing-file-remove"
                    onClick={(ev) => { ev.stopPropagation(); setProofFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                    aria-label={tp('Remove file')}
                  >✕</button>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>{tp('Click to upload or drag & drop')}</span>
                  <small>{tp('JPG, PNG, WEBP, PDF — max 10 MB')}</small>
                </>
              )}
              <input
                ref={fileRef}
                id="pricing-proof-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </div>

            {errorMsg ? <p className="pricing-form-error" role="alert">{errorMsg}</p> : null}

            <button type="submit" className="pricing-submit-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="pricing-spinner" aria-hidden="true" />
                  {tp('Submitting…')}
                </>
              ) : (
                `${tp('Submit Proof for')} ${tp(plan.name)} ${tp('Plan')}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Success overlay ─────────────────────────────────────────────────────────
const SuccessOverlay: React.FC<{ planName: string; onDone: () => void }> = ({ planName, onDone }) => {
  const { tp } = useI18n();

  return (
    <div className="pricing-modal-overlay" role="dialog" aria-modal="true" aria-label={tp('Submission successful')}>
      <div className="pricing-success-card">
        <div className="pricing-success-icon">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
            <path d="M22 4 12 14.01l-3-3" />
          </svg>
        </div>
        <h2>{tp('Proof Submitted!')}</h2>
        <p>{tp('Your')} <strong>{tp(planName)}</strong> {tp('subscription proof has been sent to our admins for review. You will be notified once it is approved.')}</p>
        <button className="pricing-submit-btn" onClick={onDone}>{tp('Back to Dashboard')}</button>
      </div>
    </div>
  );
};

// ─── Plan card ───────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan: Plan;
  isLoggedIn: boolean;
  isLandlord: boolean;
  currentStatus?: string;
  currentPlanMonths?: number;
  onSubscribe: (plan: Plan) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, isLoggedIn, isLandlord, currentStatus, currentPlanMonths, onSubscribe }) => {
  const { tp } = useI18n();
  const isCurrentActivePlan =
    isLandlord &&
    currentStatus === 'approved' &&
    plan.planMonths === currentPlanMonths &&
    !plan.free;

  const isPending =
    isLandlord &&
    currentStatus === 'pending' &&
    plan.planMonths === currentPlanMonths;

  const shouldShowSubscribe =
    isLoggedIn && isLandlord && !plan.free && !isCurrentActivePlan && currentStatus !== 'pending';

  const shouldShowLogin = !isLoggedIn && !plan.free;

  return (
    <article
      className={`pricing-card${plan.highlight ? ' pricing-card--highlight' : ''}${isCurrentActivePlan ? ' pricing-card--active' : ''}`}
      style={{ '--card-gradient': plan.gradient, '--card-accent': plan.accentColor } as React.CSSProperties}
    >
      {plan.badge ? (
        <div className="pricing-badge" style={{ background: plan.accentColor }}>
          {tp(plan.badge)}
        </div>
      ) : null}

      <div className="pricing-card-top">
        <p className="pricing-plan-label">
          <span className="pricing-plan-dot" style={{ background: plan.accentColor }} />
          {tp(plan.name)}
        </p>
        <p className="pricing-plan-tagline">{tp(plan.tagline)}</p>

        <div className="pricing-price-block">
          <span className="pricing-price">{plan.priceLabel}</span>
          <span className="pricing-period">{tp(plan.perMonthLabel)}</span>
        </div>
      </div>

      <ul className="pricing-features" aria-label={`${tp(plan.name)} ${tp('plan features')}`}>
        {plan.features.map((f) => (
          <li key={f}>
            <CheckIcon color={plan.accentColor} />
            <span>{tp(f)}</span>
          </li>
        ))}
      </ul>

      <div className="pricing-card-footer">
        {isCurrentActivePlan ? (
          <span className="pricing-active-badge">✓ {tp('Your Active Plan')}</span>
        ) : isPending ? (
          <span className="pricing-pending-badge">⏳ {tp('Pending Approval')}</span>
        ) : plan.free ? (
          <span className="pricing-free-badge">{tp('Always included')}</span>
        ) : shouldShowLogin ? (
          <Link to="/login" className="pricing-cta-btn" style={{ '--btn-color': plan.accentColor } as React.CSSProperties}>
            {tp('Log in to Subscribe')}
          </Link>
        ) : shouldShowSubscribe ? (
          <button
            type="button"
            className="pricing-cta-btn"
            style={{ '--btn-color': plan.accentColor } as React.CSSProperties}
            onClick={() => onSubscribe(plan)}
          >
            {tp(plan.cta)}
          </button>
        ) : !isLandlord && isLoggedIn ? (
          <span className="pricing-renter-note">{tp('For landlords only')}</span>
        ) : null}
      </div>
    </article>
  );
};

// ─── Main Pricing page ───────────────────────────────────────────────────────
interface PricingProps {
  isLoggedIn: boolean;
}

interface LandlordSubscription {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'expired';
  planMonths: number;
  currentPeriodEnd?: string;
  reviewNote?: string;
}

interface ProfileMini {
  userType: 'renter' | 'landlord';
  landlordSubscription?: LandlordSubscription;
}

const Pricing: React.FC<PricingProps> = ({ isLoggedIn }) => {
  const { tp } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<ProfileMini | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successPlanName, setSuccessPlanName] = React.useState('');

  React.useEffect(() => {
    if (!isLoggedIn) return;
    apiRequest<ProfileMini>('/api/auth/profile', { auth: true })
      .then(setProfile)
      .catch(() => {});
  }, [isLoggedIn]);

  const isLandlord = profile?.userType === 'landlord';
  const sub = profile?.landlordSubscription;

  const handleSubscribe = (plan: Plan) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setSelectedPlan(plan);
  };

  const handleSuccess = () => {
    setSuccessPlanName(selectedPlan?.name || '');
    setSelectedPlan(null);
    setShowSuccess(true);
    // Refresh profile
    apiRequest<ProfileMini>('/api/auth/profile', { auth: true })
      .then(setProfile)
      .catch(() => {});
  };

  return (
    <div className="pricing-wrap">
      {/* Animated background orbs */}
      <div className="pricing-bg" aria-hidden="true">
        <div className="pricing-orb pricing-orb--1" />
        <div className="pricing-orb pricing-orb--2" />
        <div className="pricing-orb pricing-orb--3" />
      </div>

      {/* Header */}
      <header className="pricing-header">
        <p className="pricing-kicker">{tp('Landlord Plans')}</p>
        <h1 className="pricing-title">
          {tp('Choose the plan that')}<br />
          <span className="pricing-title-accent">{tp('grows with you')}</span>
        </h1>
        <p className="pricing-subtitle">
          {tp('Subscribe once, list freely. All plans unlock the full property management suite.')}
          {' '}
          {tp('Cancel or upgrade anytime after your period ends.')}
        </p>
      </header>

      {/* Current plan status banner */}
      {isLoggedIn && isLandlord && sub ? (
        <div className={`pricing-status-banner pricing-status-banner--${sub.status}`}>
          <div className="pricing-status-inner">
            <span className="pricing-status-dot" />
            <span>
              {sub.status === 'approved'
                ? `${tp('Your subscription is active')} — ${tp('expires')} ${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : tp('soon')}`
                : sub.status === 'pending'
                ? tp('Subscription proof submitted — awaiting admin approval')
                : sub.status === 'rejected'
                ? `${tp('Subscription rejected')}${sub.reviewNote ? `: ${sub.reviewNote}` : ''} — ${tp('please resubmit')}`
                : sub.status === 'expired'
                ? tp('Your subscription has expired — renew below')
                : tp('No active subscription — choose a plan to get started')}
            </span>
            {sub.status === 'approved' ? (
              <Link to="/dashboard" className="pricing-status-link">{tp('Go to Dashboard →')}</Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Plan cards grid */}
      <div className="pricing-grid">
        {PLANS.map((plan, index) => (
          <div
            key={plan.id}
            className="pricing-card-anim"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <PlanCard
              plan={plan}
              isLoggedIn={isLoggedIn}
              isLandlord={isLandlord}
              currentStatus={sub?.status}
              currentPlanMonths={sub?.planMonths}
              onSubscribe={handleSubscribe}
            />
          </div>
        ))}
      </div>

      {/* FAQ strip */}
      <section className="pricing-faq">
        <p className="pricing-faq-eyebrow">{tp('Quick Answers')}</p>
        <h2>{tp('Frequently asked questions')}</h2>
        <div className="pricing-faq-grid">
          {[
            {
              q: 'How does the approval work?',
              a: 'After you upload your payment proof, our team reviews it within 24 hours and activates your plan.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22s8-4.2 8-10.2V5.4L12 2 4 5.4v6.4C4 17.8 12 22 12 22Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="m9.3 12.1 1.9 1.9 3.9-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )
            },
            {
              q: 'What payment methods are accepted?',
              a: 'We accept Mobile Money (Airtel, MTN) and Bank Transfer via Bank of Kigali.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="6" y="3" width="12" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M9 7.5h6M9 11.5h6M9.8 16.5h4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )
            },
            {
              q: 'Can I upgrade my plan?',
              a: 'Yes! Once your current period ends, you can choose any plan for the next cycle.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="m6.8 9.3 5.2-5.3 5.2 5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )
            },
            {
              q: 'What happens when my plan expires?',
              a: 'Your listings remain visible but you cannot add new ones until you renew.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 7.8v4.7l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )
            },
          ].map(({ q, a, icon }) => (
            <div key={q} className="pricing-faq-item">
              <div className="pricing-faq-item-head">
                <span className="pricing-faq-icon">{icon}</span>
                <h3>{tp(q)}</h3>
              </div>
              <p className="pricing-faq-text">{tp(a)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modals */}
      {selectedPlan ? (
        <SubscribeModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handleSuccess}
        />
      ) : null}

      {showSuccess ? (
        <SuccessOverlay
          planName={successPlanName}
          onDone={() => { setShowSuccess(false); navigate('/dashboard'); }}
        />
      ) : null}
    </div>
  );
};

export default Pricing;
