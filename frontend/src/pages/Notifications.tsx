import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useI18n } from '../lib/useI18n';
import '../styles/Operations.css';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'tour_request_created' | 'tour_request_status' | 'system';
  link?: string;
  read: boolean;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const { tp } = useI18n();
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    try {
      const data = await apiRequest<NotificationItem[]>('/api/notifications', { auth: true });
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [loadNotifications]);

  const markAllRead = async () => {
    setWorking(true);
    try {
      await apiRequest('/api/notifications/read-all', { method: 'PUT', auth: true });
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      window.dispatchEvent(new Event('notifications:updated'));
    } finally {
      setWorking(false);
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.read) {
      await apiRequest(`/api/notifications/${notification._id}/read`, { method: 'PUT', auth: true });
      setNotifications((prev) => prev.map((item) => (
        item._id === notification._id ? { ...item, read: true } : item
      )));
      window.dispatchEvent(new Event('notifications:updated'));
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  if (loading) {
    return <div className="loading">{tp('Loading notifications...')}</div>;
  }

  return (
    <section className="operations-page">
      <header className="operations-header glass">
        <div>
          <p className="operations-kicker">{tp('Activity Center')}</p>
          <h1>{tp('Notifications')}</h1>
          <p>{tp('Track tour request updates and account activity without relying on email delivery.')}</p>
        </div>
        <div className="operations-header-actions">
          <span className="operations-badge">{unreadCount} {tp('unread')}</span>
          <button type="button" className="soft-btn" onClick={markAllRead} disabled={working || unreadCount === 0}>
            {working ? tp('Updating...') : tp('Mark All Read')}
          </button>
        </div>
      </header>

      <div className="operations-list glass">
        {notifications.length === 0 ? (
          <div className="operations-empty-state">
            <h2>{tp('No notifications yet')}</h2>
            <p>{tp('When tour requests or account events happen, they will show up here.')}</p>
          </div>
        ) : notifications.map((notification) => (
          <button
            key={notification._id}
            type="button"
            className={`operations-item ${notification.read ? 'operations-item-read' : 'operations-item-unread'}`}
            onClick={() => openNotification(notification)}
          >
            <div className="operations-item-main">
              <div className="operations-item-heading-row">
                <h2>{notification.title}</h2>
                {!notification.read ? <span className="operations-dot" aria-hidden="true" /> : null}
              </div>
              <p>{notification.message}</p>
            </div>
            <small>{new Date(notification.createdAt).toLocaleString()}</small>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Notifications;