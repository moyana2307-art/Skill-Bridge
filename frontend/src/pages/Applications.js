import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarClock,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { applicationsApi } from '../api/client';
import { formatDate, titleCase } from '../utils/format';
import PageHeader from '../components/PageHeader';
import './Applications.css';

const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];

const EMPTY_FORM = {
  title: '',
  organisation: '',
  status: 'saved',
  applied_at: '',
  deadline: '',
  notes: '',
};

function Applications() {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([applicationsApi.list(), applicationsApi.summary()])
      .then(([listResponse, summaryResponse]) => {
        setApplications(listResponse.data.applications || []);
        setSummary(summaryResponse.data);
      })
      .catch((err) => setError(err.message || 'Unable to load applications.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () =>
      filter
        ? applications.filter((item) => item.status === filter)
        : applications,
    [applications, filter]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Add a job title or role name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await applicationsApi.create({
        title: form.title.trim(),
        organisation: form.organisation.trim() || undefined,
        status: form.status,
        applied_at: form.applied_at || undefined,
        deadline: form.deadline || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || 'Unable to add that application.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (applicationId, status) => {
    setError('');
    try {
      await applicationsApi.update(applicationId, { status });
      setApplications((current) =>
        current.map((item) =>
          item.id === applicationId ? { ...item, status } : item
        )
      );
      applicationsApi.summary().then((response) => setSummary(response.data));
    } catch (err) {
      setError(err.message || 'Unable to update that application.');
    }
  };

  const handleDelete = async (applicationId) => {
    if (!window.confirm('Delete this application?')) return;

    try {
      await applicationsApi.remove(applicationId);
      setApplications((current) =>
        current.filter((item) => item.id !== applicationId)
      );
      applicationsApi.summary().then((response) => setSummary(response.data));
    } catch (err) {
      setError(err.message || 'Unable to delete that application.');
    }
  };

  const counts = summary?.by_status || {};

  return (
    <div className="applications">
      <PageHeader
        eyebrow="Application tracker"
        icon={BriefcaseBusiness}
        title="Keep your job search organised"
        description="Track every application from saved to offer, with deadlines and notes in one place."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((current) => !current)}
          >
            <Plus size={16} /> {showForm ? 'Close form' : 'Add application'}
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

          <div className="applications__summary">
            <div className="card applications__summary-card">
              <span>Total tracked</span>
              <strong>{summary?.total ?? applications.length}</strong>
            </div>
            {['applied', 'interviewing', 'offer', 'rejected'].map((status) => (
              <div className="card applications__summary-card" key={status}>
                <span>{titleCase(status)}</span>
                <strong>{counts[status] || 0}</strong>
              </div>
            ))}
          </div>

          {showForm && (
            <form className="card applications__form" onSubmit={handleSubmit}>
              <h2>Add an application</h2>
              <div className="applications__form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="app-title">
                    Role title
                  </label>
                  <input
                    id="app-title"
                    name="title"
                    className="form-input"
                    value={form.title}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="app-organisation">
                    Organisation
                  </label>
                  <input
                    id="app-organisation"
                    name="organisation"
                    className="form-input"
                    value={form.organisation}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="app-status">
                    Status
                  </label>
                  <select
                    id="app-status"
                    name="status"
                    className="form-select"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {STATUSES.map((status) => (
                      <option value={status} key={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="app-applied">
                    Applied on
                  </label>
                  <input
                    id="app-applied"
                    name="applied_at"
                    type="date"
                    className="form-input"
                    value={form.applied_at}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="app-deadline">
                    Deadline
                  </label>
                  <input
                    id="app-deadline"
                    name="deadline"
                    type="date"
                    className="form-input"
                    value={form.deadline}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group applications__form-wide">
                  <label className="form-label" htmlFor="app-notes">
                    Notes
                  </label>
                  <textarea
                    id="app-notes"
                    name="notes"
                    className="form-textarea"
                    rows={2}
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Contacts, interview stages, documents sent…"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save application'}
              </button>
            </form>
          )}

          <div className="applications__filters">
            <button
              type="button"
              className={`applications__filter ${!filter ? 'is-active' : ''}`}
              onClick={() => setFilter('')}
            >
              All
            </button>
            {STATUSES.map((status) => (
              <button
                type="button"
                key={status}
                className={`applications__filter ${
                  filter === status ? 'is-active' : ''
                }`}
                onClick={() => setFilter(status)}
              >
                {titleCase(status)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="spinner" role="status" aria-label="Loading applications" />
          ) : visible.length ? (
            <div className="applications__list">
              {visible.map((application) => (
                <article className="card applications__item" key={application.id}>
                  <div className="applications__item-main">
                    <div>
                      <h2>{application.title}</h2>
                      <p>{application.organisation || 'Organisation not listed'}</p>
                    </div>
                    <span className={`status-badge status-badge--${application.status}`}>
                      {titleCase(application.status)}
                    </span>
                  </div>

                  <div className="applications__meta">
                    {application.applied_at && (
                      <span>
                        <TrendingUp size={14} /> Applied {formatDate(application.applied_at)}
                      </span>
                    )}
                    {application.deadline && (
                      <span>
                        <CalendarClock size={14} /> Due {formatDate(application.deadline)}
                      </span>
                    )}
                  </div>

                  {application.notes && (
                    <p className="applications__notes">{application.notes}</p>
                  )}

                  <div className="applications__actions">
                    <select
                      className="form-select applications__status-select"
                      value={application.status}
                      onChange={(event) =>
                        handleStatus(application.id, event.target.value)
                      }
                      aria-label={`Change status for ${application.title}`}
                    >
                      {STATUSES.map((status) => (
                        <option value={status} key={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDelete(application.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BriefcaseBusiness size={28} />
              <p>
                {filter
                  ? `No applications with status "${titleCase(filter)}".`
                  : 'No applications yet. Add your first one to start tracking.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Applications;
