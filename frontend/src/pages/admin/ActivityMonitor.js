import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi } from '../../api/client';
import { formatDateTime, formatRelative, titleCase } from '../../utils/format';
import { Loading, Notice, Pager } from './adminUi';

const CATEGORIES = [
  'all',
  'registrations',
  'auth',
  'ai',
  'learning',
  'payments',
  'subscriptions',
  'admin',
];

const POLL_MS = 15000;

function ActivityMonitor() {
  const [rows, setRows] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [filters, setFilters] = useState({
    category: 'all',
    event_type: '',
    search: '',
    from: '',
    to: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    (options = {}) => {
      if (!options.silent) setLoading(true);

      return adminApi
        .activity({
          page: filters.page,
          limit: 25,
          category: filters.category === 'all' ? undefined : filters.category,
          event_type: filters.event_type || undefined,
          search: filters.search || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        })
        .then((response) => {
          setRows(response.data.activity || []);
          if (response.data.event_types?.length) {
            setEventTypes(response.data.event_types);
          }
          setMeta(response.meta || { page: filters.page, totalPages: 0, total: 0 });
        })
        .catch((err) => {
          if (!options.silent) setError(err.message || 'Unable to load activity.');
        })
        .finally(() => {
          if (!options.silent) setLoading(false);
        });
    },
    [filters]
  );

  useEffect(() => {
    setError('');
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const setFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  return (
    <>
      <Notice error={error} />

      <div className="admin-toolbar">
        <label className="admin-toolbar__field admin-toolbar__grow">
          Search
          <span className="admin__search">
            <Search size={15} aria-hidden="true" />
            <input
              className="form-input"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="User, email, or event title"
            />
          </span>
        </label>
        <label className="admin-toolbar__field">
          Category
          <select
            className="form-select"
            value={filters.category}
            onChange={(event) => setFilter('category', event.target.value)}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {titleCase(category)}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-toolbar__field">
          Event type
          <select
            className="form-select"
            value={filters.event_type}
            onChange={(event) => setFilter('event_type', event.target.value)}
          >
            <option value="">All events</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-toolbar__field">
          From
          <input
            type="date"
            className="form-input"
            value={filters.from}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </label>
        <label className="admin-toolbar__field">
          To
          <input
            type="date"
            className="form-input"
            value={filters.to}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </label>
        <span className="admin__live-dot" title="Refreshes every 15 seconds" />
      </div>

      <article className="card admin__activity">
        <div className="admin__users-head">
          <h2>Live activity</h2>
          <span>{meta.total} events</span>
        </div>

        {loading ? (
          <Loading label="Loading activity" />
        ) : rows.length ? (
          <ul className="admin__activity-list">
            {rows.map((item) => (
              <li className="admin__activity-item" key={item.id}>
                <span
                  className={`admin__activity-dot admin__activity-dot--${String(
                    item.event_type
                  ).split('.')[0]}`}
                  aria-hidden="true"
                />
                <div className="admin__activity-main">
                  <strong>{item.title || titleCase(item.event_type)}</strong>
                  <small>
                    {item.user_name || item.user_email || 'Anonymous'}
                    {item.entity_type ? ` · ${item.entity_type}` : ''}
                    {item.entity_id ? ` #${item.entity_id}` : ''} ·{' '}
                    {formatDateTime(item.created_at)} ({formatRelative(item.created_at)})
                    {item.ip_address ? ` · ${item.ip_address}` : ''}
                  </small>
                </div>
                <span className="admin__activity-type">{item.event_type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No activity matches those filters.</p>
        )}

        <Pager meta={meta} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
      </article>
    </>
  );
}

export default ActivityMonitor;
