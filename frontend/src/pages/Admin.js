import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Building2,
  Check,
  CreditCard,
  Megaphone,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { adminApi, subscriptionsApi } from '../api/client';
import { formatDate } from '../utils/format';
import PageHeader from '../components/PageHeader';
import './Admin.css';

const PLAN_OPTIONS = [
  { code: 'free', label: 'Free' },
  { code: 'plus', label: 'Plus' },
  { code: 'premium', label: 'Premium' },
  { code: 'institution', label: 'Institution' },
];

const PACKAGE_OPTIONS = ['small', 'growing', 'large'];

function InstitutionRow({ institution, onSave, saving }) {
  const [form, setForm] = useState({
    package_code: institution.package_code,
    seat_limit: String(institution.seat_limit),
    status: institution.status,
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(institution.id, {
      package_code: form.package_code,
      seat_limit: Number(form.seat_limit),
      status: form.status,
    });
  };

  return (
    <tr>
      <td>
        <strong>{institution.name}</strong>
        <small>{institution.contact_email || institution.slug}</small>
      </td>
      <td>
        <strong>{institution.owner_name || 'Unassigned'}</strong>
        <small>{institution.owner_email || ''}</small>
      </td>
      <td>
        {institution.seat_used ?? 0}/{institution.seat_limit}
      </td>
      <td>
        <form className="admin__institution-form" onSubmit={handleSubmit}>
          <select
            className="form-select"
            value={form.package_code}
            onChange={(event) =>
              setForm((current) => ({ ...current, package_code: event.target.value }))
            }
            aria-label={`Package for ${institution.name}`}
          >
            {PACKAGE_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            max="10000"
            className="form-input"
            value={form.seat_limit}
            onChange={(event) =>
              setForm((current) => ({ ...current, seat_limit: event.target.value }))
            }
            aria-label={`Seat limit for ${institution.name}`}
          />
          <select
            className="form-select"
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({ ...current, status: event.target.value }))
            }
            aria-label={`Status for ${institution.name}`}
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button type="submit" className="btn btn-outline btn-sm" disabled={saving}>
            Save
          </button>
        </form>
      </td>
    </tr>
  );
}

function Admin() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [announcement, setAnnouncement] = useState({
    title: '',
    body: '',
    link: '',
  });
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewing, setReviewing] = useState('');
  const [savingInstitution, setSavingInstitution] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadUsers = useCallback(
    (page = 1) => {
      setUsersLoading(true);
      adminApi
        .users({
          page,
          limit: 12,
          search: search.trim() || undefined,
          role: role || undefined,
        })
        .then((response) => {
          setUsers(response.data.users || []);
          setMeta(response.meta || { page, totalPages: 0, total: 0 });
        })
        .catch((err) => setError(err.message || 'Unable to load users.'))
        .finally(() => setUsersLoading(false));
    },
    [search, role]
  );

  const loadAdminData = useCallback(async () => {
    const [overviewResponse, plansResponse, requestsResponse, institutionsResponse] =
      await Promise.all([
        adminApi.overview(),
        subscriptionsApi.plans(),
        adminApi.planRequests({ status: 'pending' }),
        adminApi.institutions({ limit: 20 }),
      ]);
    setOverview(overviewResponse.data.overview);
    setPlans(plansResponse.data.plans || []);
    setRequests(requestsResponse.data.requests || []);
    setInstitutions(institutionsResponse.data.institutions || []);
  }, []);

  useEffect(() => {
    loadAdminData()
      .catch((err) => setError(err.message || 'Unable to load admin overview.'))
      .finally(() => setLoading(false));
  }, [loadAdminData]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadUsers(1), 250);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const handleRole = async (userId, nextRole) => {
    setError('');
    try {
      const response = await adminApi.updateUser(userId, { role: nextRole });
      setUsers((current) =>
        current.map((item) =>
          item.id === userId ? { ...item, ...response.data.user } : item
        )
      );
    } catch (err) {
      setError(err.message || 'Unable to update that user.');
    }
  };

  const handlePlan = async (userId, planCode) => {
    setError('');
    setNotice('');
    try {
      const response = await adminApi.updateUser(userId, { plan_code: planCode });
      setUsers((current) =>
        current.map((item) =>
          item.id === userId ? { ...item, ...response.data.user } : item
        )
      );
      setNotice('Plan updated.');
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Unable to update that plan.');
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete ${name}? This removes all their data.`)) return;
    setError('');
    try {
      await adminApi.removeUser(userId);
      setUsers((current) => current.filter((item) => item.id !== userId));
      setMeta((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
    } catch (err) {
      setError(err.message || 'Unable to delete that user.');
    }
  };

  const handleAnnounce = async (event) => {
    event.preventDefault();
    if (!announcement.title.trim()) {
      setError('Add an announcement title.');
      return;
    }

    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await adminApi.announce({
        title: announcement.title.trim(),
        body: announcement.body.trim() || undefined,
        link: announcement.link.trim() || undefined,
      });
      setNotice(`Announcement sent to ${response.data.sent} users.`);
      setAnnouncement({ title: '', body: '', link: '' });
    } catch (err) {
      setError(err.message || 'Unable to send that announcement.');
    } finally {
      setSending(false);
    }
  };

  const handleReview = async (requestId, status) => {
    setReviewing(String(requestId));
    setError('');
    setNotice('');
    try {
      await adminApi.reviewPlanRequest(requestId, status);
      await loadAdminData();
      await loadUsers(meta.page);
      setNotice(
        status === 'approved'
          ? 'Request approved and the plan was activated.'
          : 'Request rejected and the user was notified.'
      );
    } catch (err) {
      setError(err.message || 'Unable to review that request.');
    } finally {
      setReviewing('');
    }
  };

  const handleSaveInstitution = async (institutionId, data) => {
    setSavingInstitution(String(institutionId));
    setError('');
    setNotice('');
    try {
      await adminApi.updateInstitution(institutionId, data);
      await loadAdminData();
      setNotice('Institution updated.');
    } catch (err) {
      setError(err.message || 'Unable to update that institution.');
    } finally {
      setSavingInstitution('');
    }
  };

  const stats = overview
    ? [
        ['Users', overview.users?.total],
        ['New this week', overview.users?.new_last_7_days],
        ['Paid subscriptions', overview.subscriptions?.active],
        ['Pending requests', overview.subscriptions?.pending_requests],
        ['Institutions', overview.institutions?.total],
        ['Career goals', overview.career_goals?.total],
        ['Roadmaps', overview.roadmaps?.total],
        ['Task completion', `${overview.roadmaps?.task_completion_percent ?? 0}%`],
        ['Projects', overview.projects?.total],
        ['Applications', overview.applications?.total],
        ['Mock interviews', overview.mock_interviews?.total],
        ['AI analyses', overview.ai_analyses],
      ]
    : [];

  return (
    <div className="admin">
      <PageHeader
        eyebrow="Administration"
        icon={ShieldCheck}
        title="Platform overview"
        description="Monitor usage, manage users and plans, review upgrade requests, and oversee institutions."
      />

      <section className="section section--soft">
        <div className="container">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {notice && <div className="alert alert-success">{notice}</div>}

          {loading ? (
            <div className="spinner" role="status" aria-label="Loading admin overview" />
          ) : (
            <>
              <div className="admin__stats">
                {stats.map(([label, value]) => (
                  <article className="card admin__stat" key={label}>
                    <span>{label}</span>
                    <strong>{value ?? 0}</strong>
                  </article>
                ))}
              </div>

              <div className="admin__grid">
                <article className="card admin__signups">
                  <header>
                    <h2>
                      <BarChart3 size={17} /> Signups (14 days)
                    </h2>
                    <span>{overview.signups_last_14_days?.length || 0} days</span>
                  </header>
                  {overview.signups_last_14_days?.length ? (
                    <div className="admin__chart">
                      {overview.signups_last_14_days.map((item) => {
                        const max = Math.max(
                          1,
                          ...overview.signups_last_14_days.map((row) => row.count)
                        );
                        return (
                          <div className="admin__bar-wrap" key={item.date}>
                            <div
                              className="admin__bar"
                              style={{
                                height: `${Math.max(6, (item.count / max) * 100)}%`,
                              }}
                              title={`${item.date}: ${item.count}`}
                            />
                            <span>{item.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="empty-state">No signups in the last 14 days.</p>
                  )}
                </article>

                <form className="card admin__announce" onSubmit={handleAnnounce}>
                  <h2>
                    <Megaphone size={17} /> Send an announcement
                  </h2>
                  <div className="form-group">
                    <label className="form-label" htmlFor="announce-title">
                      Title
                    </label>
                    <input
                      id="announce-title"
                      className="form-input"
                      value={announcement.title}
                      onChange={(event) =>
                        setAnnouncement((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="announce-body">
                      Message
                    </label>
                    <textarea
                      id="announce-body"
                      className="form-textarea"
                      rows={3}
                      value={announcement.body}
                      onChange={(event) =>
                        setAnnouncement((current) => ({
                          ...current,
                          body: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="announce-link">
                      Link (optional)
                    </label>
                    <input
                      id="announce-link"
                      className="form-input"
                      value={announcement.link}
                      onChange={(event) =>
                        setAnnouncement((current) => ({
                          ...current,
                          link: event.target.value,
                        }))
                      }
                      placeholder="/career-studio"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? 'Sending...' : 'Send to all users'}
                  </button>
                </form>
              </div>

              <article className="card admin__users">
                <header className="admin__users-head">
                  <h2>
                    <Users size={17} /> Users
                  </h2>
                  <div className="admin__filters">
                    <div className="admin__search">
                      <Search size={15} />
                      <input
                        className="form-input"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name or email"
                        aria-label="Search users"
                      />
                    </div>
                    <select
                      className="form-select"
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      aria-label="Filter by role"
                    >
                      <option value="">All roles</option>
                      <option value="user">Users</option>
                      <option value="admin">Admins</option>
                    </select>
                  </div>
                </header>

                {usersLoading ? (
                  <div className="spinner" role="status" aria-label="Loading users" />
                ) : users.length ? (
                  <div className="admin__table-wrap">
                    <table className="admin__table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Plan</th>
                          <th>Activity</th>
                          <th>Joined</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.name}</strong>
                              <small>{item.email}</small>
                            </td>
                            <td>
                              <select
                                className="form-select admin__role"
                                value={item.role}
                                onChange={(event) =>
                                  handleRole(item.id, event.target.value)
                                }
                                aria-label={`Role for ${item.name}`}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-select admin__role"
                                value={item.plan_code || 'free'}
                                onChange={(event) =>
                                  handlePlan(item.id, event.target.value)
                                }
                                aria-label={`Plan for ${item.name}`}
                              >
                                {PLAN_OPTIONS.map((plan) => (
                                  <option key={plan.code} value={plan.code}>
                                    {plan.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <small>
                                {item.skill_count} skills | {item.roadmap_count} roadmaps |{' '}
                                {item.project_count} projects | {item.application_count}{' '}
                                applications
                              </small>
                            </td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleDelete(item.id, item.name)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-state">No users match that search.</p>
                )}

                <div className="admin__pagination">
                  <span>
                    Page {meta.page} of {meta.totalPages || 1} - {meta.total} users
                  </span>
                  <div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => loadUsers(meta.page - 1)}
                      disabled={meta.page <= 1 || usersLoading}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => loadUsers(meta.page + 1)}
                      disabled={meta.page >= meta.totalPages || usersLoading}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </article>

              <article className="card admin__users admin__requests">
                <header className="admin__users-head">
                  <h2>
                    <CreditCard size={17} /> Pending upgrade requests
                  </h2>
                  <span>{requests.length} waiting</span>
                </header>
                {requests.length ? (
                  <div className="admin__table-wrap">
                    <table className="admin__table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Plan</th>
                          <th>Note</th>
                          <th>Requested</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((request) => (
                          <tr key={request.id}>
                            <td>
                              <strong>{request.name}</strong>
                              <small>{request.email}</small>
                            </td>
                            <td>{request.plan_name}</td>
                            <td>
                              <small>{request.note || 'No note'}</small>
                            </td>
                            <td>{formatDate(request.created_at)}</td>
                            <td>
                              <div className="admin__request-actions">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleReview(request.id, 'approved')}
                                  disabled={Boolean(reviewing)}
                                >
                                  <Check size={14} /> Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleReview(request.id, 'rejected')}
                                  disabled={Boolean(reviewing)}
                                >
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-state">No pending upgrade requests.</p>
                )}
              </article>

              <article className="card admin__users admin__institutions">
                <header className="admin__users-head">
                  <h2>
                    <Building2 size={17} /> Institutions
                  </h2>
                  <span>{institutions.length} listed</span>
                </header>
                {institutions.length ? (
                  <div className="admin__table-wrap">
                    <table className="admin__table">
                      <thead>
                        <tr>
                          <th>Institution</th>
                          <th>Owner</th>
                          <th>Seats</th>
                          <th>Package, seats, status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {institutions.map((institution) => (
                          <InstitutionRow
                            key={institution.id}
                            institution={institution}
                            onSave={handleSaveInstitution}
                            saving={savingInstitution === String(institution.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-state">No institutions have been created yet.</p>
                )}
              </article>

              {plans.length > 0 && (
                <p className="admin__plan-note">
                  Plans available: {plans.map((plan) => plan.name).join(', ')}.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Admin;
