import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Map, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { careerGoalsApi } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatGrid from '../components/StatGrid';
import './CareerGoals.css';

const EMPTY_FORM = { career_title: '', status: 'active' };
const STATUS_OPTIONS = ['active', 'completed', 'archived'];
const FILTERS = ['all', 'active', 'completed', 'archived'];

function formatStatus(value) {
  return value ? value.replace('_', ' ') : '';
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CareerGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await careerGoalsApi.list();
      setGoals(response.data.goals || []);
    } catch (err) {
      setError(err.message || 'Unable to load your career goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const counts = useMemo(() => {
    const next = { total: goals.length, active: 0, completed: 0, archived: 0 };

    goals.forEach((goal) => {
      if (next[goal.status] !== undefined) next[goal.status] += 1;
    });

    return next;
  }, [goals]);

  const visibleGoals = useMemo(
    () =>
      filter === 'all'
        ? goals
        : goals.filter((goal) => goal.status === filter),
    [filter, goals]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSuccess('');
    setError('');
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const response = await careerGoalsApi.create(form);
      setForm(EMPTY_FORM);
      setFilter('all');
      setSuccess(`${response.data.goal.career_title} added to your goals.`);
      await loadGoals();
    } catch (err) {
      setError(err.message || 'Unable to create that career goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (goal, status) => {
    setBusyId(goal.id);
    setSuccess('');
    setError('');

    try {
      await careerGoalsApi.update(goal.id, { status });
      setSuccess(`Status updated for ${goal.career_title}.`);
      await loadGoals();
    } catch (err) {
      setError(err.message || 'Unable to update that goal.');
    } finally {
      setBusyId(null);
    }
  };

  const startEditing = (goal) => {
    setEditingId(goal.id);
    setEditingTitle(goal.career_title);
    setSuccess('');
    setError('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveTitle = async (goal) => {
    const title = editingTitle.trim();

    if (!title || title === goal.career_title) {
      cancelEditing();
      return;
    }

    setBusyId(goal.id);
    setSuccess('');
    setError('');

    try {
      await careerGoalsApi.update(goal.id, { career_title: title });
      setSuccess('Career goal updated.');
      cancelEditing();
      await loadGoals();
    } catch (err) {
      setError(err.message || 'Unable to update that goal.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (goal) => {
    if (
      !window.confirm(
        `Delete "${goal.career_title}"? Any linked roadmaps stay, but will no longer be linked to this goal.`
      )
    ) {
      return;
    }

    setBusyId(goal.id);
    setSuccess('');
    setError('');

    try {
      await careerGoalsApi.remove(goal.id);
      setSuccess(`${goal.career_title} deleted.`);
      await loadGoals();
    } catch (err) {
      setError(err.message || 'Unable to delete that goal.');
    } finally {
      setBusyId(null);
    }
  };

  const stats = [
    { label: 'Total', value: counts.total },
    { label: 'Active', value: counts.active },
    { label: 'Completed', value: counts.completed },
    { label: 'Archived', value: counts.archived },
  ];

  return (
    <div className="goals">
      <PageHeader
        eyebrow="Career direction"
        icon={Target}
        title="Career goals"
        description="Name the roles you are working towards. Keep one goal active and turn the others into completed milestones or archived ideas."
      />

      <section className="section section--soft">
        <div className="container">
          <StatGrid
            ariaLabel="Career goal totals"
            items={stats.map((stat) => ({
              ...stat,
              value: loading ? '-' : stat.value,
            }))}
          />

          {success && (
            <div className="alert alert-success" role="status">
              {success}
            </div>
          )}
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="goals__layout">
            <aside className="card goals__form-card">
              <div className="goals__form-heading">
                <span className="goals__icon-box">
                  <Target size={20} />
                </span>
                <div>
                  <h2>Add a goal</h2>
                  <p>Use a clear job title or career direction.</p>
                </div>
              </div>

              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label" htmlFor="career_title">
                    Career title
                  </label>
                  <input
                    id="career_title"
                    name="career_title"
                    className="form-input"
                    placeholder="e.g. Frontend Developer"
                    value={form.career_title}
                    onChange={handleFormChange}
                    maxLength={150}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="goal_status">
                    Starting status
                  </label>
                  <select
                    id="goal_status"
                    name="status"
                    className="form-select"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option value={status} key={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={saving}
                >
                  <Plus size={17} /> {saving ? 'Adding...' : 'Add goal'}
                </button>
              </form>

              <p className="goals__note">
                Only one goal can be active. Activating another goal archives
                the previous active one.
              </p>
            </aside>

            <div className="goals__main">
              <div className="goals__toolbar">
                <div className="goals__tabs" role="tablist" aria-label="Filter goals">
                  {FILTERS.map((option) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={filter === option}
                      className={`goals__tab ${
                        filter === option ? 'goals__tab--active' : ''
                      }`}
                      onClick={() => setFilter(option)}
                      key={option}
                    >
                      {option === 'all' ? 'All' : formatStatus(option)}
                    </button>
                  ))}
                </div>
                <span className="goals__count">
                  {visibleGoals.length} shown
                </span>
              </div>

              {loading && (
                <div
                  className="spinner"
                  role="status"
                  aria-label="Loading career goals"
                />
              )}

              {!loading && error && goals.length === 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={loadGoals}
                >
                  Try again
                </button>
              )}

              {!loading && !error && visibleGoals.length === 0 && (
                <div className="card goals__empty">
                  <Target size={30} />
                  <h2>No goals here yet</h2>
                  <p>
                    {filter === 'all'
                      ? 'Add your first career goal to start planning.'
                      : `You have no ${formatStatus(filter)} goals right now.`}
                  </p>
                </div>
              )}

              {!loading && visibleGoals.length > 0 && (
                <div className="goals__grid">
                  {visibleGoals.map((goal) => {
                    const isEditing = editingId === goal.id;
                    const isBusy = busyId === goal.id;

                    return (
                      <article
                        className={`card goals__card ${
                          isBusy ? 'goals__card--busy' : ''
                        }`}
                        key={goal.id}
                      >
                        <div className="goals__card-top">
                          <span
                            className={`status-badge status-badge--${goal.status}`}
                          >
                            {formatStatus(goal.status)}
                          </span>
                          <span className="goals__updated">
                            Updated {formatDate(goal.updated_at)}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="goals__edit">
                            <input
                              className="form-input"
                              value={editingTitle}
                              onChange={(event) =>
                                setEditingTitle(event.target.value)
                              }
                              aria-label="Career goal title"
                              maxLength={150}
                            />
                            <div className="goals__edit-actions">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => saveTitle(goal)}
                                disabled={isBusy}
                              >
                                <Check size={15} /> Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={cancelEditing}
                                disabled={isBusy}
                              >
                                <X size={15} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <h3>{goal.career_title}</h3>
                        )}

                        <div className="goals__meta">
                          <Map size={16} />
                          <span>
                            {goal.roadmap_count}{' '}
                            {goal.roadmap_count === 1 ? 'roadmap' : 'roadmaps'}
                          </span>
                        </div>

                        <div className="goals__status-row">
                          <label
                            className="form-label"
                            htmlFor={`goal-status-${goal.id}`}
                          >
                            Status
                          </label>
                          <select
                            id={`goal-status-${goal.id}`}
                            className="form-select"
                            value={goal.status}
                            onChange={(event) =>
                              handleStatusChange(goal, event.target.value)
                            }
                            disabled={isBusy}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option value={status} key={status}>
                                {formatStatus(status)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="goals__actions">
                          <Link
                            className="btn btn-outline btn-sm"
                            to={`/roadmaps?goal=${goal.id}`}
                          >
                            View roadmaps
                          </Link>
                          <button
                            type="button"
                            className="goals__icon-button"
                            onClick={() => startEditing(goal)}
                            disabled={isBusy || isEditing}
                            aria-label={`Edit ${goal.career_title}`}
                            title="Edit title"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="goals__icon-button goals__icon-button--danger"
                            onClick={() => handleDelete(goal)}
                            disabled={isBusy}
                            aria-label={`Delete ${goal.career_title}`}
                            title="Delete goal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CareerGoals;
