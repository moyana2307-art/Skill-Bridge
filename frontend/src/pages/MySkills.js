import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { metaApi, skillsApi, userSkillsApi } from '../api/client';
import './MySkills.css';

const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const PAGE_SIZE = 8;

function formatLabel(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

// The logged-in user's skills page. The top panel shows the skills already on
// the profile; the catalogue panel lets the user add more from the shared,
// admin-managed list.
function MySkills() {
  const [mySkills, setMySkills] = useState([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myError, setMyError] = useState('');

  const [categories, setCategories] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [catalogueMeta, setCatalogueMeta] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    page: 1,
  });
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMySkills = useCallback(async () => {
    setMyLoading(true);
    setMyError('');

    try {
      const response = await userSkillsApi.list();
      setMySkills(response.data.skills || []);
    } catch (err) {
      setMyError(err.message || 'Unable to load your skills.');
    } finally {
      setMyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMySkills();
  }, [loadMySkills]);

  useEffect(() => {
    let active = true;

    metaApi
      .get()
      .then((response) => {
        if (active) setCategories(response.data.skill_categories || []);
      })
      .catch(() => {
        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, []);

  // Wait briefly after typing so we do not send a request on every keystroke.
  useEffect(() => {
    let active = true;
    setCatalogueLoading(true);
    setCatalogueError('');

    const timer = setTimeout(() => {
      skillsApi
        .list({ ...filters, limit: PAGE_SIZE })
        .then((response) => {
          if (!active) return;
          setCatalogue(response.data || []);
          setCatalogueMeta(
            response.meta || { page: 1, total: 0, totalPages: 0 }
          );
        })
        .catch((err) => {
          if (!active) return;
          setCatalogue([]);
          setCatalogueMeta({ page: 1, total: 0, totalPages: 0 });
          setCatalogueError(err.message || 'Unable to load the catalogue.');
        })
        .finally(() => {
          if (active) setCatalogueLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, refreshKey]);

  const mySkillMap = useMemo(
    () => new Map(mySkills.map((skill) => [skill.skill_id, skill])),
    [mySkills]
  );

  const counts = useMemo(() => {
    const totals = {
      total: mySkills.length,
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };

    mySkills.forEach((skill) => {
      if (totals[skill.proficiency] !== undefined) {
        totals[skill.proficiency] += 1;
      }
    });

    return totals;
  }, [mySkills]);

  const isBusy = busyId !== null;

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
    setActionError('');
    setSuccess('');
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', page: 1 });
    setActionError('');
    setSuccess('');
  };

  const goToPage = (page) => {
    setFilters((current) => ({ ...current, page }));
    setActionError('');
    setSuccess('');
  };

  const handleDraftChange = (skillId, value) => {
    setDrafts((current) => ({ ...current, [skillId]: value }));
  };

  const handleAdd = async (skill) => {
    const proficiency = drafts[skill.id] || 'beginner';
    setBusyId(skill.id);
    setActionError('');
    setSuccess('');

    try {
      const response = await userSkillsApi.add({
        skill_id: skill.id,
        proficiency,
      });
      const added = response.data.skill;

      setMySkills((current) =>
        [...current.filter((item) => item.skill_id !== added.skill_id), added].sort(
          (a, b) => a.name.localeCompare(b.name)
        )
      );
      setSuccess(`${added.name} added to your skills.`);
    } catch (err) {
      setActionError(err.message || 'Unable to add that skill.');
    } finally {
      setBusyId(null);
    }
  };

  const handleProficiencyChange = async (skill, proficiency) => {
    setBusyId(skill.skill_id);
    setActionError('');
    setSuccess('');

    try {
      const response = await userSkillsApi.update(skill.skill_id, {
        proficiency,
      });

      setMySkills((current) =>
        current.map((item) =>
          item.skill_id === skill.skill_id ? response.data.skill : item
        )
      );
      setSuccess(`${skill.name} proficiency updated.`);
    } catch (err) {
      setActionError(err.message || 'Unable to update that skill.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (skill) => {
    if (!window.confirm(`Remove ${skill.name} from your skills?`)) return;

    setBusyId(skill.skill_id);
    setActionError('');
    setSuccess('');

    try {
      await userSkillsApi.remove(skill.skill_id);
      setMySkills((current) =>
        current.filter((item) => item.skill_id !== skill.skill_id)
      );
      setSuccess(`${skill.name} removed from your skills.`);
    } catch (err) {
      setActionError(err.message || 'Unable to remove that skill.');
    } finally {
      setBusyId(null);
    }
  };

  const stats = [
    { label: 'Total', value: counts.total },
    { label: 'Beginner', value: counts.beginner },
    { label: 'Intermediate', value: counts.intermediate },
    { label: 'Advanced', value: counts.advanced },
  ];

  return (
    <div className="my-skills">
      <section className="my-skills__hero">
        <div className="container">
          <span className="badge">Skills profile</span>
          <h1>Your skills</h1>
          <p className="my-skills__intro">
            Add the skills you already have and mark your confidence in each
            one. Career guidance and opportunity matching use this list later.
          </p>

          <div className="my-skills__stats" aria-label="Skill totals">
            {stats.map((stat) => (
              <div className="my-skills__stat" key={stat.label}>
                <strong>{myLoading ? '-' : stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
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

          <div className="my-skills__layout">
            <aside className="card my-skills__mine">
              <div className="my-skills__panel-head">
                <div>
                  <h2>My skills</h2>
                  <p>Change a level or remove a skill at any time.</p>
                </div>
                <span className="badge">{counts.total}</span>
              </div>

              {myLoading && (
                <div
                  className="spinner"
                  role="status"
                  aria-label="Loading your skills"
                />
              )}

              {!myLoading && myError && (
                <>
                  <div className="alert alert-error" role="alert">
                    {myError}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={loadMySkills}
                  >
                    Try again
                  </button>
                </>
              )}

              {!myLoading && !myError && mySkills.length === 0 && (
                <div className="my-skills__empty">
                  <Award size={30} />
                  <p>You have not added any skills yet.</p>
                  <span>Choose skills from the catalogue to get started.</span>
                </div>
              )}

              {!myLoading && !myError && mySkills.length > 0 && (
                <ul className="my-skills__list">
                  {mySkills.map((skill) => (
                    <li
                      className={`my-skills__row ${
                        busyId === skill.skill_id ? 'my-skills__row--busy' : ''
                      }`}
                      key={skill.skill_id}
                    >
                      <div className="my-skills__row-info">
                        <strong>{skill.name}</strong>
                        <span>{skill.category || 'Uncategorised'}</span>
                      </div>

                      <select
                        className="form-select my-skills__select"
                        value={skill.proficiency}
                        onChange={(event) =>
                          handleProficiencyChange(skill, event.target.value)
                        }
                        disabled={isBusy}
                        aria-label={`Proficiency for ${skill.name}`}
                      >
                        {PROFICIENCY_LEVELS.map((level) => (
                          <option value={level} key={level}>
                            {formatLabel(level)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="my-skills__remove"
                        onClick={() => handleRemove(skill)}
                        disabled={isBusy}
                        aria-label={`Remove ${skill.name} from your skills`}
                        title="Remove skill"
                      >
                        <Trash2 size={17} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div className="card my-skills__catalogue">
              <div className="my-skills__panel-head">
                <div>
                  <h2>Skill catalogue</h2>
                  <p>
                    {catalogueLoading
                      ? 'Loading skills...'
                      : `${catalogueMeta.total} matching skills available.`}
                  </p>
                </div>
                <Layers size={22} className="my-skills__panel-icon" />
              </div>

              <div className="my-skills__filters">
                <div className="my-skills__search">
                  <Search size={18} />
                  <input
                    id="skill-search"
                    name="search"
                    type="search"
                    className="form-input"
                    placeholder="Search by skill or category"
                    value={filters.search}
                    onChange={updateFilter}
                    aria-label="Search skills"
                  />
                </div>

                <select
                  name="category"
                  className="form-select"
                  value={filters.category}
                  onChange={updateFilter}
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {(filters.search || filters.category) && (
                <button
                  type="button"
                  className="my-skills__clear"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}

              {catalogueLoading && (
                <div
                  className="spinner"
                  role="status"
                  aria-label="Loading the skill catalogue"
                />
              )}

              {!catalogueLoading && catalogueError && (
                <>
                  <div className="alert alert-error" role="alert">
                    {catalogueError}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setRefreshKey((current) => current + 1)}
                  >
                    Try again
                  </button>
                </>
              )}

              {!catalogueLoading &&
                !catalogueError &&
                catalogue.length === 0 && (
                  <div className="my-skills__empty">
                    <Layers size={30} />
                    <p>No skills match those filters.</p>
                    <span>Try a different search or category.</span>
                  </div>
                )}

              {!catalogueLoading &&
                !catalogueError &&
                catalogue.length > 0 && (
                  <>
                    <div className="my-skills__grid">
                      {catalogue.map((skill) => {
                        const added = mySkillMap.get(skill.id);

                        return (
                          <article
                            className="my-skills__catalogue-item"
                            key={skill.id}
                          >
                            <div className="my-skills__card-top">
                              <div>
                                <h3>{skill.name}</h3>
                                <p>{skill.category || 'Uncategorised'}</p>
                              </div>
                              {added && (
                                <span
                                  className={`badge my-skills__badge my-skills__badge--${added.proficiency}`}
                                >
                                  {formatLabel(added.proficiency)}
                                </span>
                              )}
                            </div>

                            {added ? (
                              <p className="my-skills__added">
                                In your skills. Change the level on the left.
                              </p>
                            ) : (
                              <div className="my-skills__item-actions">
                                <select
                                  className="form-select my-skills__select"
                                  value={drafts[skill.id] || 'beginner'}
                                  onChange={(event) =>
                                    handleDraftChange(
                                      skill.id,
                                      event.target.value
                                    )
                                  }
                                  disabled={isBusy}
                                  aria-label={`Proficiency for ${skill.name}`}
                                >
                                  {PROFICIENCY_LEVELS.map((level) => (
                                    <option value={level} key={level}>
                                      {formatLabel(level)}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm my-skills__add"
                                  onClick={() => handleAdd(skill)}
                                  disabled={isBusy}
                                  aria-label={`Add ${skill.name} to your skills`}
                                >
                                  <Plus size={16} />
                                  {busyId === skill.id ? 'Adding...' : 'Add'}
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>

                    {catalogueMeta.totalPages > 1 && (
                      <div className="my-skills__pagination">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm my-skills__page-btn"
                          onClick={() => goToPage(filters.page - 1)}
                          disabled={filters.page <= 1 || catalogueLoading}
                        >
                          <ChevronLeft size={16} /> Previous
                        </button>

                        <span>
                          Page {catalogueMeta.page} of{' '}
                          {catalogueMeta.totalPages}
                        </span>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm my-skills__page-btn"
                          onClick={() => goToPage(filters.page + 1)}
                          disabled={
                            filters.page >= catalogueMeta.totalPages ||
                            catalogueLoading
                          }
                        >
                          Next <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MySkills;
