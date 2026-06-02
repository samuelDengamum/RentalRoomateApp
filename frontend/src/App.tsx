import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import './styles/App.css';
import { apiRequest } from './lib/api';

/**
 * Main Application Component.
 * Sets up routing, top-level layout (navbar/footer), and global state providers.
 * Secures routes using ProtectedRoute and AdminRoute components.
 */

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Properties from './pages/Properties';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';
import RoommateBrowse from './pages/RoommateBrowse';
import RoommateProfile from './pages/RoommateProfile';
import CreateProperty from './pages/CreateProperty';
import Messages from './pages/Messages';
import PropertyDetails from './pages/PropertyDetails';
import EditProperty from './pages/EditProperty';
import TourRequests from './pages/TourRequests';
import AdminDashboard from './pages/AdminDashboard';
import Terms from './pages/Terms';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import NonAdminRoute from './components/NonAdminRoute';
import OnboardingTour from './components/OnboardingTour';
import { AppLanguage, getIntlPreferences, getLanguageMeta, LANGUAGE_OPTIONS, saveIntlPreferences, translate, translateText } from './lib/international';

interface ConversationSummary {
  unreadCount: number;
}

interface NotificationCountResponse {
  unreadCount: number;
}

interface SupportMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
}

const getSupportReply = (question: string, isLoggedIn: boolean, isAdmin: boolean): string => {
  const normalized = question.toLowerCase();

  if (/(list|listing|post|property|apartment|rent)/.test(normalized)) {
    if (isAdmin) {
      return 'Admins review and approve listings from the Admin Dashboard. Open the admin panel to manage pending listings and moderation notes.';
    }
    return isLoggedIn
      ? 'To publish a listing, open Dashboard and click Create Property. Complete details and photos, then submit for admin review.'
      : 'Create an account first, then go to Dashboard and use Create Property to submit your listing for review.';
  }

  if (/(tour|visit|viewing|schedule)/.test(normalized)) {
    return 'To request a tour, open a property and submit date, time, and payment proof. You can track status updates in Tour Requests.';
  }

  if (/(roommate|flatmate|shared|share)/.test(normalized)) {
    return isLoggedIn
      ? 'Use Roommates to browse profiles, apply filters, and create or update your own roommate profile for better matches.'
      : 'Sign in to create a roommate profile and contact people directly through in-app messaging.';
  }

  if (/(message|chat|inbox|conversation)/.test(normalized)) {
    return 'Open Messages to start conversations. Unread counters update automatically, and blocking rules are enforced for safer communication.';
  }

  if (/(favorite|save|wishlist)/.test(normalized)) {
    return 'Tap the heart icon on a listing to save it. You can manage saved items anytime from Favorites.';
  }

  if (/(price|pricing|plan|subscription|cost)/.test(normalized)) {
    return 'Open the Pricing page to compare plans and choose what works best for your rental goals.';
  }

  if (/(reset|password|login|register|account)/.test(normalized)) {
    return 'For access issues, use Login, Register, or Forgot Password from the top menu. After logging in, you can manage account details in Profile.';
  }

  if (/(language|french|arabic|english|locale|currency)/.test(normalized)) {
    return 'Use the language selector in the top-right navbar to switch language. Your preference is saved to your account.';
  }

  return 'I can help with listings, tours, roommate matching, messaging, pricing, account access, and language settings. Ask me one of those topics.';
};

const NavIcon: React.FC<{ name: 'favorites' | 'messages' | 'notifications' | 'tours' | 'profile' }> = ({ name }) => {
  const icons: Record<string, React.ReactNode> = {
    favorites: (
      <path d="M12 20.6 6.95 15.9C4.15 13.29 2.75 11.89 2.75 9.9a4.2 4.2 0 0 1 4.2-4.2c1.51 0 2.96.73 3.9 1.9.95-1.17 2.39-1.9 3.9-1.9a4.2 4.2 0 0 1 4.2 4.2c0 1.99-1.4 3.39-4.2 6L12 20.6z" />
    ),
    messages: (
      <>
        <path d="M4 5.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.5L4 21v-13.5a2 2 0 0 1 2-2z" />
        <path d="m6.7 8.5 5.3 3.7 5.3-3.7" />
      </>
    ),
    notifications: (
      <>
        <path d="M6 10a6 6 0 1 1 12 0v5l2 2H4l2-2v-5z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
    tours: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.8 2.8" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8.3" r="3.3" />
        <path d="M5 19.2c1.7-2.45 4.03-3.7 7-3.7s5.3 1.25 7 3.7" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const FlagSvg: React.FC<{ code: AppLanguage }> = ({ code }) => {
  if (code === 'en') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="28" height="14" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
        <rect width="60" height="30" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
      </svg>
    );
  }
  if (code === 'fr') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" width="28" height="18" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
        <rect width="10" height="20" fill="#002395"/>
        <rect x="10" width="10" height="20" fill="#EDEDED"/>
        <rect x="20" width="10" height="20" fill="#ED2939"/>
      </svg>
    );
  }
  // Saudi Arabia
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" width="28" height="18" style={{ borderRadius: 2, display: 'block', flexShrink: 0 }}>
      <rect width="30" height="20" fill="#006C35"/>
      <rect y="18" width="30" height="2" fill="#006C35"/>
      <text x="15" y="12.5" textAnchor="middle" fontSize="6.5" fill="white" fontFamily="Arial,sans-serif" fontWeight="bold">&#x627;&#x644;&#x644;&#x647;</text>
    </svg>
  );
};

const AppLayout: React.FC<{
  isLoggedIn: boolean;
  isAdmin: boolean;
  showTour: boolean;
  tourUserType: string;
  onAuthSuccess: () => void;
  onLogout: () => void;
  onRoleConfirmed: (role: string) => void;
  onTourDismiss: () => void;
}> = ({ isLoggedIn, isAdmin, showTour, tourUserType, onAuthSuccess, onLogout, onRoleConfirmed, onTourDismiss }) => {
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [language, setLanguage] = React.useState<AppLanguage>(getIntlPreferences().language);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = React.useState(false);
  const [isSupportOpen, setIsSupportOpen] = React.useState(false);
  const [supportInput, setSupportInput] = React.useState('');
  const [supportMessages, setSupportMessages] = React.useState<SupportMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Hi, I am RentalHub AI Support. Ask me about listings, tours, roommates, messages, pricing, or account help.',
    },
  ]);
  const languageMenuRef = React.useRef<HTMLLIElement | null>(null);
  const supportPanelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageMeta(language).dir;
  }, [language]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (isSupportOpen && supportPanelRef.current) {
      supportPanelRef.current.scrollTop = supportPanelRef.current.scrollHeight;
    }
  }, [isSupportOpen, supportMessages]);

  const t = React.useCallback((key: string) => translate(language, key), [language]);
  const tp = React.useCallback((text: string) => translateText(language, text), [language]);

  // Confirm role from server on every login-state mount (handles page refresh with existing token)
  React.useEffect(() => {
    if (!isLoggedIn) return;
    apiRequest<{ role?: string; preferredLanguage?: AppLanguage; preferredLocale?: string; preferredCurrency?: 'RWF' | 'USD' | 'EUR' }>('/api/auth/profile', { auth: true })
      .then(profile => {
        if (profile.role) {
          localStorage.setItem('userRole', profile.role);
          onRoleConfirmed(profile.role);
        }

        saveIntlPreferences({
          language: profile.preferredLanguage,
          locale: profile.preferredLocale,
          currency: profile.preferredCurrency
        });

        if (profile.preferredLanguage) {
          setLanguage(profile.preferredLanguage);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const refreshUnreadCounter = React.useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    try {
      const [conversations, notificationSummary] = await Promise.all([
        apiRequest<ConversationSummary[]>('/api/messages/conversations', { auth: true }),
        apiRequest<NotificationCountResponse>('/api/notifications/unread-count', { auth: true })
      ]);
      const totalUnread = conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
      setUnreadMessages(totalUnread);
      setUnreadNotifications(notificationSummary.unreadCount || 0);
    } catch {
      // Ignore transient polling failures.
    }
  }, [isLoggedIn]);

  React.useEffect(() => {
    refreshUnreadCounter();
  }, [refreshUnreadCounter, location.pathname]);

  React.useEffect(() => {
    if (!isLoggedIn) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    const timerId = window.setInterval(() => {
      refreshUnreadCounter();
    }, 10000);

    const handleMessagesUpdated = () => {
      refreshUnreadCounter();
    };

    const handleNotificationsUpdated = () => {
      refreshUnreadCounter();
    };

    const handleWindowFocus = () => {
      refreshUnreadCounter();
    };

    window.addEventListener('messages:updated', handleMessagesUpdated as EventListener);
    window.addEventListener('notifications:updated', handleNotificationsUpdated as EventListener);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.clearInterval(timerId);
      window.removeEventListener('messages:updated', handleMessagesUpdated as EventListener);
      window.removeEventListener('notifications:updated', handleNotificationsUpdated as EventListener);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isLoggedIn, refreshUnreadCounter]);

  const handleSupportSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedInput = supportInput.trim();
    if (!trimmedInput) return;

    const messageId = Date.now();
    setSupportMessages((prev) => [
      ...prev,
      { id: messageId, role: 'user', text: trimmedInput },
    ]);
    setSupportInput('');

    setSupportMessages((prev) => [
      ...prev,
      {
        id: messageId + 1,
        role: 'assistant',
        text: getSupportReply(trimmedInput, isLoggedIn, isAdmin),
      },
    ]);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo" aria-label={tp('RentalHub home page')}>
            <span className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path d="M12 2.9 2.6 10.7l1.4 1.7 1.7-1.4v9.4c0 .9.8 1.6 1.7 1.6h3.9v-6.1h1.5V22h3.9c.9 0 1.7-.7 1.7-1.6V11l1.7 1.4 1.4-1.7L12 2.9zm5 17h-2.4v-6.1c0-.7-.6-1.2-1.3-1.2h-2.6c-.7 0-1.3.5-1.3 1.2v6.1H7V9.2l5-4.1 5 4.1v10.7z" />
              </svg>
            </span>
            <span className="logo-text">RentalHub</span>
          </Link>
          <ul className="nav-links">
            <li><Link to="/" className="nav-primary-link">{t('nav_home')}</Link></li>
            <li><Link to="/properties" className="nav-primary-link">{t('nav_properties')}</Link></li>
            {!isAdmin && <li><Link to="/roommates" className="nav-primary-link">{t('nav_roommates')}</Link></li>}
            {!isAdmin && <li><Link to="/pricing" className="nav-primary-link">{tp('Plans')}</Link></li>}
            {isLoggedIn ? (
              <>
                {!isAdmin && <li><Link to="/dashboard" className="nav-primary-link">{t('nav_dashboard')}</Link></li>}
                {!isAdmin && (
                  <li className="nav-icon-item">
                    <Link to="/favorites" className="nav-icon-link" aria-label={t('nav_favorites')} title={t('nav_favorites')}>
                      <NavIcon name="favorites" />
                    </Link>
                  </li>
                )}
                {!isAdmin && (
                  <li className="nav-icon-item">
                    <Link to="/messages" className="nav-icon-link" aria-label={t('nav_messages')} title={t('nav_messages')}>
                      <NavIcon name="messages" />
                      {unreadMessages > 0 ? (
                        <span className="nav-message-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                      ) : null}
                    </Link>
                  </li>
                )}
                <li className="nav-icon-item">
                  <Link to="/notifications" className="nav-icon-link" aria-label={t('nav_notifications')} title={t('nav_notifications')}>
                    <NavIcon name="notifications" />
                    {unreadNotifications > 0 ? (
                      <span className="nav-message-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
                    ) : null}
                  </Link>
                </li>
                {!isAdmin && (
                  <li className="nav-icon-item">
                    <Link to="/tour-requests" className="nav-icon-link" aria-label={t('nav_tours')} title={t('nav_tours')}>
                      <NavIcon name="tours" />
                    </Link>
                  </li>
                )}
                {isAdmin && (
                  <li><Link to="/admin" className="nav-admin-link">{t('nav_admin')}</Link></li>
                )}
                <li className="nav-icon-item">
                  <Link to="/profile" className="nav-icon-link" aria-label={t('nav_profile')} title={t('nav_profile')}>
                    <NavIcon name="profile" />
                  </Link>
                </li>
                <li><button onClick={onLogout}>{t('nav_logout')}</button></li>
              </>
            ) : (
              <>
                <li><Link to="/login" className="nav-primary-link">{t('nav_login')}</Link></li>
                <li><Link to="/register" className="nav-primary-link">{t('nav_register')}</Link></li>
              </>
            )}

            <li className="nav-language-menu" ref={languageMenuRef}>
              <button
                type="button"
                className="nav-language-trigger"
                aria-haspopup="menu"
                aria-expanded={isLanguageMenuOpen}
                onClick={() => setIsLanguageMenuOpen((open) => !open)}
              >
                <FlagSvg code={language} />
                <span className="nav-language-caret" aria-hidden="true">▾</span>
              </button>

              {isLanguageMenuOpen ? (
                <div className="nav-language-panel" role="menu" aria-label="Language menu">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitem"
                      className={`nav-language-option${language === option.value ? ' active' : ''}`}
                      onClick={() => {
                        setLanguage(option.value);
                        saveIntlPreferences({ language: option.value });
                        window.dispatchEvent(new Event('intl:updated'));
                        setIsLanguageMenuOpen(false);
                      }}
                    >
                      <FlagSvg code={option.value} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          </ul>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home isLoggedIn={isLoggedIn} />} />
          <Route path="/login" element={<Login onAuthSuccess={onAuthSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Register onAuthSuccess={onAuthSuccess} />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetails />} />
          <Route path="/pricing" element={<Pricing isLoggedIn={isLoggedIn} />} />
          <Route path="/roommates" element={<RoommateBrowse />} />
          <Route
            path="/roommates/profile"
            element={(
              <NonAdminRoute>
                <RoommateProfile />
              </NonAdminRoute>
            )}
          />
          <Route
            path="/dashboard"
            element={(
              <NonAdminRoute>
                <Dashboard />
              </NonAdminRoute>
            )}
          />
          <Route
            path="/favorites"
            element={(
              <NonAdminRoute>
                <Favorites />
              </NonAdminRoute>
            )}
          />
          <Route
            path="/create-property"
            element={(
              <NonAdminRoute>
                <CreateProperty />
              </NonAdminRoute>
            )}
          />
          <Route
            path="/properties/:id/edit"
            element={(
              <NonAdminRoute>
                <EditProperty />
              </NonAdminRoute>
            )}
          />
          <Route
            path="/messages"
            element={(
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/notifications"
            element={(
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/tour-requests"
            element={(
              <NonAdminRoute>
                <TourRequests />
              </NonAdminRoute>
            )}
          />
          <Route
            path="/admin"
            element={(
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            )}
          />
          <Route
            path="/profile"
            element={(
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </main>

      {showTour && (
        <OnboardingTour userType={tourUserType} onDismiss={onTourDismiss} />
      )}

      <button
        type="button"
        className="whatsapp-fab"
        aria-label="Open AI support"
        aria-expanded={isSupportOpen}
        onClick={() => setIsSupportOpen((open) => !open)}
      >
        <span className="whatsapp-fab__icon" aria-hidden="true">
          <img src="/chatbot-icon.svg" alt="" />
        </span>
      </button>

      {isSupportOpen ? (
        <section className="ai-support-panel" aria-label="AI support chat">
          <header className="ai-support-panel__header">
            <h2>AI Support</h2>
            <button
              type="button"
              className="ai-support-panel__close"
              onClick={() => setIsSupportOpen(false)}
              aria-label="Close AI support"
            >
              x
            </button>
          </header>

          <div className="ai-support-panel__messages" ref={supportPanelRef}>
            {supportMessages.map((message) => (
              <div key={message.id} className={`ai-support-msg ai-support-msg--${message.role}`}>
                {message.text}
              </div>
            ))}
          </div>

          <form className="ai-support-panel__composer" onSubmit={handleSupportSubmit}>
            <input
              type="text"
              value={supportInput}
              onChange={(event) => setSupportInput(event.target.value)}
              placeholder="Ask about listings, tours, roommates..."
              aria-label="Ask AI support"
            />
            <button type="submit">Send</button>
          </form>
        </section>
      ) : null}
    </>
  );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(!!localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = React.useState(localStorage.getItem('userRole') === 'admin');
  const [showTour, setShowTour] = React.useState(false);
  const [tourUserType, setTourUserType] = React.useState('renter');

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    setIsAdmin(localStorage.getItem('userRole') === 'admin');
    if (localStorage.getItem('showOnboardingTour') === 'true') {
      setTourUserType(localStorage.getItem('onboardingUserType') || 'renter');
      setShowTour(true);
      localStorage.removeItem('showOnboardingTour');
      localStorage.removeItem('onboardingUserType');
    }
  };

  const handleTourDismiss = () => {
    setShowTour(false);
  };

  const handleRoleConfirmed = (role: string) => {
    setIsAdmin(role === 'admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  return (
    <BrowserRouter>
      <AppLayout
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        showTour={showTour}
        tourUserType={tourUserType}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onRoleConfirmed={handleRoleConfirmed}
        onTourDismiss={handleTourDismiss}
      />
    </BrowserRouter>
  );
};

export default App;
