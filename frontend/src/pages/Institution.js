import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  GraduationCap,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react';
import { institutionsApi } from '../api/client';
import { formatDate } from '../utils/format';
import PageHeader from '../components/PageHeader';
import './Institution.css';

const PACKAGES = [
  { code: 'small', label: 'Small - 50 seats - $49/mo' },
  { code: 'growing', label: 'Growing - 150 seats - $99/mo' },
  { code: 'large', label: 'Large - 500 seats - $199/mo' },
];

function Institution() {
  const [institutions, setInstitutions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    contact_email: '',
    package_code: 'small',
    seat_limit: '',
  });
  const [creating, setCreating] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [addingMember, setAddingMember] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkAdding, setBulkAdding] = useState(false);
  const [settings, setSettings] = useState({
    package_code: 'small',
    seat_limit: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const loadInstitutions = useCallback(async () => {
    const response = await institutionsApi.list();
    const list = response.data.institutions || [];
    setInstitutions(list);
    setSelectedId((current) => {
      if (current && list.some((item) => String(item.id) === String(current))) {
        return current;
      }
      return list[0] ? String(list[0].id) : '';
    });
    return list;
  }, []);

  useEffect(() => {
    loadInstitutions()
      .catch((err) => setError(err.message || 'Unable to load institutions.'))
      .finally(() => setLoading(false));
  }, [loadInstitutions]);

  const selected = institutions.find(
    (item) => String(item.id) === String(selectedId)
  );

  const loadDashboard = useCallback(async (institutionId) => {
    if (!institutionId) {
      setDashboard(null);
      return;
    }
    setDashboardLoading(true);
    setError('');
    try {
      const response = await institutionsApi.get(institutionId);
      setDashboard(response.data);
      setSettings({
        package_code: response.data.institution.package_code,
        seat_limit: String(response.data.institution.seat_limit),
      });
    } catch (err) {
      setDashboard(null);
      setError(err.message || 'Unable to load that institution.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected?.member_role === 'admin') {
      loadDashboard(selectedId);
    } else {
      setDashboard(null);
    }
  }, [selectedId, selected, loadDashboard]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const response = await institutionsApi.create({
        name: createForm.name.trim(),
        contact_email: createForm.contact_email.trim() || undefined,
        package_code: createForm.package_code,
        seat_limit: createForm.seat_limit
          ? Number(createForm.seat_limit)
          : undefined,
      });
      setCreateForm({
        name: '',
        contact_email: '',
        package_code: 'small',
        seat_limit: '',
      });
      await loadInstitutions();
      setSelectedId(String(response.data.institution.id));
      setNotice(
        'Institution created. A platform administrator must approve it before you can add students.'
      );
    } catch (err) {
      setError(err.message || 'Unable to create that institution.');
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setAddingMember(true);
    setError('');
    setNotice('');
    try {
      await institutionsApi.addMember(selectedId, {
        email: memberForm.email.trim(),
        role: memberForm.role,
      });
      setMemberForm({ email: '', role: 'member' });
      await loadDashboard(selectedId);
      setNotice('Member added. Existing paid plans were left unchanged.');
    } catch (err) {
      setError(err.message || 'Unable to add that member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleBulkAdd = async (event) => {
    event.preventDefault();
    const emails = bulkEmails
      .split(/[\s,;]+/)
      .map((email) => email.trim())
      .filter(Boolean);
    if (!emails.length) {
      setError('Add at least one email address.');
      return;
    }
    setBulkAdding(true);
    setError('');
    setNotice('');
    try {
      const response = await institutionsApi.addMembers(selectedId, { emails });
      setBulkEmails('');
      await loadDashboard(selectedId);
      setNotice(
        `${response.data.added} member${
          response.data.added === 1 ? '' : 's'
        } added. ${response.data.skipped} skipped.`
      );
    } catch (err) {
      setError(err.message || 'Unable to add those members.');
    } finally {
      setBulkAdding(false);
    }
  };

  const handleMemberRole = async (userId, role) => {
    setError('');
    try {
      await institutionsApi.updateMember(selectedId, userId, { role });
      await loadDashboard(selectedId);
    } catch (err) {
      setError(err.message || 'Unable to update that member.');
    }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from this institution?`)) return;
    setError('');
    try {
      await institutionsApi.removeMember(selectedId, userId);
      await loadDashboard(selectedId);
      setNotice('Member removed. Their plan will return to Free.');
    } catch (err) {
      setError(err.message || 'Unable to remove that member.');
    }
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);
    setError('');
    setNotice('');
    try {
      await institutionsApi.update(selectedId, {
        package_code: settings.package_code,
        seat_limit: settings.seat_limit ? Number(settings.seat_limit) : undefined,
      });
      await loadDashboard(selectedId);
      await loadInstitutions();
      setNotice('Institution settings saved.');
    } catch (err) {
      setError(err.message || 'Unable to save institution settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="institution">
      <PageHeader
        eyebrow="Institutions"
        icon={Building2}
        title="Manage student access"
        description="Create an institution, assign seats, and track student readiness from one place."
      />

      <section className="section section--soft">
        <div className="container">
          {error && <div className="alert alert-error">{error}</div>}
          {notice && <div className="alert alert-success">{notice}</div>}
          {loading && (
            <div className="spinner" role="status" aria-label="Loading institutions" />
          )}

          {!loading && (
            <div className="institution__layout">
              <aside className="institution__sidebar">
                {institutions.length > 0 && (
                  <article className="card institution__list-card">
                    <h2>Your institutions</h2>
                    <div className="institution__list">
                      {institutions.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`institution__list-item ${
                            String(item.id) === String(selectedId) ? 'is-active' : ''
                          }`}
                          onClick={() => setSelectedId(String(item.id))}
                        >
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.seat_used ?? 0}/{item.seat_limit} seats -{' '}
                              {item.member_role}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </article>
                )}

                <form className="card institution__create" onSubmit={handleCreate}>
                  <h2>
                    <Plus size={17} /> Create an institution
                  </h2>
                  <p>
                    You become the administrator and can add students by email.
                  </p>
                  <div className="form-group">
                    <label className="form-label" htmlFor="institution-name">
                      Institution name
                    </label>
                    <input
                      id="institution-name"
                      className="form-input"
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                      minLength={2}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="institution-email">
                      Contact email (optional)
                    </label>
                    <input
                      id="institution-email"
                      type="email"
                      className="form-input"
                      value={createForm.contact_email}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          contact_email: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="institution-package">
                      Package
                    </label>
                    <select
                      id="institution-package"
                      className="form-select"
                      value={createForm.package_code}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          package_code: event.target.value,
                        }))
                      }
                    >
                      {PACKAGES.map((pack) => (
                        <option key={pack.code} value={pack.code}>
                          {pack.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="institution-seats">
                      Seat limit (optional)
                    </label>
                    <input
                      id="institution-seats"
                      type="number"
                      min="1"
                      max="10000"
                      className="form-input"
                      value={createForm.seat_limit}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          seat_limit: event.target.value,
                        }))
                      }
                      placeholder="Uses the package default"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
                    {creating ? 'Creating...' : 'Create institution'}
                  </button>
                </form>
              </aside>

              <div className="institution__main">
                {!selected ? (
                  <article className="card institution__empty">
                    <GraduationCap size={34} />
                    <h2>No institution yet</h2>
                    <p>
                      Create one with the form to start assigning Premium access
                      to students.
                    </p>
                  </article>
                ) : selected.member_role !== 'admin' ? (
                  <article className="card institution__empty">
                    <Users size={34} />
                    <h2>{selected.name}</h2>
                    <p>
                      You are a member of this institution. Ask an institution
                      administrator to manage seats and members.
                    </p>
                  </article>
                ) : dashboardLoading ? (
                  <div className="spinner" role="status" aria-label="Loading dashboard" />
                ) : dashboard ? (
                  selected.status === 'active' ? (
                    <>
                      <div className="institution__summary">
                      {[
                        ['Students', dashboard.summary.members],
                        ['Seats left', dashboard.summary.seat_available],
                        [
                          'Average readiness',
                          dashboard.summary.average_readiness != null
                            ? `${dashboard.summary.average_readiness}/100`
                            : '-',
                        ],
                        ['Roadmap progress', `${dashboard.summary.roadmap_progress_percent}%`],
                        ['Assessments', dashboard.summary.assessments],
                        ['Skills tracked', dashboard.summary.skills],
                      ].map(([label, value]) => (
                        <article className="card institution__stat" key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </article>
                      ))}
                    </div>

                    <div className="institution__grid">
                      <form className="card institution__member-form" onSubmit={handleAddMember}>
                        <h2>
                          <Mail size={17} /> Add a student
                        </h2>
                        <p>The student must already have a SkillBridge AI account.</p>
                        <div className="institution__inline-form">
                          <input
                            type="email"
                            className="form-input"
                            value={memberForm.email}
                            onChange={(event) =>
                              setMemberForm((current) => ({
                                ...current,
                                email: event.target.value,
                              }))
                            }
                            placeholder="student@example.com"
                            aria-label="Student email"
                            required
                          />
                          <select
                            className="form-select"
                            value={memberForm.role}
                            onChange={(event) =>
                              setMemberForm((current) => ({
                                ...current,
                                role: event.target.value,
                              }))
                            }
                            aria-label="Member role"
                          >
                            <option value="member">Student</option>
                            <option value="admin">Co-admin</option>
                          </select>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={addingMember}
                          >
                            {addingMember ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </form>

                      <form className="card institution__bulk" onSubmit={handleBulkAdd}>
                        <h2>
                          <Users size={17} /> Add several students
                        </h2>
                        <p>Paste emails separated by commas, spaces, or new lines.</p>
                        <textarea
                          className="form-textarea"
                          rows={3}
                          value={bulkEmails}
                          onChange={(event) => setBulkEmails(event.target.value)}
                          placeholder="one@example.com, two@example.com"
                        />
                        <button
                          type="submit"
                          className="btn btn-outline"
                          disabled={bulkAdding}
                        >
                          {bulkAdding ? 'Adding...' : 'Add students'}
                        </button>
                      </form>

                      <form className="card institution__settings" onSubmit={handleSaveSettings}>
                        <h2>
                          <RefreshCw size={17} /> Institution settings
                        </h2>
                        <div className="institution__settings-grid">
                          <div className="form-group">
                            <label className="form-label" htmlFor="settings-package">
                              Package
                            </label>
                            <select
                              id="settings-package"
                              className="form-select"
                              value={settings.package_code}
                              onChange={(event) =>
                                setSettings((current) => ({
                                  ...current,
                                  package_code: event.target.value,
                                }))
                              }
                            >
                              {PACKAGES.map((pack) => (
                                <option key={pack.code} value={pack.code}>
                                  {pack.code}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="settings-seats">
                              Seat limit
                            </label>
                            <input
                              id="settings-seats"
                              type="number"
                              min={dashboard.summary.members || 1}
                              max="10000"
                              className="form-input"
                              value={settings.seat_limit}
                              onChange={(event) =>
                                setSettings((current) => ({
                                  ...current,
                                  seat_limit: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                          {savingSettings ? 'Saving...' : 'Save settings'}
                        </button>
                      </form>
                    </div>

                    <article className="card institution__members">
                      <header>
                        <h2>
                          <Users size={17} /> Students and staff
                        </h2>
                        <span>{dashboard.members.length} people</span>
                      </header>
                      <div className="institution__table-wrap">
                        <table className="institution__table">
                          <thead>
                            <tr>
                              <th>Member</th>
                              <th>Role</th>
                              <th>Readiness</th>
                              <th>Roadmap</th>
                              <th>Skills</th>
                              <th>Joined</th>
                              <th aria-label="Actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {dashboard.members.map((member) => (
                              <tr key={member.id}>
                                <td>
                                  <strong>{member.name}</strong>
                                  <small>{member.email}</small>
                                </td>
                                <td>
                                  <select
                                    className="form-select institution__role"
                                    value={member.role}
                                    onChange={(event) =>
                                      handleMemberRole(member.id, event.target.value)
                                    }
                                    aria-label={`Role for ${member.name}`}
                                  >
                                    <option value="member">Student</option>
                                    <option value="admin">Co-admin</option>
                                  </select>
                                </td>
                                <td>
                                  {member.readiness_score != null
                                    ? `${member.readiness_score}/100`
                                    : '-'}
                                </td>
                                <td>{member.roadmap_progress_percent}%</td>
                                <td>{member.skill_count}</td>
                                <td>{formatDate(member.joined_at)}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleRemoveMember(member.id, member.name)}
                                    aria-label={`Remove ${member.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                    </>
                  ) : (
                    <article className="card institution__empty">
                      <Building2 size={34} />
                      <h2>
                        {selected.status === 'pending'
                          ? 'Awaiting platform approval'
                          : 'Institution suspended'}
                      </h2>
                      <p>
                        {selected.status === 'pending'
                          ? 'A platform administrator must approve this institution before you can add students or assign plan access.'
                          : 'This institution is suspended. Contact SkillBridge AI support to restore access.'}
                      </p>
                    </article>
                  )
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Institution;
