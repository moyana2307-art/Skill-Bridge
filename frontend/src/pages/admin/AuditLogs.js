import { Fragment, useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi } from '../../api/client';
import { formatDateTime } from '../../utils/format';
import { Loading, Notice, Pager } from './adminUi';

function AuditLogs() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [filters, setFilters] = useState({
    action: '',
    search: '',
    admin_id: '',
    from: '',
    to: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');

    adminApi
      .auditLogs({
        page: filters.page,
        limit: 25,
        action: filters.action || undefined,
        search: filters.search || undefined,
        admin_id: filters.admin_id || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      .then((response) => {
        setRows(response.data.logs || []);
        setMeta(response.meta || { page: filters.page, totalPages: 0, total: 0 });
      })
      .catch((err) => setError(err.message || 'Unable to load audit logs.'))
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
              placeholder="Admin, action, or target"
            />
          </span>
        </label>
        <label className="admin-toolbar__field">
          Action
          <input
            className="form-input"
            value={filters.action}
            onChange={(event) => setFilter('action', event.target.value)}
            placeholder="user.suspended"
          />
        </label>
        <label className="admin-toolbar__field">
          Admin ID
          <input
            type="number"
            min="1"
            className="form-input"
            value={filters.admin_id}
            onChange={(event) => setFilter('admin_id', event.target.value)}
            placeholder="Any"
          />
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
      </div>

      <article className="card admin__users">
        <div className="admin__users-head">
          <h2>Administrator actions</h2>
          <span>{meta.total} entries</span>
        </div>

        {loading ? (
          <Loading label="Loading audit log" />
        ) : rows.length ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <Fragment key={log.id}>
                    <tr>
                      <td>{formatDateTime(log.created_at)}</td>
                      <td>
                        <strong>{log.admin_name || `Admin ${log.admin_user_id}`}</strong>
                        <small>ID {log.admin_user_id}</small>
                      </td>
                      <td>
                        <strong>{log.action}</strong>
                      </td>
                      <td>
                        <small>
                          {log.target_type}
                          {log.target_id ? ` #${log.target_id}` : ''}
                          {log.target_label ? ` · ${log.target_label}` : ''}
                        </small>
                      </td>
                      <td>
                        <small>{log.ip_address || '—'}</small>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() =>
                            setExpanded((current) =>
                              current === log.id ? null : log.id
                            )
                          }
                        >
                          {expanded === log.id ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr>
                        <td colSpan={6}>
                          <div className="admin-detail-panel">
                            <h3>Before</h3>
                            <pre className="admin-code">
                              {JSON.stringify(log.before_data, null, 2) || 'null'}
                            </pre>
                            <h3>After</h3>
                            <pre className="admin-code">
                              {JSON.stringify(log.after_data, null, 2) || 'null'}
                            </pre>
                            <h3>Metadata</h3>
                            <pre className="admin-code">
                              {JSON.stringify(log.metadata, null, 2) || 'null'}
                            </pre>
                            <h3>User agent</h3>
                            <pre className="admin-code">{log.user_agent || '—'}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No audit entries match those filters.</p>
        )}

        <Pager meta={meta} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
      </article>
    </>
  );
}

export default AuditLogs;
