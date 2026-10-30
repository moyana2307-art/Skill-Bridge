import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check,
  ListChecks,
  Map,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { aiApi, careerGoalsApi, roadmapsApi } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatGrid from '../components/StatGrid';
import './Roadmaps.css';

const ROADMAP_STATUSES = ['active', 'completed', 'archived'];
const TASK_STATUSES = ['not_started', 'in_progress', 'completed'];
const EMPTY_CREATE_FORM = {
  title: '',
  summary: '',
  career_goal_id: '',
};
const EMPTY_TASK_FORM = {
  title: '',
  description: '',
  skills_to_develop: '',
  estimated_duration: '',
};
const EMPTY_AI_FORM = {
  career_goal_id: '',
  timeframe_weeks: 12,
  hours_per_week: 8,
  focus: '',
};

function formatStatus(value) {
  return value ? value.replace('_', ' ') : '';
}

function Roadmaps() {
  const [searchParams, setSearchParams] = useSearchParams();
  const goalFilter = searchParams.get('goal');

  const [roadmaps, setRoadmaps] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [aiForm, setAiForm] = useState(EMPTY_AI_FORM);
  const [generating, setGenerating] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingRoadmap, setSavingRoadmap] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [savingTask, setSavingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState(null);

  const loadGoals = useCallback(async () => {
    try {
      const response = await careerGoalsApi.list();
      setGoals(response.data.goals || []);
    } catch {
      setGoals([]);
    }
  }, []);

  const loadRoadmaps = useCallback(
    async ({ selectId = null, silent = false } = {}) => {
      if (!silent) setListLoading(true);
      setListError('');

      try {
        const response = await roadmapsApi.list();
        const list = response.data.roadmaps || [];
        setRoadmaps(list);

        if (selectId) {
          setSelectedId(selectId);
        } else {
          setSelectedId((current) =>
            list.some((roadmap) => roadmap.id === current)
              ? current
              : list[0]?.id ?? null
          );
        }
      } catch (err) {
        setListError(err.message || 'Unable to load your roadmaps.');
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadGoals();
    loadRoadmaps();
  }, [loadGoals, loadRoadmaps]);

  const visibleRoadmaps = useMemo(() => {
    if (!goalFilter) return roadmaps;
    return roadmaps.filter(
      (roadmap) => String(roadmap.career_goal_id) === String(goalFilter)
    );
  }, [goalFilter, roadmaps]);

  useEffect(() => {
    setSelectedId((current) =>
      visibleRoadmaps.some((roadmap) => roadmap.id === current)
        ? current
        : visibleRoadmaps[0]?.id ?? null
    );
  }, [visibleRoadmaps]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setDetailLoading(false);
      setDetailError('');
      return undefined;
    }

    let active = true;
    setDetailLoading(true);
    setDetailError('');

    roadmapsApi
      .get(selectedId)
      .then((response) => {
        if (active) setSelected(response.data.roadmap);
      })
      .catch((err) => {
        if (active) {
          setSelected(null);
          setDetailError(err.message || 'Unable to load that roadmap.');
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, detailRefresh]);

  const stats = useMemo(() => {
    const totalTasks = roadmaps.reduce(
      (total, roadmap) => total + roadmap.task_count,
      0
    );
    const completedTasks = roadmaps.reduce(
      (total, roadmap) => total + roadmap.completed_task_count,
      0
    );
    const totalProgress = roadmaps.reduce(
      (total, roadmap) => total + roadmap.progress_percent,
      0
    );

    return {
      total: roadmaps.length,
      active: roadmaps.filter((roadmap) => roadmap.status === 'active').length,
      completedTasks,
      totalTasks,
      averageProgress: roadmaps.length
        ? Math.round(totalProgress / roadmaps.length)
        : 0,
    };
  }, [roadmaps]);

  const selectedGoalLabel = goalFilter
    ? goals.find((goal) => String(goal.id) === String(goalFilter))
        ?.career_title || 'Selected goal'
    : '';

  const clearGoalFilter = () => setSearchParams({});

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
    setActionError('');
    setSuccess('');
  };

  const handleCreateRoadmap = async (event) => {
    event.preventDefault();
    setCreating(true);
    setActionError('');
    setSuccess('');

    try {
      const response = await roadmapsApi.create({
        title: createForm.title,
        summary: createForm.summary || undefined,
        career_goal_id: createForm.career_goal_id
          ? Number(createForm.career_goal_id)
          : undefined,
      });
      const newRoadmap = response.data.roadmap;

      setCreateForm(EMPTY_CREATE_FORM);
      setSearchParams({});
      setSuccess(`${newRoadmap.title} created.`);
      await loadRoadmaps({ selectId: newRoadmap.id });
    } catch (err) {
      setActionError(err.message || 'Unable to create that roadmap.');
    } finally {
      setCreating(false);
    }
  };

  const handleAiChange = (event) => {
    const { name, value } = event.target;
    setAiForm((current) => ({ ...current, [name]: value }));
    setActionError('');
    setSuccess('');
  };

  const handleGenerateRoadmap = async (event) => {
    event.preventDefault();

    if (!aiForm.career_goal_id) {
      setActionError('Choose a career goal before generating a roadmap.');
      return;
    }

    setGenerating(true);
    setActionError('');
    setSuccess('');

    try {
      const response = await aiApi.generateRoadmap({
        career_goal_id: Number(aiForm.career_goal_id),
        timeframe_weeks: Number(aiForm.timeframe_weeks),
        hours_per_week: Number(aiForm.hours_per_week),
        focus: aiForm.focus || undefined,
      });
      const newRoadmap = response.data.roadmap;

      setAiForm((current) => ({ ...current, focus: '' }));
      setSearchParams({});
      setSuccess(
        `${newRoadmap.title} created with ${response.data.generated_tasks} AI-generated tasks. Review and adjust them as needed.`
      );
      await loadRoadmaps({ selectId: newRoadmap.id });
    } catch (err) {
      setActionError(
        err.message || 'Unable to generate a roadmap right now.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleRoadmapStatus = async (status) => {
    if (!selected || status === selected.status) return;

    setSavingRoadmap(true);
    setActionError('');
    setSuccess('');

    try {
      const response = await roadmapsApi.update(selected.id, { status });
      setSelected(response.data.roadmap);
      setSuccess('Roadmap status updated.');
      await loadRoadmaps({ silent: true });
    } catch (err) {
      setActionError(err.message || 'Unable to update that roadmap.');
    } finally {
      setSavingRoadmap(false);
    }
  };

  const startEditingRoadmap = () => {
    setEditForm({
      title: selected.title,
      summary: selected.summary || '',
      career_goal_id: selected.career_goal_id
        ? String(selected.career_goal_id)
        : '',
    });
    setActionError('');
    setSuccess('');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const saveRoadmap = async (event) => {
    event.preventDefault();
    setSavingRoadmap(true);
    setActionError('');
    setSuccess('');

    try {
      const response = await roadmapsApi.update(selected.id, {
        title: editForm.title,
        summary: editForm.summary,
        career_goal_id: editForm.career_goal_id
          ? Number(editForm.career_goal_id)
          : null,
      });

      setSelected(response.data.roadmap);
      setEditForm(null);
      setSuccess('Roadmap details updated.');
      await loadRoadmaps({ silent: true });
    } catch (err) {
      setActionError(err.message || 'Unable to update that roadmap.');
    } finally {
      setSavingRoadmap(false);
    }
  };

  const deleteRoadmap = async () => {
    if (
      !window.confirm(
        `Delete "${selected.title}" and all of its tasks? This cannot be undone.`
      )
    ) {
      return;
    }

    setSavingRoadmap(true);
    setActionError('');
    setSuccess('');

    try {
      await roadmapsApi.remove(selected.id);
      setSelected(null);
      setSelectedId(null);
      setSuccess('Roadmap deleted.');
      await loadRoadmaps();
    } catch (err) {
      setActionError(err.message || 'Unable to delete that roadmap.');
    } finally {
      setSavingRoadmap(false);
    }
  };

  const handleTaskChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((current) => ({ ...current, [name]: value }));
    setActionError('');
  };

  const refreshDetailAndList = async () => {
    setDetailRefresh((current) => current + 1);
    await loadRoadmaps({ silent: true });
  };

  const addTask = async (event) => {
    event.preventDefault();
    setSavingTask(true);
    setActionError('');
    setSuccess('');

    try {
      await roadmapsApi.createTask(selected.id, {
        title: taskForm.title,
        description: taskForm.description || undefined,
        skills_to_develop: taskForm.skills_to_develop || undefined,
        estimated_duration: taskForm.estimated_duration || undefined,
      });

      setTaskForm(EMPTY_TASK_FORM);
      setAddingTask(false);
      setSuccess('Task added.');
      await refreshDetailAndList();
    } catch (err) {
      setActionError(err.message || 'Unable to add that task.');
    } finally {
      setSavingTask(false);
    }
  };

  const updateTaskStatus = async (task, status) => {
    if (status === task.status) return;

    setBusyTaskId(task.id);
    setActionError('');
    setSuccess('');

    try {
      await roadmapsApi.updateTask(selected.id, task.id, { status });
      setSuccess('Task progress updated.');
      await refreshDetailAndList();
    } catch (err) {
      setActionError(err.message || 'Unable to update that task.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete the task "${task.title}"?`)) return;

    setBusyTaskId(task.id);
    setActionError('');
    setSuccess('');

    try {
      await roadmapsApi.removeTask(selected.id, task.id);
      setSuccess('Task deleted.');
      await refreshDetailAndList();
    } catch (err) {
      setActionError(err.message || 'Unable to delete that task.');
    } finally {
      setBusyTaskId(null);
    }
  };

  const statsCards = [
    { label: 'Roadmaps', value: stats.total },
    { label: 'Active', value: stats.active },
    {
      label: 'Tasks done',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
    },
    { label: 'Avg progress', value: `${stats.averageProgress}%` },
  ];

  return (
    <div className="roadmaps">
      <PageHeader
        eyebrow="Learning plans"
        icon={Map}
        title="Learning roadmaps"
        description="Break a career goal into practical steps. Mark tasks as you start and finish them so your progress stays visible."
      />

      <section className="section section--soft">
        <div className="container">
          <StatGrid
            ariaLabel="Roadmap totals"
            items={statsCards.map((stat) => ({
              ...stat,
              value: listLoading ? '-' : stat.value,
            }))}
          />

          {success && (
            <div className="alert alert-success" role="status">
              {success}
            </div>
          )}
          {actionError && (
            <div className="alert alert-error" role="alert">
              {actionError}
            </div>
          )}

          <form className="card roadmaps__ai" onSubmit={handleGenerateRoadmap}>
            <div className="roadmaps__create-heading">
              <div>
                <h2>
                  <Sparkles size={19} /> Generate a roadmap with AI
                </h2>
                <p>
                  Uses your profile, skills, and chosen goal to draft a
                  week-by-week plan. You can edit every task afterwards.
                </p>
              </div>
            </div>

            {goals.length === 0 ? (
              <p className="roadmaps__hint">
                <Link to="/goals">Create a career goal</Link> first, then come
                back to generate a roadmap.
              </p>
            ) : (
              <>
                <div className="roadmaps__ai-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ai-goal">
                      Career goal
                    </label>
                    <select
                      id="ai-goal"
                      name="career_goal_id"
                      className="form-select"
                      value={aiForm.career_goal_id}
                      onChange={handleAiChange}
                      required
                    >
                      <option value="">Choose a goal</option>
                      {goals.map((goal) => (
                        <option value={goal.id} key={goal.id}>
                          {goal.career_title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="ai-weeks">
                      Timeframe (weeks)
                    </label>
                    <input
                      id="ai-weeks"
                      name="timeframe_weeks"
                      type="number"
                      className="form-input"
                      min="4"
                      max="52"
                      value={aiForm.timeframe_weeks}
                      onChange={handleAiChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="ai-hours">
                      Hours per week
                    </label>
                    <input
                      id="ai-hours"
                      name="hours_per_week"
                      type="number"
                      className="form-input"
                      min="1"
                      max="40"
                      value={aiForm.hours_per_week}
                      onChange={handleAiChange}
                      required
                    />
                  </div>

                  <div className="form-group roadmaps__ai-focus">
                    <label className="form-label" htmlFor="ai-focus">
                      Focus (optional)
                    </label>
                    <input
                      id="ai-focus"
                      name="focus"
                      className="form-input"
                      placeholder="e.g. portfolio projects and interview practice"
                      value={aiForm.focus}
                      onChange={handleAiChange}
                      maxLength={300}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary roadmaps__create-button"
                  disabled={generating}
                >
                  <Sparkles size={17} />
                  {generating ? 'Generating...' : 'Generate roadmap'}
                </button>
              </>
            )}
          </form>

          <form className="card roadmaps__create" onSubmit={handleCreateRoadmap}>
            <div className="roadmaps__create-heading">
              <div>
                <h2>New roadmap</h2>
                <p>Give the plan a name and optionally link it to a goal.</p>
              </div>
              <Map size={22} className="roadmaps__heading-icon" />
            </div>

            <div className="roadmaps__create-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="roadmap-title">
                  Title
                </label>
                <input
                  id="roadmap-title"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Frontend developer path"
                  value={createForm.title}
                  onChange={handleCreateChange}
                  maxLength={200}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="roadmap-goal">
                  Career goal
                </label>
                <select
                  id="roadmap-goal"
                  name="career_goal_id"
                  className="form-select"
                  value={createForm.career_goal_id}
                  onChange={handleCreateChange}
                >
                  <option value="">No linked goal</option>
                  {goals.map((goal) => (
                    <option value={goal.id} key={goal.id}>
                      {goal.career_title}
                    </option>
                  ))}
                </select>
                {goals.length === 0 && (
                  <p className="roadmaps__hint">
                    <Link to="/goals">Create a career goal</Link> to link plans
                    to your direction.
                  </p>
                )}
              </div>

              <div className="form-group roadmaps__summary-field">
                <label className="form-label" htmlFor="roadmap-summary">
                  Summary
                </label>
                <textarea
                  id="roadmap-summary"
                  name="summary"
                  className="form-textarea roadmaps__summary-input"
                  placeholder="What will this roadmap help you achieve?"
                  value={createForm.summary}
                  onChange={handleCreateChange}
                  maxLength={5000}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary roadmaps__create-button"
              disabled={creating}
            >
              <Plus size={17} /> {creating ? 'Creating...' : 'Create roadmap'}
            </button>
          </form>

          {goalFilter && (
            <div className="alert alert-info roadmaps__filter">
              Showing roadmaps for <strong>{selectedGoalLabel}</strong>.
              <button type="button" onClick={clearGoalFilter}>
                Clear filter
              </button>
            </div>
          )}

          <div className="roadmaps__layout">
            <aside className="card roadmaps__list">
              <div className="roadmaps__list-heading">
                <h2>Your roadmaps</h2>
                <span className="badge">{visibleRoadmaps.length}</span>
              </div>

              {listLoading && (
                <div
                  className="spinner"
                  role="status"
                  aria-label="Loading roadmaps"
                />
              )}

              {!listLoading && listError && (
                <>
                  <div className="alert alert-error" role="alert">
                    {listError}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => loadRoadmaps()}
                  >
                    Try again
                  </button>
                </>
              )}

              {!listLoading && !listError && visibleRoadmaps.length === 0 && (
                <div className="roadmaps__list-empty">
                  <ListChecks size={28} />
                  <p>
                    {goalFilter
                      ? 'No roadmaps are linked to this goal yet.'
                      : 'Create your first roadmap above.'}
                  </p>
                  {goalFilter && (
                    <button type="button" onClick={clearGoalFilter}>
                      Show all roadmaps
                    </button>
                  )}
                </div>
              )}

              {!listLoading && !listError && visibleRoadmaps.length > 0 && (
                <ul className="roadmaps__items">
                  {visibleRoadmaps.map((roadmap) => (
                    <li key={roadmap.id}>
                      <button
                        type="button"
                        className={`roadmaps__item ${
                          selectedId === roadmap.id
                            ? 'roadmaps__item--active'
                            : ''
                        }`}
                        onClick={() => setSelectedId(roadmap.id)}
                      >
                        <span className="roadmaps__item-top">
                          <strong>{roadmap.title}</strong>
                          <span
                            className={`status-badge status-badge--${roadmap.status}`}
                          >
                            {formatStatus(roadmap.status)}
                          </span>
                        </span>
                        <span className="roadmaps__item-goal">
                          {roadmap.career_title || 'No linked goal'}
                        </span>
                        <span className="roadmaps__mini-progress">
                          <span
                            style={{ width: `${roadmap.progress_percent}%` }}
                          />
                        </span>
                        <span className="roadmaps__item-meta">
                          {roadmap.completed_task_count}/{roadmap.task_count}{' '}
                          tasks done
                          <span>{roadmap.progress_percent}%</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div className="roadmaps__detail">
              {detailLoading && (
                <div
                  className="spinner roadmaps__detail-spinner"
                  role="status"
                  aria-label="Loading roadmap details"
                />
              )}

              {!detailLoading && detailError && (
                <div className="card roadmaps__empty">
                  <div className="alert alert-error" role="alert">
                    {detailError}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setDetailRefresh((current) => current + 1)}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!detailLoading && !detailError && !selected && (
                <div className="card roadmaps__empty">
                  <ListChecks size={32} />
                  <h2>No roadmap selected</h2>
                  <p>
                    Create a roadmap or choose one from the list to manage its
                    tasks.
                  </p>
                </div>
              )}

              {!detailLoading && !detailError && selected && (
                <>
                  <article className="card roadmaps__detail-card">
                    {editForm ? (
                      <form onSubmit={saveRoadmap}>
                        <div className="roadmaps__detail-edit-head">
                          <h2>Edit roadmap</h2>
                          <button
                            type="button"
                            className="roadmaps__icon-button"
                            onClick={() => setEditForm(null)}
                            aria-label="Cancel editing roadmap"
                            title="Cancel"
                          >
                            <X size={17} />
                          </button>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="edit-title">
                            Title
                          </label>
                          <input
                            id="edit-title"
                            name="title"
                            className="form-input"
                            value={editForm.title}
                            onChange={handleEditChange}
                            maxLength={200}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="edit-goal">
                            Career goal
                          </label>
                          <select
                            id="edit-goal"
                            name="career_goal_id"
                            className="form-select"
                            value={editForm.career_goal_id}
                            onChange={handleEditChange}
                          >
                            <option value="">No linked goal</option>
                            {goals.map((goal) => (
                              <option value={goal.id} key={goal.id}>
                                {goal.career_title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="edit-summary">
                            Summary
                          </label>
                          <textarea
                            id="edit-summary"
                            name="summary"
                            className="form-textarea roadmaps__summary-input"
                            value={editForm.summary}
                            onChange={handleEditChange}
                            maxLength={5000}
                          />
                        </div>

                        <div className="roadmaps__detail-edit-actions">
                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={savingRoadmap}
                          >
                            <Check size={15} /> Save changes
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditForm(null)}
                            disabled={savingRoadmap}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="roadmaps__detail-head">
                          <div className="roadmaps__detail-title">
                            <span
                              className={`status-badge status-badge--${selected.status}`}
                            >
                              {formatStatus(selected.status)}
                            </span>
                            <h2>{selected.title}</h2>
                            <p>{selected.summary || 'No summary yet.'}</p>
                            <span className="roadmaps__detail-goal">
                              <Map size={15} />
                              {selected.career_title || 'No linked goal'}
                            </span>
                          </div>

                          <div className="roadmaps__detail-controls">
                            <select
                              className="form-select roadmaps__status-select"
                              value={selected.status}
                              onChange={(event) =>
                                handleRoadmapStatus(event.target.value)
                              }
                              disabled={savingRoadmap}
                              aria-label="Roadmap status"
                            >
                              {ROADMAP_STATUSES.map((status) => (
                                <option value={status} key={status}>
                                  {formatStatus(status)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="roadmaps__icon-button"
                              onClick={startEditingRoadmap}
                              aria-label="Edit roadmap details"
                              title="Edit roadmap"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="roadmaps__icon-button roadmaps__icon-button--danger"
                              onClick={deleteRoadmap}
                              disabled={savingRoadmap}
                              aria-label="Delete roadmap"
                              title="Delete roadmap"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="roadmaps__progress">
                          <div className="roadmaps__progress-top">
                            <span>Progress</span>
                            <strong>{selected.progress_percent}%</strong>
                          </div>
                          <div className="roadmaps__progress-bar">
                            <span
                              style={{
                                width: `${selected.progress_percent}%`,
                              }}
                            />
                          </div>
                          <span className="roadmaps__progress-caption">
                            {selected.completed_task_count} of{' '}
                            {selected.task_count} tasks completed
                          </span>
                        </div>
                      </>
                    )}
                  </article>

                  <section className="card roadmaps__tasks">
                    <div className="roadmaps__tasks-heading">
                      <div>
                        <h2>Tasks</h2>
                        <p>Small, concrete steps work best.</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm roadmaps__add-task-toggle"
                        onClick={() => {
                          setAddingTask((current) => !current);
                          setActionError('');
                        }}
                      >
                        {addingTask ? (
                          <>
                            <X size={16} /> Cancel
                          </>
                        ) : (
                          <>
                            <Plus size={16} /> Add task
                          </>
                        )}
                      </button>
                    </div>

                    {addingTask && (
                      <form className="roadmaps__task-form" onSubmit={addTask}>
                        <div className="form-group">
                          <label className="form-label" htmlFor="task-title">
                            Task title
                          </label>
                          <input
                            id="task-title"
                            name="title"
                            className="form-input"
                            placeholder="e.g. Build a small portfolio project"
                            value={taskForm.title}
                            onChange={handleTaskChange}
                            maxLength={200}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label
                            className="form-label"
                            htmlFor="task-description"
                          >
                            Description
                          </label>
                          <textarea
                            id="task-description"
                            name="description"
                            className="form-textarea roadmaps__summary-input"
                            placeholder="What should you do to finish this step?"
                            value={taskForm.description}
                            onChange={handleTaskChange}
                            maxLength={5000}
                          />
                        </div>

                        <div className="roadmaps__task-form-grid">
                          <div className="form-group">
                            <label
                              className="form-label"
                              htmlFor="task-skills"
                            >
                              Skills to develop
                            </label>
                            <input
                              id="task-skills"
                              name="skills_to_develop"
                              className="form-input"
                              placeholder="e.g. React, Git"
                              value={taskForm.skills_to_develop}
                              onChange={handleTaskChange}
                              maxLength={500}
                            />
                          </div>

                          <div className="form-group">
                            <label
                              className="form-label"
                              htmlFor="task-duration"
                            >
                              Estimated duration
                            </label>
                            <input
                              id="task-duration"
                              name="estimated_duration"
                              className="form-input"
                              placeholder="e.g. 2 weeks"
                              value={taskForm.estimated_duration}
                              onChange={handleTaskChange}
                              maxLength={100}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={savingTask}
                        >
                          <Plus size={16} />{' '}
                          {savingTask ? 'Adding...' : 'Add task'}
                        </button>
                      </form>
                    )}

                    {selected.tasks.length === 0 ? (
                      <div className="roadmaps__tasks-empty">
                        <ListChecks size={28} />
                        <p>No tasks yet. Add the first step above.</p>
                      </div>
                    ) : (
                      <ul className="roadmaps__task-list">
                        {selected.tasks.map((task) => (
                          <li
                            className={`roadmaps__task ${
                              busyTaskId === task.id
                                ? 'roadmaps__task--busy'
                                : ''
                            }`}
                            key={task.id}
                          >
                            <div className="roadmaps__task-main">
                              <div className="roadmaps__task-top">
                                <h3>{task.title}</h3>
                                <span
                                  className={`status-badge status-badge--${task.status}`}
                                >
                                  {formatStatus(task.status)}
                                </span>
                              </div>

                              {task.description && <p>{task.description}</p>}

                              <div className="roadmaps__task-meta">
                                {task.skills_to_develop && (
                                  <span>{task.skills_to_develop}</span>
                                )}
                                {task.estimated_duration && (
                                  <span>{task.estimated_duration}</span>
                                )}
                              </div>
                            </div>

                            <div className="roadmaps__task-controls">
                              <select
                                className="form-select roadmaps__task-status"
                                value={task.status}
                                onChange={(event) =>
                                  updateTaskStatus(task, event.target.value)
                                }
                                disabled={busyTaskId !== null}
                                aria-label={`Status for ${task.title}`}
                              >
                                {TASK_STATUSES.map((status) => (
                                  <option value={status} key={status}>
                                    {formatStatus(status)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="roadmaps__icon-button roadmaps__icon-button--danger"
                                onClick={() => deleteTask(task)}
                                disabled={busyTaskId !== null}
                                aria-label={`Delete ${task.title}`}
                                title="Delete task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Roadmaps;
