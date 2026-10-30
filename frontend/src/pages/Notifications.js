import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Inbox,
  Trash2,
} from 'lucide-react';
import { notificationsApi } from '../api/client';
import { formatRelative, titleCase } from '../utils/format';
import { notifyNotificationsChanged } from '../components/NotificationBell';
import PageHeader from '../components/PageHeader';
import './Notifications.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    (nextPage = 1, nextFilter = filter, append = false) => {
      setLoading(true);
      notificationsApi
        .list({
          page: nextPage,
          limit: 20,
          unread: nextFilter === 'unread' ? true : undefined,
        })
        .then((response) => {
          const items = response.data.notifications || [];
          setNotifications((current) => (append ? [...current, ...items] : items));
          setUnreadCount(response.meta?.unread_count || 0);
          setTotalPages(response.meta?.totalPages || 0);
          setPage(nextPage);
        })
        .catch((err) => setError(err.message || 'Unable to load notifications.'))
        .finally(() => setLoading(false));
    },
    [filter]
  );

  useEffect(() => {
    load(1, filter, false);
  }, [filter, load]);

  const handleMarkRead = async (notificationId) => {
    try {
      await notificationsApi.markRead(notificationId);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      notifyNotificationsChanged();
    } catch (err) {
      setError(err.message || 'Unable to mark that notification as read.');
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );
      setUnreadCount(0);
      notifyNotificationsChanged();
    } catch (err) {
      setError(err.message || 'Unable to mark all notifications as read.');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsApi.remove(notificationId);
      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId)
      );
      const removed = notifications.find((item) => item.id === notificationId);
      if (removed && !removed.is_read) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      notifyNotificationsChanged();
    } catch (err) {
      setError(err.message || 'Unable to delete that notification.');
    }
  };

  return (
    <div className="notifications">
      <PageHeader
        eyebrow="Notifications"
        icon={Bell}
        title="Your updates"
        description="Milestones, deadlines, project feedback, interviews, and announcements."
        actions={
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleMarkAll}
            disabled={!unreadCount}
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        }
      />

      <section className="section section--soft">
        <div className="container">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="notifications__filters">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`notifications__filter ${
                  filter === item.id ? 'is-active' : ''
                }`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {item.id === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
              </button>
            ))}
          </div>

          {loading && page === 1 ? (
            <div className="spinner" role="status" aria-label="Loading notifications" />
          ) : notifications.length ? (
            <>
              <div className="notifications__list">
                {notifications.map((item) => (
                  <article
                    className={`card notifications__item ${
                      item.is_read ? '' : 'is-unread'
                    }`}
                    key={item.id}
                  >
                    <span className="notifications__icon" aria-hidden="true">
                      {item.is_read ? <Inbox size={18} /> : <Bell size={18} />}
                    </span>

                    <div className="notifications__body">
                      <div className="notifications__head">
                        <span className={`notifications__type notifications__type--${item.type}`}>
                          {titleCase(item.type)}
                        </span>
                        <time dateTime={item.created_at}>
                          {formatRelative(item.created_at)}
                        </time>
                      </div>
                      <h2>{item.title}</h2>
                      {item.body && <p>{item.body}</p>}
                      <div className="notifications__actions">
                        {item.link && (
                          <Link to={item.link} className="btn btn-outline btn-sm">
                            Open
                          </Link>
                        )}
                        {!item.is_read && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleMarkRead(item.id)}
                          >
                            <CheckCircle2 size={14} /> Mark read
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {page < totalPages && (
                <div className="notifications__more">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => load(page + 1, filter, true)}
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Bell size={28} />
              <p>
                {filter === 'unread'
                  ? 'No unread notifications. You are all caught up.'
                  : 'No notifications yet.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Notifications;
