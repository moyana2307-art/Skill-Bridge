import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Search, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/client';
import { formatCurrency, formatDate, titleCase } from '../../utils/format';
import {
  Loading,
  Notice,
  Pager,
  PlanBadge,
  StatusPill,
} from './adminUi';

const ROLES = ['user', 'admin'];
const STATUSES = ['active', 'suspended'];
const PLANS = ['free', 'plus', 'premium', 'institution'];

function Users() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    plan: '',
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');

    adminApi
      .users({
        page: filters.page,
        limit: 20,
        search: filters.search || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        plan: filters.plan || undefined,
      })
      .then((response) => {
        setRows(response.data.users || []);
        setMeta(response.meta || { page: filters.page, totalPages: 0, total: 0 });
      })
      .catch((err) => setError(err.message || 'Unable to load users.'))
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

  const changeRole = async (user, role) => {
    setBusy(`role-${user.id}`);
    setError('');
    setNotice('');
    try {
      await adminApi.updateUser(user.id, { role });
      setRows((current) =>
        current.map((row) => (row.id === user.id ? { ...row, role } : row))
      );
      setNotice(`${user.name} is now ${role}.`);
    } catch (err) {
      setError(err.message || 'Unable to change that role.');
    } finally {
      setBusy('');
    }
  };

  const changePlan = async (user, planCode) => {
    setBusy(`plan-${user.id}`);
    setError('');
    setNotice('');
    try {
      await adminApi.updateUser(user.id, { plan_code: planCode });
      setNotice(`${user.name} moved to the ${planCode} plan.`);
      load();
    } catch (err) {
      setError(err.message || 'Unable to change that plan.');
    } finally {
      setBusy('');
    }
  };

  const suspend = async (user) => {
    const reason = window.prompt(`Reason for suspending ${user.email}?`, '');
    if (reason === null) return;
    setBusy(`status-${user.id}`);
    setError('');
    setNotice('');
    try {
      await adminApi.suspendUser(user.id, reason.trim());
      setRows((current) =>
        current.map((row) =>
          row.id === user.id ? { ...row, status: 'suspended' } : row
        )
      );
      setNotice(`${user.email} was suspended.`);
    } catch (err) {
      setError(err.message || 'Unable to suspend that user.');
    } finally {
      setBusy('');
    }
  };

  const reactivate = async (user) => {
    if (!window.confirm(`Reactivate ${user.email}?`)) return;
    setBusy(`status-${user.id}`);
    setError('');
    setNotice('');
    try {
      await adminApi.reactivateUser(user.id);
      setRows((current) =>
        current.map((row) =>
          row.id === user.id ? { ...row, status: 'active' } : row
        )
      );
      setNotice(`${user.email} was reactivated.`);
    } catch (err) {
      setError(err.message || 'Unable to reactivate that user.');
    } finally {
      setBusy('');
    }
  };

  const remove = async (user) => {
    if (!window.confirm(`Delete ${user.email}? This removes all their data.`)) return;
    setBusy(`delete-${user.id}`);
    setError('');
    setNotice('');
    try {
      await adminApi.removeUser(user.id);
      setNotice(`${user.email} was deleted.`);
      load();
    } catch (err) {
      setError(err.message || 'Unable to delete that user.');
    } finally {
      setBusy('');
    }
  };

  const exportRows = async () => {
    setExporting(true);
    setError('');
    try {
      await adminApi.exportUsers({
        search: filters.search || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        plan: filters.plan || undefined,
      });
    } catch (err) {
      setError(err.message || 'Unable to export users.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Notice error={error} notice={notice} />

      <div className="admin-toolbar">
        <label className="admin-toolbar__field admin-toolbar__grow">
          Search
          <span className="admin__search">
            <Search size={15} aria-hidden="true" />
            <input
              className="form-input"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name or email"
            />
          </span>
        </label>
        <label className="admin-toolbar__field">
          Role
          <select
            className="form-select"
            value={filters.role}
            onChange={(event) => setFilter('role', event.target.value)}
          >
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {titleCase(role)}
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
          <h2>Users</h2>
          <span>{meta.total} accounts</span>
        </div>

        {loading ? (
          <Loading label="Loading users" />
        ) : rows.length ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Usage</th>
                  <th>Paid</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>
                      <select
                        className="form-select admin__role"
                        value={user.role}
                        onChange={(event) => changeRole(user, event.target.value)}
                        disabled={busy === `role-${user.id}`}
                        aria-label={`Role for ${user.email}`}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {titleCase(role)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-select admin__role"
                        value={user.plan_code || 'free'}
                        onChange={(event) => changePlan(user, event.target.value)}
                        disabled={busy === `plan-${user.id}`}
                        aria-label={`Plan for ${user.email}`}
                      >
                        {PLANS.map((plan) => (
                          <option key={plan} value={plan}>
                            {titleCase(plan)}
                          </option>
                        ))}
                      </select>
                      <small>
                        <PlanBadge code={user.plan_code} name={user.plan_name} />
                      </small>
                    </td>
                    <td>
                      <StatusPill status={user.status} />
                    </td>
                    <td>
                      <small>
                        {user.skill_count} skills · {user.roadmap_count} roadmaps
                        <br />
                        {user.application_count} applications ·{' '}
                        {user.career_assessment_count} assessments
                      </small>
                    </td>
                    <td>{formatCurrency(user.amount_paid_cents, 'USD')}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          <Eye size={14} /> View
                        </Link>
                        {user.status === 'suspended' ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => reactivate(user)}
                            disabled={busy === `status-${user.id}`}
                          >
                            <ShieldCheck size={14} /> Reactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => suspend(user)}
                            disabled={busy === `status-${user.id}`}
                          >
                            <ShieldOff size={14} /> Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => remove(user)}
                          disabled={busy === `delete-${user.id}`}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No users match those filters.</p>
        )}

        <Pager meta={meta} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
      </article>
    </>
  );
}

export default Users;
