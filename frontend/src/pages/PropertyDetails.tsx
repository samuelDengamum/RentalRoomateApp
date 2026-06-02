import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, resolveMediaUrl } from '../lib/api';
import { formatMoney, getTouringFee } from '../lib/propertyFees';
import { useI18n } from '../lib/useI18n';
import ImageLightbox from '../components/ImageLightbox';
import ReportModal from '../components/ReportModal';
import '../styles/PropertyDetails.css';

interface Landlord {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface PropertyDetailsModel {
  _id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  rent: number;
  touringFee?: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  amenities: string[];
  images: string[];
  landlordId: Landlord;
}

interface PaymentMethodOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  details: {
    companyName: string;
    destinationLabel: string;
    destinationValue: string;
    referenceHint: string;
  };
}

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateMessageValue = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${month}/${day}/${year}`;
};

const parseDateOnly = (dateValue: string) => {
  const [year, month, day] = dateValue.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const parseDateTime = (dateValue: string, timeValue: string) => {
  const datePart = parseDateOnly(dateValue);
  const [hours, minutes] = timeValue.split(':').map((part) => Number(part));
  if (!datePart || Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    hours,
    minutes,
    0,
    0
  );
};

const PropertyDetails: React.FC = () => {
  const { t, tp } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = React.useState<PropertyDetailsModel | null>(null);
  const [messageText, setMessageText] = React.useState('');
  const [emailSubject, setEmailSubject] = React.useState(tp('Tour request'));
  const [requesterName, setRequesterName] = React.useState('');
  const [tourDate, setTourDate] = React.useState('');
  const [tourTime, setTourTime] = React.useState('');
  const [senderEmail, setSenderEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('');
  const [paymentProof, setPaymentProof] = React.useState<File | null>(null);
  const [tourFormStatus, setTourFormStatus] = React.useState('');
  const [tourFormStatusTone, setTourFormStatusTone] = React.useState<'info' | 'error'>('info');
  const [isSubmittingTour, setIsSubmittingTour] = React.useState(false);
  const [showTourSuccessModal, setShowTourSuccessModal] = React.useState(false);
  const [tourSuccessName, setTourSuccessName] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [statusTone, setStatusTone] = React.useState<'success' | 'error'>('error');
  const [feedbackSubject, setFeedbackSubject] = React.useState(tp('RentalHub feedback'));
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [feedbackStatus, setFeedbackStatus] = React.useState('');
  const [feedbackStatusTone, setFeedbackStatusTone] = React.useState<'success' | 'error'>('success');
  const [senderEmailError, setSenderEmailError] = React.useState('');
  const [requesterNameError, setRequesterNameError] = React.useState('');
  const [phoneError, setPhoneError] = React.useState('');
  const [tourDateError, setTourDateError] = React.useState('');
  const [tourTimeError, setTourTimeError] = React.useState('');
  const [paymentMethodError, setPaymentMethodError] = React.useState('');
  const [paymentProofError, setPaymentProofError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [showReportModal, setShowReportModal] = React.useState(false);
  const paymentProofInputRef = React.useRef<HTMLInputElement | null>(null);

  const paymentMethodOptions: PaymentMethodOption[] = [
    {
      value: 'mobile_money',
      label: tp('Mobile Money'),
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="7" y="2" width="10" height="20" rx="2.2" fill="currentColor" opacity="0.16" />
          <rect x="8.8" y="4.4" width="6.4" height="13" rx="1.1" fill="currentColor" />
          <circle cx="12" cy="19.1" r="1" fill="currentColor" />
        </svg>
      ),
      details: {
        companyName: 'RentalHub Tours Ltd',
        destinationLabel: tp('MoMo Number'),
        destinationValue: tp('+250 788 123 456 (Name: RentalHub Tours)'),
        referenceHint: tp('Use your full name as payment reference')
      }
    },
    {
      value: 'bank_transfer',
      label: tp('Bank Transfer'),
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 9.2L12 4l9 5.2v1.6H3V9.2z" fill="currentColor" />
          <rect x="4.1" y="12" width="2.1" height="6.4" rx="0.5" fill="currentColor" opacity="0.8" />
          <rect x="8.2" y="12" width="2.1" height="6.4" rx="0.5" fill="currentColor" opacity="0.8" />
          <rect x="12.3" y="12" width="2.1" height="6.4" rx="0.5" fill="currentColor" opacity="0.8" />
          <rect x="16.4" y="12" width="2.1" height="6.4" rx="0.5" fill="currentColor" opacity="0.8" />
          <rect x="2.7" y="19.5" width="18.6" height="1.8" rx="0.7" fill="currentColor" />
        </svg>
      ),
      details: {
        companyName: 'RentalHub Tours Ltd',
        destinationLabel: tp('Bank Account'),
        destinationValue: tp('Bank of Kigali - 0123456789 (Name: RentalHub Tours Ltd)'),
        referenceHint: tp('Reference: TOUR + your phone number')
      }
    },
    {
      value: 'card',
      label: tp('Card Payment'),
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="2.2" y="5.2" width="19.6" height="13.6" rx="2" fill="currentColor" opacity="0.15" />
          <rect x="3.4" y="7.1" width="17.2" height="2.7" fill="currentColor" />
          <rect x="5" y="13" width="5.3" height="1.8" rx="0.8" fill="currentColor" />
          <rect x="11.2" y="13" width="7.6" height="1.8" rx="0.8" fill="currentColor" opacity="0.85" />
        </svg>
      ),
      details: {
        companyName: 'RentalHub Tours Ltd',
        destinationLabel: tp('Card Merchant'),
        destinationValue: tp('RentalHub Secure Checkout (Merchant ID: RH-TOUR-01)'),
        referenceHint: tp('Use the same email/phone from this form')
      }
    },
    {
      value: 'cash_deposit',
      label: tp('Cash Deposit'),
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="2.3" y="6" width="19.4" height="12" rx="2" fill="currentColor" opacity="0.16" />
          <circle cx="12" cy="12" r="2.8" fill="currentColor" />
          <circle cx="6.4" cy="12" r="1" fill="currentColor" opacity="0.9" />
          <circle cx="17.6" cy="12" r="1" fill="currentColor" opacity="0.9" />
        </svg>
      ),
      details: {
        companyName: 'RentalHub Tours Ltd',
        destinationLabel: tp('Deposit Office'),
        destinationValue: tp('KG 14 Ave, Kigali - Front Desk (RentalHub Office)'),
        referenceHint: tp('Ask for a stamped receipt before upload')
      }
    }
  ];

  const selectedPaymentMethod = paymentMethodOptions.find((option) => option.value === paymentMethod);
  const todayDate = formatDateInputValue(new Date());

  const validateContactFields = React.useCallback((values?: {
    name?: string;
    email?: string;
    phone?: string;
    paymentMethod?: string;
    paymentProof?: File | null;
  }) => {
    const nameValue = (values?.name ?? requesterName).trim();
    const emailValue = (values?.email ?? senderEmail).trim();
    const phoneValue = (values?.phone ?? phone).trim();
    const paymentMethodValue = (values?.paymentMethod ?? paymentMethod).trim();
    const paymentProofValue = values?.paymentProof ?? paymentProof;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = phoneValue.replace(/\D/g, '');

    let valid = true;

    if (!nameValue) {
      setRequesterNameError(tp('Your name is required.'));
      valid = false;
    } else {
      setRequesterNameError('');
    }

    if (emailValue && !emailPattern.test(emailValue)) {
      setSenderEmailError(tp('Please enter a valid email address.'));
      valid = false;
    } else {
      setSenderEmailError('');
    }

    if (!phoneValue) {
      setPhoneError(tp('Phone number is required.'));
      valid = false;
    } else if (phoneDigits.length < 7) {
      setPhoneError(tp('Please enter a valid phone number.'));
      valid = false;
    } else {
      setPhoneError('');
    }

    if (!paymentMethodValue) {
      setPaymentMethodError(tp('Please choose a payment method.'));
      valid = false;
    } else {
      setPaymentMethodError('');
    }

    if (!paymentProofValue) {
      setPaymentProofError(tp('Payment proof file is required.'));
      valid = false;
    } else {
      setPaymentProofError('');
    }

    return valid;
  }, [paymentMethod, paymentProof, phone, requesterName, senderEmail, tp]);

  React.useEffect(() => {
    const loadProperty = async () => {
      if (!id) return;
      try {
        const data = await apiRequest<PropertyDetailsModel>(`/api/properties/${id}`);
        setProperty(data);
        setEmailSubject(`${tp('Tour request')}: ${data.title}`);
      } catch (error) {
        setStatusTone('error');
        setStatus(tp((error as Error).message));
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id, tp]);

  const sendQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !messageText.trim()) return;

    if (!localStorage.getItem('token')) {
      setStatusTone('error');
      setStatus(tp('Please log in to send a message. Redirecting to login...'));
      navigate(`/login?redirect=${encodeURIComponent(`/properties/${property._id}`)}`);
      return;
    }

    try {
      await apiRequest('/api/messages', {
        method: 'POST',
        auth: true,
        body: { receiverId: property.landlordId._id, content: messageText }
      });
      setMessageText('');
      navigate(`/messages?userId=${encodeURIComponent(property.landlordId._id)}`);
    } catch (error) {
      setStatusTone('error');
      setStatus(tp((error as Error).message));
    }
  };

  const sendEmailForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!property || !id) return;

    const form = e.currentTarget;
    const formRequesterName = ((form.elements.namedItem('requesterName') as HTMLInputElement | null)?.value || requesterName).trim();
    const formSenderEmail = ((form.elements.namedItem('senderEmail') as HTMLInputElement | null)?.value || senderEmail).trim();
    const formPhone = ((form.elements.namedItem('phone') as HTMLInputElement | null)?.value || phone).trim();
    const formPaymentMethod = ((form.elements.namedItem('paymentMethod') as HTMLSelectElement | null)?.value || paymentMethod).trim();
    const formTourDate = tourDate.trim();
    const formTourTime = tourTime.trim();
    const selectedPaymentProof = (form.elements.namedItem('paymentProof') as HTMLInputElement | null)?.files?.[0] || paymentProof;

    setTourDateError('');
    setTourTimeError('');

    setRequesterName(formRequesterName);
    setSenderEmail(formSenderEmail);
    setPhone(formPhone);
    setPaymentMethod(formPaymentMethod);
    setPaymentProof(selectedPaymentProof);

    if (!localStorage.getItem('token')) {
      setTourFormStatusTone('error');
      setTourFormStatus(tp('Please log in to submit a paid tour request. Redirecting to login...'));
      navigate(`/login?redirect=${encodeURIComponent(`/properties/${property._id}`)}`);
      return;
    }

    if (!validateContactFields({
      name: formRequesterName,
      email: formSenderEmail,
      phone: formPhone,
      paymentMethod: formPaymentMethod,
      paymentProof: selectedPaymentProof
    })) {
      setTourFormStatusTone('error');
      setTourFormStatus(tp('Please correct the highlighted fields.'));
      return;
    }

    if (formTourTime && !formTourDate) {
      setTourDateError(tp('Please choose a tour date. Time cannot be set without a date.'));
      setTourFormStatusTone('error');
      setTourFormStatus(tp('Please choose a tour date. Time cannot be set without a date.'));
      return;
    }

    if (formTourDate) {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const requestedDate = parseDateOnly(formTourDate);
      if (!requestedDate) {
        setTourDateError(tp('That tour date is invalid. Please choose a real calendar date.'));
        setTourFormStatusTone('error');
        setTourFormStatus(tp('That tour date is invalid. Please choose a real calendar date.'));
        return;
      }

      if (requestedDate.getTime() < todayStart.getTime()) {
        const minAllowedDateMessage = `${tp('Tour date must be')} ${formatDateMessageValue(todayStart)} ${tp('or later.')}`;
        setTourDateError(minAllowedDateMessage);
        setTourFormStatusTone('error');
        setTourFormStatus(minAllowedDateMessage);
        return;
      }

      if (formTourTime) {
        const requestedDateTime = parseDateTime(formTourDate, formTourTime);
        if (!requestedDateTime) {
          setTourTimeError(tp('That tour time is invalid. Please choose a valid time.'));
          setTourFormStatusTone('error');
          setTourFormStatus(tp('That tour time is invalid. Please choose a valid time.'));
          return;
        }

        if (requestedDateTime.getTime() < now.getTime()) {
          setTourTimeError(tp('That time has already passed for the selected date. Please choose a later time.'));
          setTourFormStatusTone('error');
          setTourFormStatus(tp('That time has already passed for the selected date. Please choose a later time.'));
          return;
        }
      }
    }

    try {
      setIsSubmittingTour(true);
      setTourFormStatusTone('info');
      setTourFormStatus(tp('Sending tour request...'));
      const formData = new FormData();
      formData.append('requesterName', formRequesterName);
      formData.append('subject', emailSubject.trim());
      formData.append('senderEmail', formSenderEmail);
      formData.append('phone', formPhone);
      formData.append('tourDate', tourDate.trim());
      formData.append('tourTime', tourTime.trim());
      formData.append('paymentMethod', formPaymentMethod);

      if (selectedPaymentProof) {
        formData.append('paymentProof', selectedPaymentProof);
      }

      await apiRequest<{ message: string }>(`/api/properties/${id}/contact`, {
        method: 'POST',
        auth: true,
        body: formData
      });

      window.dispatchEvent(new Event('notifications:updated'));
      setTourSuccessName(formRequesterName);
      setShowTourSuccessModal(true);
      setTourFormStatus('');
      setRequesterName('');
      setEmailSubject(`${tp('Tour request')}: ${tp(property.title)}`);
      setSenderEmail('');
      setPhone('');
      setTourDate('');
      setTourTime('');
      setPaymentMethod('');
      setPaymentProof(null);
      setRequesterNameError('');
      setSenderEmailError('');
      setPhoneError('');
      setTourDateError('');
      setTourTimeError('');
      setPaymentMethodError('');
      setPaymentProofError('');
      if (paymentProofInputRef.current) {
        paymentProofInputRef.current.value = '';
      }
    } catch (error) {
      const rawMessage = (error as Error).message || '';
      const normalized = rawMessage.toLowerCase();
      setTourFormStatusTone('error');

      if (normalized.includes('email is required') || normalized.includes('valid email')) {
        setTourFormStatus(tp('Tour request could not be submitted. Please refresh and try again.'));
        return;
      }

      if (normalized.includes('phone is required') || normalized.includes('payment method') || normalized.includes('payment proof')) {
        setTourFormStatus(tp('Please complete phone, payment method, and payment proof, then try again.'));
        return;
      }

      if (normalized.includes('tour date') || normalized.includes('tour time')) {
        setTourFormStatus(tp((error as Error).message));
        return;
      }

      setTourFormStatus(tp('Tour request could not be submitted right now. Please try again in a moment.'));
    } finally {
      setIsSubmittingTour(false);
    }
  };

  const sendFeedbackForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackMessage.trim()) {
      setFeedbackStatusTone('error');
      setFeedbackStatus(tp('Please enter your feedback before sending.'));
      return;
    }

    setFeedbackStatusTone('success');
    setFeedbackStatus(tp('Feedback submitted successfully. Thank you for your feedback.'));
    setFeedbackMessage('');
  };

  if (loading) return <div className="loading">{tp('Loading property details...')}</div>;
  if (!property) return <div className="loading">{tp('Property not found.')}</div>;

  const localizedPropertyTitle = tp(property.title);
  const landlordName = `${property.landlordId.firstName} ${property.landlordId.lastName}`;
  return (
    <section className="property-details-wrap">
      <div className="hero-card glass">
        <h1>{localizedPropertyTitle}</h1>
        <p>{property.description}</p>
        <p className="meta">{property.city}, {property.state} • {property.propertyType}</p>
      </div>

      <div className="property-layout">
        <article className="glass details-main">
          {property.images?.length > 0 && (
            <div className="gallery">
              {property.images.map((img, idx) => (
                <img
                  key={idx}
                  src={resolveMediaUrl(img)}
                  alt={`${localizedPropertyTitle} ${idx + 1}`}
                  onClick={() => setLightboxIndex(idx)}
                />
              ))}
            </div>
          )}

          <div className="specs">
            <div><strong>{tp('Rent:')}</strong> {formatMoney(property.rent)}{t('per_month')}</div>
            <div><strong>{tp('Touring fee:')}</strong> {formatMoney(getTouringFee(property.touringFee))} {tp('(fixed)')}</div>
            <div><strong>{tp('Bedrooms:')}</strong> {property.bedrooms}</div>
            <div><strong>{tp('Bathrooms:')}</strong> {property.bathrooms}</div>
            <div><strong>{tp('Area:')}</strong> {property.squareFeet} {tp('sqft')}</div>
            <div><strong>{tp('Address:')}</strong> {property.address}, {property.city}, {property.state} {property.zipCode}</div>
          </div>

          {property.amenities?.length > 0 && (
            <div className="amenities-list">
              {property.amenities.map((item, idx) => (
                <span key={idx}>{item}</span>
              ))}
            </div>
          )}
        </article>

        <aside className="glass contact-pane">
          <h2>{tp('Landlord Details')}</h2>
          <p><strong>{tp('Name:')}</strong> {landlordName}</p>
          <p><strong>{tp('Email:')}</strong> <a href={`mailto:${property.landlordId.email}`}>{property.landlordId.email}</a></p>
          <p><strong>{tp('Phone:')}</strong> {property.landlordId.phone || tp('Not provided')}</p>

          <form className="modern-form" onSubmit={sendQuickMessage}>
            <h3>{tp('Message Landlord (Real-Time Chat)')}</h3>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={tp("Hi, I'm interested in this property...")}
              required
            />
            <button type="submit">{tp('Send Chat Message')}</button>
            <Link to="/messages" className="soft-link">{tp('Open Full Chat')}</Link>
          </form>

          <form className="modern-form" onSubmit={sendEmailForm}>
            <h3>{tp('Request Property Tour')}</h3>
            <p className="tour-fee-note">
              {tp('Note: You are only required to upload touring fee proof')} ({formatMoney(getTouringFee(property.touringFee))}) {tp('to submit this request for landlord review.')}
            </p>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder={tp('Tour request subject')}
              required
            />
            <input
              name="requesterName"
              value={requesterName}
              onChange={(e) => {
                setRequesterName(e.target.value);
                if (requesterNameError) {
                  setRequesterNameError('');
                }
              }}
              onBlur={() => validateContactFields()}
              placeholder={tp('Your name')}
              aria-invalid={!!requesterNameError}
              aria-describedby={requesterNameError ? 'requester-name-error' : undefined}
              required
            />
            {requesterNameError ? <p id="requester-name-error" className="field-error">{requesterNameError}</p> : null}
            <input
              name="senderEmail"
              type="email"
              value={senderEmail}
              onChange={(e) => {
                setSenderEmail(e.target.value);
                if (senderEmailError) {
                  setSenderEmailError('');
                }
              }}
              onBlur={() => validateContactFields()}
              placeholder={tp('Your email')}
              aria-invalid={!!senderEmailError}
              aria-describedby={senderEmailError ? 'contact-email-error' : undefined}
            />
            {senderEmailError ? <p id="contact-email-error" className="field-error">{senderEmailError}</p> : null}
            <input
              name="phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) {
                  setPhoneError('');
                }
              }}
              onBlur={() => validateContactFields()}
              placeholder={tp('Your phone')}
              aria-invalid={!!phoneError}
              aria-describedby={phoneError ? 'contact-phone-error' : undefined}
              required
            />
            {phoneError ? <p id="contact-phone-error" className="field-error">{phoneError}</p> : null}
            <input
              type="date"
              name="tourDate"
              value={tourDate}
              onChange={(e) => {
                e.currentTarget.setCustomValidity('');
                setTourDate(e.target.value);
                if (tourDateError) {
                  setTourDateError('');
                }
              }}
              onInvalid={(e) => {
                const input = e.currentTarget;
                if (input.validity.rangeUnderflow) {
                  const minDate = input.min ? parseDateOnly(input.min) : null;
                  const messageDate = minDate || new Date();
                  input.setCustomValidity(`${tp('Tour date must be')} ${formatDateMessageValue(messageDate)} ${tp('or later.')}`);
                  return;
                }

                input.setCustomValidity(tp('That tour date is invalid. Please choose a real calendar date.'));
              }}
              min={todayDate}
              placeholder={tp('Preferred tour date')}
              aria-invalid={!!tourDateError}
              aria-describedby={tourDateError ? 'tour-date-error' : undefined}
            />
            {tourDateError ? <p id="tour-date-error" className="field-error">{tourDateError}</p> : null}
            <input
              type="time"
              name="tourTime"
              value={tourTime}
              onChange={(e) => {
                setTourTime(e.target.value);
                if (tourTimeError) {
                  setTourTimeError('');
                }
              }}
              placeholder={tp('Preferred tour time')}
              aria-invalid={!!tourTimeError}
              aria-describedby={tourTimeError ? 'tour-time-error' : undefined}
            />
            {tourTimeError ? <p id="tour-time-error" className="field-error">{tourTimeError}</p> : null}
            <input type="hidden" name="paymentMethod" value={paymentMethod} />
            <div
              className="payment-method-grid"
              role="radiogroup"
              aria-label={tp('Payment method')}
              aria-invalid={!!paymentMethodError}
              aria-describedby={paymentMethodError ? 'payment-method-error' : undefined}
            >
              {paymentMethodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === option.value}
                  className={`payment-method-card ${paymentMethod === option.value ? 'selected' : ''}`}
                  onClick={() => {
                    setPaymentMethod(option.value);
                    if (paymentMethodError) {
                      setPaymentMethodError('');
                    }
                  }}
                >
                  <span className="payment-method-logo">{option.icon}</span>
                  <span>{tp(option.label)}</span>
                </button>
              ))}
            </div>
            {paymentMethodError ? <p id="payment-method-error" className="field-error">{paymentMethodError}</p> : null}

            {selectedPaymentMethod ? (
              <div className="payment-details-box" aria-live="polite">
                <h4>{tp('Payment Details')}</h4>
                <p><strong>{tp('Company:')}</strong> {tp(selectedPaymentMethod.details.companyName)}</p>
                <p><strong>{tp('Amount:')}</strong> {formatMoney(getTouringFee(property.touringFee))}</p>
                <p><strong>{tp(selectedPaymentMethod.details.destinationLabel)}:</strong> {tp(selectedPaymentMethod.details.destinationValue)}</p>
                <p><strong>{tp('Reference Hint:')}</strong> {tp(selectedPaymentMethod.details.referenceHint)}</p>
              </div>
            ) : null}

            <input
              name="paymentProof"
              id="payment-proof-input"
              ref={paymentProofInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setPaymentProof(file);
                if (paymentProofError) {
                  setPaymentProofError('');
                }
              }}
              onBlur={() => validateContactFields()}
              aria-invalid={!!paymentProofError}
              aria-describedby={paymentProofError ? 'payment-proof-error' : undefined}
              required
            />
            {paymentProofError ? <p id="payment-proof-error" className="field-error">{paymentProofError}</p> : null}
            <p className="field-hint">{tp('Choose a payment method and upload payment proof (JPG, PNG, WEBP, or PDF).')}</p>
            <button type="submit" disabled={isSubmittingTour}>{isSubmittingTour ? tp('Sending...') : tp('Send Tour Request')}</button>
            {tourFormStatus ? (
              <p
                aria-live="polite"
                className={tourFormStatusTone === 'info' ? 'info' : 'error'}
              >
                {tourFormStatus}
              </p>
            ) : null}
          </form>

          {status && <p className={statusTone === 'success' ? 'success' : 'error'}>{status}</p>}

          <form className="modern-form" onSubmit={sendFeedbackForm}>
            <h3>{tp('Send Feedback To RentalHub')}</h3>
            <input
              value={feedbackSubject}
              onChange={(e) => setFeedbackSubject(e.target.value)}
              placeholder={tp('Feedback subject')}
              required
            />
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder={tp('Tell us your feedback, suggestion, or issue')}
              required
            />
            <button type="submit">{tp('Submit Feedback')}</button>
          </form>

          {feedbackStatus && <p className={feedbackStatusTone === 'success' ? 'success' : 'error'}>{feedbackStatus}</p>}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              type="button"
              className="report-link-btn"
              onClick={() => setShowReportModal(true)}
            >
              &#9872; {tp('Report this listing')}
            </button>
          </div>
        </aside>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={property.images.map((img) => resolveMediaUrl(img))}
          initialIndex={lightboxIndex}
          title={localizedPropertyTitle}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {showReportModal && property && (
        <ReportModal
          targetType="property"
          targetId={property._id}
          targetName={localizedPropertyTitle}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showTourSuccessModal ? (
        <div className="tour-success-modal-overlay" role="presentation" onClick={() => setShowTourSuccessModal(false)}>
          <div className="tour-success-modal" role="dialog" aria-modal="true" aria-labelledby="tour-success-title" onClick={(e) => e.stopPropagation()}>
            <div className="tour-success-badge">{tp('Request Sent')}</div>
            <h3 id="tour-success-title">{tp('Thank you,')} {tourSuccessName || tp('there')}!</h3>
            <p>
              {tp('Your tour request was submitted successfully and is now pending landlord review.')}
              {' '}
              {tp('You can track updates from Notifications and Tour Requests.')}
            </p>
            <button type="button" onClick={() => setShowTourSuccessModal(false)}>{tp('Great, Close')}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PropertyDetails;
