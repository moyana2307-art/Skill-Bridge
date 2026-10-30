import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationsApi } from '../api/client';
import './NotificationBell.css';

export const NOTIFICATIONS_CHANGED_EVENT = 'skillbridge:notifications-changed';

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

function NotificationBell({ compact = false, onNavigate }) {
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    notificationsApi
      .unreadCount()
      .then((response) => setCount(response.data.unread_count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
    };
  }, [load]);

  return (
    <Link
      to="/notifications"
      className={`notification-bell ${compact ? 'notification-bell--compact' : ''}`}
      onClick={onNavigate}
      aria-label={
        count > 0 ? `Notifications, ${count} unread` : 'Notifications'
      }
      title="Notifications"
    >
      <Bell size={20} strokeWidth={1.9} aria-hidden="true" />
      {count > 0 && (
        <span className="notification-bell__badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export default NotificationBell;
