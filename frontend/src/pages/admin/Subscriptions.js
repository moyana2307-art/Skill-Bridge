import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Search } from 'lucide-react';
import { adminApi } from '../../api/client';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../../utils/format';
import {
  Loading,
  Notice,
  Pager,
  PlanBadge,
  StatusPill,
} from './adminUi';

const PLANS = ['free', 'plus', 'premium', 'institution'];
const STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'expired'];

function Subscriptions() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    plan: '',
    status: '',
    expiring: false,
    from: '',
    to: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');

    adminApi
      .subscriptions({
        page: filters.page,
        limit: 25,
        search: filters.search || undefined,
        plan: filters.plan || undefined,
        status: filters.status || undefined,
        expiring: filters.expiring ? true : undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      .then((response) => {
        setRows(response.data.subscriptions || []);
        setMeta(response.meta || { page: filters.page, totalPages: 0, total: 0 });
      })
      .catch((err) => setError(err.message || 'Unable to load subscriptions.'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const setFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  const openDetail = async (subscriptionId) => {
    setError('');
    try {
      const response = await adminApi.subscription(subscriptionId);
      setSelected(response.data);
    } catch (err) {
      setError(err.message || 'Unable to load that subscription.');
    }
  };

  const exportRows = async () => {
    setExporting(true);
    setError('');
    try {
      await adminApi.exportSubscriptions({
        search: filters.search || undefined,
        plan: filters.plan || undefined,
        status: filters.status || undefined,
        expiring: filters.expiring ? true : undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
    } catch (err) {
      setError(err.message || 'Unable to export subscriptions.');
    } finally {
      setExporting(false);
    }
  };

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
              placeholder="User name or email"
            />
          </span>
        </label>
        <label className="admin-toolbar__field">
          Plan
          <select
            className="form-select"
            value={filters.plan}
            onChange={(event) => setFilter('plan', event.target.value)}
          >
            <option value="">All plans</option>
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {titleCase(plan)}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-toolbar__field">
          Status
          <select
            className="form-select"
            value={filters.status}
            onChange={(event) => setFilter('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {titleCase(status)}
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
        <label className="admin-toolbar__field">
          Expiring
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minHeight: 38 }}>
            <input
              type="checkbox"
              checked={filters.expiring}
              onChange={(event) => setFilter('expiring', event.target.checked)}
            />
            <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
              Next 30 days
            </span>
          </span>
        </label>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={exportRows}
          disabled={exporting}
        >
          <Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <article className="card admin__users">
        <div className="admin__users-head">
          <h2>Subscriptions</h2>
          <span>{meta.total} records</span>
        </div>

        {loading ? (
          <Loading label="Loading subscriptions" />
        ) : rows.length ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Period end</th>
                  <th>Latest payment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.user_name}</strong>
                      <small>{row.user_email}</small>
                    </td>
                    <td>
                      <PlanBadge code={row.plan_code} name={row.plan_name} />
                    </td>
                    <td>
                      <StatusPill status={row.status} />
                    </td>
                    <td>{titleCase(row.source)}</td>
                    <td>{formatCurrency(row.amount_cents, row.currency)}</td>
                    <td>
                      {row.current_period_end
                        ? formatDate(row.current_period_end)
                        : '—'}
                    </td>
                    <td>
                      {row.latest_payment_status ? (
                        <StatusPill status={row.latest_payment_status} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => openDetail(row.id)}
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No subscriptions match those filters.</p>
        )}

        <Pager meta={meta} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
      </article>

      {selected && (
        <article className="card admin-card">
          <div className="admin__users-head">
            <h2>Subscription #{selected.subscription.id}</h2>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>

          <dl className="admin-meta-list">
            <div>
              <dt>User</dt>
              <dd>{selected.subscription.user_email}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{selected.subscription.plan_name}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusPill status={selected.subscription.status} />
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{titleCase(selected.subscription.source)}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                {formatCurrency(
                  selected.subscription.amount_cents,
                  selected.subscription.currency
                )}
              </dd>
            </div>
            <div>
              <dt>Interval</dt>
              <dd>{titleCase(selected.subscription.billing_interval || 'none')}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{formatDate(selected.subscription.started_at)}</dd>
            </div>
            <div>
              <dt>Cancelled</dt>
              <dd>
                {selected.subscription.canceled_at
                  ? formatDateTime(selected.subscription.canceled_at)
                  : '—'}
              </dd>
            </div>
          </dl>

          <div className="admin-detail-panel">
            <h3>Payments</h3>
            {selected.payments?.length ? (
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Refunded</th>
                      <th>Status</th>
                      <th>Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.created_at)}</td>
                        <td>{formatCurrency(payment.amount_cents, payment.currency)}</td>
                        <td>
                          {formatCurrency(payment.refunded_amount_cents, payment.currency)}
                        </td>
                        <td>
                          <StatusPill status={payment.status} />
                        </td>
                        <td>{titleCase(payment.provider || '—')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No linked payments.</p>
            )}
          </div>

          <div className="admin-detail-panel">
            <h3>Events</h3>
            {selected.events?.length ? (
              <ul className="admin-rows">
                {selected.events.map((event) => (
                  <li key={event.id}>
                    <span>
                      <strong>{titleCase(event.event_type)}</strong>
                      <small>
                        {event.from_plan_code || '—'} → {event.to_plan_code || '—'} ·{' '}
                        {event.from_status || '—'} → {event.to_status || '—'}
                      </small>
                    </span>
                    <span>{formatDateTime(event.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No subscription events.</p>
            )}
          </div>
        </article>
      )}
    </>
  );
}

export default Subscriptions;
