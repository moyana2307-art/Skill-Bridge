import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, Search } from 'lucide-react';
import { adminApi } from '../../api/client';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/format';
import { Loading, Notice, Pager, StatusPill } from './adminUi';

const STATUSES = [
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'disputed',
];
const PLANS = ['free', 'plus', 'premium', 'institution'];

function Transactions() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    plan: '',
    provider: '',
    from: '',
    to: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');

    adminApi
      .transactions({
        page: filters.page,
        limit: 25,
        search: filters.search || undefined,
        status: filters.status || undefined,
        plan: filters.plan || undefined,
        provider: filters.provider || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      .then((response) => {
        setRows(response.data.transactions || []);
        setMeta(response.meta || { page: filters.page, totalPages: 0, total: 0 });
      })
      .catch((err) => setError(err.message || 'Unable to load transactions.'))
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

  const openDetail = async (transactionId) => {
    setDetailLoading(true);
    setError('');
    try {
      const response = await adminApi.transaction(transactionId);
      setSelected(response.data.transaction);
    } catch (err) {
      setError(err.message || 'Unable to load that transaction.');
    } finally {
      setDetailLoading(false);
    }
  };

  const exportRows = async () => {
    setExporting(true);
    setError('');
    try {
      await adminApi.exportTransactions({
        search: filters.search || undefined,
        status: filters.status || undefined,
        plan: filters.plan || undefined,
        provider: filters.provider || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
    } catch (err) {
      setError(err.message || 'Unable to export transactions.');
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
              placeholder="Reference, user name, or email"
            />
          </span>
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
          Provider
          <select
            className="form-select"
            value={filters.provider}
            onChange={(event) => setFilter('provider', event.target.value)}
          >
            <option value="">All providers</option>
            <option value="paynow">Paynow</option>
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
          <h2>Payment records</h2>
          <span>{meta.total} transactions</span>
        </div>

        {loading ? (
          <Loading label="Loading transactions" />
        ) : rows.length ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Refunded</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Reference</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.created_at)}</td>
                    <td>
                      <strong>{row.user_name || 'Unknown'}</strong>
                      <small>{row.user_email || ''}</small>
                    </td>
                    <td>{row.plan_name || titleCase(row.plan_code || 'unknown')}</td>
                    <td>{formatCurrency(row.amount_cents, row.currency)}</td>
                    <td>{formatCurrency(row.refunded_amount_cents, row.currency)}</td>
                    <td>
                      <StatusPill status={row.status} />
                    </td>
                    <td>{titleCase(row.provider || 'unknown')}</td>
                    <td>
                      <small>{row.provider_reference || '—'}</small>
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
          <p className="empty-state">No transactions match those filters.</p>
        )}

        <Pager meta={meta} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
      </article>

      {detailLoading && <Loading label="Loading transaction" />}

      {selected && (
        <article className="card admin-card">
          <div className="admin__users-head">
            <h2>Transaction #{selected.id}</h2>
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
              <dd>
                {selected.user_name || 'Unknown'} ({selected.user_email || '—'})
              </dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{selected.plan_name || titleCase(selected.plan_code || 'unknown')}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatCurrency(selected.amount_cents, selected.currency)}</dd>
            </div>
            <div>
              <dt>Refunded</dt>
              <dd>
                {formatCurrency(selected.refunded_amount_cents, selected.currency)}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusPill status={selected.status} />
              </dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{titleCase(selected.provider || 'unknown')}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{selected.provider_reference || '—'}</dd>
            </div>
            <div>
              <dt>Provider transaction</dt>
              <dd>{selected.provider_transaction_id || '—'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(selected.created_at)}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>{selected.paid_at ? formatDateTime(selected.paid_at) : '—'}</dd>
            </div>
            <div>
              <dt>Refunded at</dt>
              <dd>
                {selected.refunded_at ? formatDateTime(selected.refunded_at) : '—'}
              </dd>
            </div>
            <div>
              <dt>Failure reason</dt>
              <dd>{selected.failure_reason || '—'}</dd>
            </div>
          </dl>
          {selected.metadata && (
            <div className="admin-detail-panel">
              <h3>Provider metadata</h3>
              <pre className="admin-code">
                {JSON.stringify(selected.metadata, null, 2)}
              </pre>
            </div>
          )}
        </article>
      )}
    </>
  );
}

export default Transactions;
