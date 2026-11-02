import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import { adminApi } from '../../api/client';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  titleCase,
} from '../../utils/format';
import {
  Loading,
  Notice,
  Pager,
  PlanBadge,
  StatGrid,
  StatusPill,
} from './adminUi';

const PLANS = ['free', 'plus', 'premium', 'institution'];
const ROLES = ['user', 'admin'];

function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityMeta, setActivityMeta] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDetail = useCallback(() => {
    setLoading(true);
    setError('');

    adminApi
      .user(userId)
      .then((response) => setDetail(response.data))
      .catch((err) => setError(err.message || 'Unable to load that user.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const loadActivity = useCallback(
    (page = 1) => {
      setActivityLoading(true);
      adminApi
        .userActivity(userId, { page, limit: 15 })
        .then((response) => {
          setActivity(response.data.activities || []);
          setActivityMeta(
            response.meta || { page, totalPages: 0, total: 0 }
          );
        })
        .catch((err) => setError(err.message || 'Unable to load user activity.'))
        .finally(() => setActivityLoading(false));
    },
    [userId]
  );

  useEffect(() => {
    loadDetail();
    loadActivity(1);
  }, [loadDetail, loadActivity]);

  const changeRole = async (role) => {
    setBusy('role');
    setError('');
    setNotice('');
    try {
      await adminApi.updateUser(userId, { role });
      setNotice(`Role updated to ${role}.`);
      loadDetail();
    } catch (err) {
      setError(err.message || 'Unable to change that role.');
    } finally {
      setBusy('');
    }
  };

  const changePlan = async (planCode) => {
    setBusy('plan');
    setError('');
    setNotice('');
    try {
      await adminApi.updateUser(userId, { plan_code: planCode });
      setNotice(`Plan updated to ${planCode}.`);
      loadDetail();
    } catch (err) {
      setError(err.message || 'Unable to change that plan.');
    } finally {
      setBusy('');
    }
  };

  const suspend = async () => {
    const reason = window.prompt('Reason for suspending this account?', '');
    if (reason === null) return;
    setBusy('status');
    setError('');
    setNotice('');
    try {
      await adminApi.suspendUser(userId, reason.trim());
      setNotice('Account suspended.');
      loadDetail();
    } catch (err) {
      setError(err.message || 'Unable to suspend that account.');
    } finally {
      setBusy('');
    }
  };

  const reactivate = async () => {
    if (!window.confirm('Reactivate this account?')) return;
    setBusy('status');
    setError('');
    setNotice('');
    try {
      await adminApi.reactivateUser(userId);
      setNotice('Account reactivated.');
      loadDetail();
    } catch (err) {
      setError(err.message || 'Unable to reactivate that account.');
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this account and all its data?')) return;
    setBusy('delete');
    setError('');
    try {
      await adminApi.removeUser(userId);
      navigate('/admin/users');
    } catch (err) {
      setError(err.message || 'Unable to delete that account.');
      setBusy('');
    }
  };

  if (loading && !detail) return <Loading label="Loading user" />;

  if (!detail) {
    return (
      <>
        <Notice error={error || 'That user could not be found.'} />
        <Link to="/admin/users" className="admin-inline-link">
          <ArrowLeft size={14} /> Back to users
        </Link>
      </>
    );
  }

  const { user, stats, subscription } = detail;
  const currency = subscription?.currency || 'USD';

  const statItems = [
    { label: 'Assessments', value: stats?.career_assessments },
    { label: 'Roadmaps', value: stats?.roadmaps },
    { label: 'Tasks done', value: stats?.roadmap_tasks_completed },
    { label: 'CVs', value: stats?.cvs },
    { label: 'Cover letters', value: stats?.cover_letters },
    { label: 'Interviews', value: stats?.interviews },
    { label: 'Applications', value: stats?.applications },
    { label: 'Saved roles', value: stats?.saved_opportunities },
    { label: 'Projects', value: stats?.projects },
    { label: 'Payments', value: stats?.payments },
    {
      label: 'Lifetime paid',
      value: formatCurrency(stats?.amount_paid_cents, currency),
    },
    {
      label: 'Mentor messages',
      value: detail.mentor?.message_count,
    },
  ];

  return (
    <>
      <Notice error={error} notice={notice} />

      <Link to="/admin/users" className="admin-inline-link">
        <ArrowLeft size={14} /> Back to users
      </Link>

      <article className="card admin-card" style={{ marginTop: '0.75rem' }}>
        <div className="admin-detail-head">
          <div>
            <h2>{user.name}</h2>
            <p>
              {user.email} · joined {formatDate(user.created_at)}
            </p>
          </div>
          <div className="admin-actions">
            <StatusPill status={user.status} />
            <PlanBadge
              code={subscription?.plan_code || 'free'}
              name={subscription?.plan_name || 'Free'}
            />
            <select
              className="form-select"
              value={user.role}
              onChange={(event) => changeRole(event.target.value)}
              disabled={busy === 'role'}
              aria-label="Role"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {titleCase(role)}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={subscription?.plan_code || 'free'}
              onChange={(event) => changePlan(event.target.value)}
              disabled={busy === 'plan'}
              aria-label="Plan"
            >
              {PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {titleCase(plan)}
                </option>
              ))}
            </select>
            {user.status === 'suspended' ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={reactivate}
                disabled={busy === 'status'}
              >
                <ShieldCheck size={14} /> Reactivate
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={suspend}
                disabled={busy === 'status' || user.role === 'admin'}
                title={
                  user.role === 'admin'
                    ? 'Administrator accounts cannot be suspended here'
                    : undefined
                }
              >
                <ShieldOff size={14} /> Suspend
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={remove}
              disabled={busy === 'delete'}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        <dl className="admin-meta-list">
          <div>
            <dt>Role</dt>
            <dd>{titleCase(user.role)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{titleCase(user.status)}</dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>
              {subscription?.plan_name || 'Free'} ({titleCase(subscription?.source || 'none')})
            </dd>
          </div>
          <div>
            <dt>Subscription status</dt>
            <dd>{subscription ? titleCase(subscription.status) : 'No subscription row'}</dd>
          </div>
          <div>
            <dt>Period end</dt>
            <dd>{subscription?.current_period_end ? formatDate(subscription.current_period_end) : '—'}</dd>
          </div>
          <div>
            <dt>Last login</dt>
            <dd>{user.last_login_at ? formatDateTime(user.last_login_at) : 'Never'}</dd>
          </div>
          <div>
            <dt>Last active</dt>
            <dd>{user.last_active_at ? formatRelative(user.last_active_at) : '—'}</dd>
          </div>
          <div>
            <dt>Suspended</dt>
            <dd>
              {user.suspended_at
                ? `${formatDateTime(user.suspended_at)}${
                    user.suspension_reason ? ` · ${user.suspension_reason}` : ''
                  }`
                : 'No'}
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{user.location || '—'}</dd>
          </div>
          <div>
            <dt>Education</dt>
            <dd>{user.education_level || '—'}</dd>
          </div>
        </dl>
      </article>

      <StatGrid items={statItems} />

      <div className="admin-split">
        <article className="card admin-card">
          <h2>Subscription</h2>
          {subscription ? (
            <dl className="admin-meta-list">
              <div>
                <dt>Plan</dt>
                <dd>{subscription.plan_name}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{titleCase(subscription.status)}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{titleCase(subscription.source)}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatCurrency(subscription.amount_cents, subscription.currency)}</dd>
              </div>
              <div>
                <dt>Interval</dt>
                <dd>{titleCase(subscription.billing_interval || 'none')}</dd>
              </div>
              <div>
                <dt>Started</dt>
                <dd>{formatDate(subscription.started_at)}</dd>
              </div>
            </dl>
          ) : (
            <p className="empty-state">This user is on the free plan.</p>
          )}
          {detail.subscription_history?.length > 0 && (
            <ul className="admin-rows" style={{ marginTop: '0.75rem' }}>
              {detail.subscription_history.slice(0, 8).map((event) => (
                <li key={event.id}>
                  <span>
                    <strong>{titleCase(event.event_type)}</strong>
                    <small>
                      {event.from_plan_name || event.from_plan_code || '—'} →{' '}
                      {event.to_plan_name || event.to_plan_code || '—'}
                    </small>
                  </span>
                  <span>{formatDate(event.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card admin-card">
          <h2>Recent payments</h2>
          {detail.payment_history?.length ? (
            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.payment_history.slice(0, 10).map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.created_at)}</td>
                      <td>{payment.plan_name || titleCase(payment.plan_code)}</td>
                      <td>
                        {formatCurrency(
                          payment.amount_cents - payment.refunded_amount_cents,
                          payment.currency
                        )}
                      </td>
                      <td>
                        <StatusPill status={payment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No payment records.</p>
          )}
        </article>
      </div>

      <article className="card admin-card">
        <div className="admin__users-head">
          <h2>Activity timeline</h2>
          <span>{activityMeta.total} events</span>
        </div>
        {activityLoading ? (
          <Loading label="Loading activity" />
        ) : activity.length ? (
          <ul className="admin__activity-list">
            {activity.map((item) => (
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
                    {formatDateTime(item.created_at)}
                    {item.entity_type ? ` · ${item.entity_type}` : ''}
                    {item.entity_id ? ` #${item.entity_id}` : ''}
                  </small>
                </div>
                <span className="admin__activity-type">{item.event_type}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No activity recorded for this user.</p>
        )}
        <Pager meta={activityMeta} onPage={loadActivity} />
      </article>

      <div className="admin-split">
        <article className="card admin-card">
          <h2>Skills</h2>
          {detail.skills?.length ? (
            <ul className="admin-tag-list">
              {detail.skills.map((skill) => (
                <li className="admin-tag" key={skill.id}>
                  {skill.name}
                  {skill.proficiency ? ` · ${skill.proficiency}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No skills added.</p>
          )}
        </article>

        <article className="card admin-card">
          <h2>Learning roadmaps</h2>
          {detail.learning_roadmaps?.length ? (
            <ul className="admin-rows">
              {detail.learning_roadmaps.map((roadmap) => (
                <li key={roadmap.id}>
                  <span>
                    <strong>{roadmap.title}</strong>
                    <small>
                      {roadmap.completed_tasks}/{roadmap.task_count} tasks ·{' '}
                      {titleCase(roadmap.status)}
                    </small>
                  </span>
                  <span>{formatDate(roadmap.updated_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No roadmaps.</p>
          )}
        </article>
      </div>

      <div className="admin-split">
        <article className="card admin-card">
          <h2>Applications</h2>
          {detail.applications?.length ? (
            <ul className="admin-rows">
              {detail.applications.slice(0, 10).map((application) => (
                <li key={application.id}>
                  <span>
                    <strong>{application.title}</strong>
                    <small>{application.organisation}</small>
                  </span>
                  <StatusPill status={application.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No applications.</p>
          )}
        </article>

        <article className="card admin-card">
          <h2>Projects</h2>
          {detail.projects?.length ? (
            <ul className="admin-rows">
              {detail.projects.slice(0, 10).map((project) => (
                <li key={project.id}>
                  <span>
                    <strong>{project.title}</strong>
                    <small>
                      Score {project.score ?? '—'} · {titleCase(project.status)}
                    </small>
                  </span>
                  <span>{formatDate(project.updated_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No projects.</p>
          )}
        </article>
      </div>

      <div className="admin-split">
        <article className="card admin-card">
          <h2>Saved opportunities</h2>
          {detail.saved_opportunities?.length ? (
            <ul className="admin-rows">
              {detail.saved_opportunities.slice(0, 10).map((item) => (
                <li key={`${item.id}-${item.saved_at}`}>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.organisation} · {titleCase(item.opportunity_type)}
                    </small>
                  </span>
                  <span>{formatDate(item.saved_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Nothing saved.</p>
          )}
        </article>

        <article className="card admin-card">
          <h2>Assessments & mentor</h2>
          <ul className="admin-rows">
            <li>
              <span>
                <strong>Mentor threads</strong>
                <small>{detail.mentor?.message_count || 0} user messages</small>
              </span>
              <span>{detail.mentor?.thread_count || 0}</span>
            </li>
            {detail.career_assessments?.slice(0, 6).map((assessment) => (
              <li key={assessment.id}>
                <span>
                  <strong>Career assessment #{assessment.id}</strong>
                  <small>{assessment.model || 'AI model'}</small>
                </span>
                <span>{formatDate(assessment.created_at)}</span>
              </li>
            ))}
          </ul>
          {!detail.career_assessments?.length && (
            <p className="empty-state">No assessments.</p>
          )}
        </article>
      </div>
    </>
  );
}

export default UserDetail;
