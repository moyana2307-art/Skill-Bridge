import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  GraduationCap,
  Laptop,
  MapPin,
  Search,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import { aiApi, opportunitiesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatGrid from '../components/StatGrid';
import './Opportunities.css';

const PAGE_SIZE = 12;

const TYPE_META = {
  job: { label: 'Job', Icon: Briefcase },
  internship: { label: 'Internship', Icon: GraduationCap },
  scholarship: { label: 'Scholarship', Icon: Award },
  training: { label: 'Training', Icon: BookOpen },
  course: { label: 'Course', Icon: Laptop },
};

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'job', label: 'Jobs' },
  { value: 'internship', label: 'Internships' },
  { value: 'scholarship', label: 'Scholarships' },
  { value: 'training', label: 'Training' },
  { value: 'course', label: 'Courses' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'deadline', label: 'Deadline first' },
  { value: 'title', label: 'Title A-Z' },
];

const INITIAL_FILTERS = {
  search: '',
  type: '',
  location: '',
  is_remote: false,
  sort: 'newest',
  page: 1,
};

function formatLabel(value) {
  return value ? value.replace(/_/g, ' ') : '';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDeadline(value) {
  if (!value) return { label: 'No deadline listed', tone: '' };

  const deadline = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(deadline.getTime())) {
    return { label: 'No deadline listed', tone: '' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.round((deadline - today) / (24 * 60 * 60 * 1000));

  if (days < 0) {
    return { label: `Closed ${formatDate(value)}`, tone: 'expired' };
  }

  if (days === 0) return { label: 'Closes today', tone: 'soon' };
  if (days === 1) return { label: 'Closes tomorrow', tone: 'soon' };
  if (days <= 14) {
    return {
      label: `Closes in ${days} days`,
      tone: 'soon',
    };
  }

  return { label: `Apply by ${formatDate(value)}`, tone: '' };
}

function parseRequiredSkills(opportunity) {
  if (Array.isArray(opportunity.required_skills_list)) {
    return opportunity.required_skills_list;
  }

  if (!opportunity.required_skills) return [];

  const seen = new Set();

  return String(opportunity.required_skills)
    .split(/[,;|\n]+/)
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getSortParams(sort) {
  if (sort === 'deadline') return { sort, order: 'asc' };
  if (sort === 'title') return { sort, order: 'asc' };
  return { sort: 'newest', order: 'desc' };
}

function OpportunityCard({
  opportunity,
  saved,
  saving,
  onToggleSave,
  onInsight,
  insightLoading,
  user,
  matchView,
}) {
  const type = TYPE_META[opportunity.opportunity_type] || {
    label: formatLabel(opportunity.opportunity_type) || 'Opportunity',
    Icon: Briefcase,
  };
  const TypeIcon = type.Icon;
  const deadline = getDeadline(opportunity.application_deadline);
  const requiredSkills = parseRequiredSkills(opportunity);
  const matchedSkills = Array.isArray(opportunity.matched_skills)
    ? opportunity.matched_skills
    : [];
  const missingSkills = Array.isArray(opportunity.missing_skills)
    ? opportunity.missing_skills
    : [];
  const hasMatchScore = typeof opportunity.match_score === 'number';

  return (
    <article className="card opportunities__card">
      <div className="opportunities__card-top">
        <div className="opportunities__card-badges">
          <span
            className={`opportunities__type opportunities__type--${opportunity.opportunity_type}`}
          >
            <TypeIcon size={15} />
            {type.label}
          </span>
        </div>

        <div className="opportunities__card-actions">
          {hasMatchScore && (
            <span className="opportunities__match-badge">
              <Sparkles size={14} />
              {opportunity.match_score}% match
            </span>
          )}

          {user && (
            <button
              type="button"
              className={`opportunities__save ${
                saved ? 'opportunities__save--active' : ''
              }`}
              onClick={() => onToggleSave(opportunity, saved)}
              disabled={saving}
              aria-label={
                saved
                  ? `Remove ${opportunity.title} from saved opportunities`
                  : `Save ${opportunity.title}`
              }
              title={saved ? 'Remove from saved' : 'Save opportunity'}
            >
              {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          )}
        </div>
      </div>

      <h3>{opportunity.title}</h3>

      <p className="opportunities__organisation">
        <Building2 size={15} />
        {opportunity.organisation || 'Organisation not listed'}
      </p>

      {opportunity.description && (
        <p className="opportunities__description">{opportunity.description}</p>
      )}

      <div className="opportunities__meta">
        <span>
          {opportunity.is_remote ? <Wifi size={15} /> : <MapPin size={15} />}
          {opportunity.is_remote
            ? opportunity.location
              ? `Remote · ${opportunity.location}`
              : 'Remote'
            : opportunity.location || 'Location not listed'}
        </span>
        <span className={`opportunities__deadline opportunities__deadline--${deadline.tone}`}>
          <CalendarDays size={15} />
          {deadline.label}
        </span>
      </div>

      <div className="opportunities__skills">
        <span className="opportunities__skills-label">
          {matchView ? 'Your skill match' : 'Skills listed'}
        </span>

        {matchedSkills.length > 0 && (
          <div className="opportunities__chips">
            {matchedSkills.map((skill) => (
              <span
                className="opportunities__chip opportunities__chip--matched"
                key={`matched-${skill}`}
              >
                <Check size={12} /> {skill}
              </span>
            ))}
          </div>
        )}

        {matchView && missingSkills.length > 0 && (
          <div className="opportunities__chips">
            {missingSkills.map((skill) => (
              <span
                className="opportunities__chip opportunities__chip--missing"
                key={`missing-${skill}`}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {!matchView && requiredSkills.length > 0 && (
          <div className="opportunities__chips">
            {requiredSkills.map((skill) => (
              <span
                className="opportunities__chip opportunities__chip--neutral"
                key={`required-${skill}`}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {requiredSkills.length === 0 && (
          <p className="opportunities__skills-empty">
            No specific skills listed.
          </p>
        )}

        {matchView && requiredSkills.length > 0 && (
          <p className="opportunities__skills-summary">
            {matchedSkills.length} of {requiredSkills.length} listed skills
            matched.
          </p>
        )}
      </div>

      <div className="opportunities__footer">
        <span className="opportunities__source">
          {opportunity.source_name
            ? `Source: ${opportunity.source_name}`
            : 'SkillBridge AI listing'}
        </span>

        <div className="opportunities__footer-actions">
          {user && (
            <button
              type="button"
              className="opportunities__insight-btn"
              onClick={() => onInsight(opportunity)}
              disabled={insightLoading}
            >
              <Sparkles size={15} />
              {insightLoading ? 'Thinking...' : 'Why this fits'}
            </button>
          )}

          {opportunity.application_url ? (
            <a
              className="opportunities__apply"
              href={opportunity.application_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Apply via source for ${opportunity.title}`}
            >
              Apply via source <ExternalLink size={15} />
            </a>
          ) : (
            <span className="opportunities__apply opportunities__apply--muted">
              No application link
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function InsightList({ title, items }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!list.length) return null;

  return (
    <div className="opportunities__insight-section">
      <h4>{title}</h4>
      <ul>
        {list.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Opportunities() {
  const { user, loading: authLoading } = useAuth();

  const [tab, setTab] = useState('browse');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [items, setItems] = useState([]);
  const [listMeta, setListMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [saved, setSaved] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState('');
  const [savedRefresh, setSavedRefresh] = useState(0);

  const [savingId, setSavingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [insight, setInsight] = useState(null);
  const [insightLoadingId, setInsightLoadingId] = useState(null);

  useEffect(() => {
    if (!authLoading && !user && tab !== 'browse') {
      setTab('browse');
    }
  }, [authLoading, user, tab]);

  useEffect(() => {
    if (authLoading) return undefined;

    if (!user) {
      setSaved([]);
      setSavedError('');
      setSavedLoading(false);
      return undefined;
    }

    let active = true;
    setSavedLoading(true);
    setSavedError('');

    opportunitiesApi
      .saved()
      .then((response) => {
        if (active) setSaved(response.data || []);
      })
      .catch((err) => {
        if (active) {
          setSaved([]);
          setSavedError(err.message || 'Unable to load your saved opportunities.');
        }
      })
      .finally(() => {
        if (active) setSavedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user, savedRefresh]);

  useEffect(() => {
    if (tab === 'saved') return undefined;
    if (tab === 'matches' && (authLoading || !user)) return undefined;

    let active = true;
    setLoading(true);
    setListError('');

    const timer = setTimeout(() => {
      const params = {
        ...getSortParams(filters.sort),
        page: filters.page,
        limit: PAGE_SIZE,
        search: filters.search,
        type: filters.type,
        location: filters.location,
        is_remote: filters.is_remote ? true : undefined,
      };
      const request =
        tab === 'matches'
          ? opportunitiesApi.matches(params)
          : opportunitiesApi.list(params);

      request
        .then((response) => {
          if (!active) return;
          setItems(response.data || []);
          setListMeta(
            response.meta || {
              page: 1,
              limit: PAGE_SIZE,
              total: 0,
              totalPages: 0,
            }
          );
        })
        .catch((err) => {
          if (!active) return;
          setItems([]);
          setListMeta({
            page: 1,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          });
          setListError(
            err.message || 'Unable to load opportunities right now.'
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [authLoading, filters, refreshKey, tab, user]);

  const savedIds = useMemo(
    () => new Set(saved.map((opportunity) => Number(opportunity.id))),
    [saved]
  );

  const isSavedView = tab === 'saved';
  const displayed = isSavedView ? saved : items;
  const isLoading = isSavedView ? savedLoading : loading;
  const currentError = isSavedView ? savedError : listError;

  const topMatch = useMemo(() => {
    if (tab !== 'matches') return null;

    const scores = items
      .map((opportunity) => opportunity.match_score)
      .filter((score) => typeof score === 'number');

    return scores.length ? Math.max(...scores) : null;
  }, [items, tab]);

  const hasFilters =
    Boolean(filters.search) ||
    Boolean(filters.type) ||
    Boolean(filters.location) ||
    filters.is_remote ||
    filters.sort !== 'newest';

  const stats = [
    {
      label: isSavedView ? 'Shown' : 'Results',
      value: isLoading ? '-' : isSavedView ? saved.length : listMeta.total,
    },
    { label: 'Saved', value: saved.length },
    {
      label: 'Top match',
      value: tab === 'matches' && topMatch !== null ? `${topMatch}%` : '-',
    },
  ];

  const updateFilter = (event) => {
    const { name, value, type, checked } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      page: 1,
    }));
    setSuccess('');
    setActionError('');
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSuccess('');
    setActionError('');
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setFilters((current) => ({ ...current, page: 1 }));
    setSuccess('');
    setActionError('');
  };

  const goToPage = (page) => {
    setFilters((current) => ({ ...current, page }));
    setSuccess('');
    setActionError('');
  };

  const handleToggleSave = async (opportunity, currentlySaved) => {
    setSavingId(opportunity.id);
    setSuccess('');
    setActionError('');

    try {
      if (currentlySaved) {
        await opportunitiesApi.unsave(opportunity.id);
        setSaved((current) =>
          current.filter((item) => item.id !== opportunity.id)
        );
        setSuccess(`${opportunity.title} removed from saved opportunities.`);
      } else {
        const response = await opportunitiesApi.save(opportunity.id);
        const savedOpportunity = response.data.opportunity;

        setSaved((current) => [
          savedOpportunity,
          ...current.filter((item) => item.id !== savedOpportunity.id),
        ]);
        setSuccess(`${opportunity.title} saved.`);
      }
    } catch (err) {
      setActionError(err.message || 'Unable to update your saved opportunities.');
    } finally {
      setSavingId(null);
    }
  };

  const handleInsight = async (opportunity) => {
    setInsight(null);
    setInsightLoadingId(opportunity.id);
    setSuccess('');
    setActionError('');

    try {
      const response = await aiApi.opportunityInsight({
        opportunity_id: opportunity.id,
      });
      setInsight(response.data);
    } catch (err) {
      setActionError(
        err.message || 'Unable to generate an AI insight for this opportunity.'
      );
    } finally {
      setInsightLoadingId(null);
    }
  };

  const emptyTitle = isSavedView
    ? 'Nothing saved yet'
    : tab === 'matches'
    ? 'No matches yet'
    : 'No opportunities found';
  const emptyMessage = isSavedView
    ? 'Save opportunities that interest you and they will appear here.'
    : tab === 'matches'
    ? 'Add more skills to your profile or broaden your filters to see matches.'
    : 'Try a different search, location, or opportunity type.';

  return (
    <div className="opportunities">
      <PageHeader
        eyebrow="Opportunity matching"
        icon={Compass}
        title="Opportunities"
        description="Explore jobs, internships, scholarships, training, and courses. Sign in to see how your skills match and to save the ones worth pursuing."
      />

      <section className="section section--soft">
        <div className="container">
          <StatGrid ariaLabel="Opportunity totals" items={stats} />

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

          <div
            className="opportunities__tabs"
            role="tablist"
            aria-label="Opportunity views"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'browse'}
              className={`opportunities__tab ${
                tab === 'browse' ? 'opportunities__tab--active' : ''
              }`}
              onClick={() => switchTab('browse')}
            >
              <Compass size={17} /> Browse
            </button>

            {!authLoading && user && (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'matches'}
                  className={`opportunities__tab ${
                    tab === 'matches' ? 'opportunities__tab--active' : ''
                  }`}
                  onClick={() => switchTab('matches')}
                >
                  <Sparkles size={17} /> For you
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'saved'}
                  className={`opportunities__tab ${
                    tab === 'saved' ? 'opportunities__tab--active' : ''
                  }`}
                  onClick={() => switchTab('saved')}
                >
                  <Bookmark size={17} /> Saved
                  {saved.length > 0 && (
                    <span className="opportunities__tab-count">
                      {saved.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          {!authLoading && !user && (
            <div className="alert alert-info opportunities__auth-note">
              <span>
                <Link to="/login">Log in</Link> or{' '}
                <Link to="/register">create an account</Link> to see
                skill-based matches and save opportunities.
              </span>
            </div>
          )}

          {!isSavedView && (
            <form
              className="card opportunities__filters"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="opportunities__filter-grid">
                <div className="opportunities__search">
                  <Search size={18} />
                  <input
                    id="opportunity-search"
                    name="search"
                    type="search"
                    className="form-input"
                    placeholder="Search title, organisation, or description"
                    value={filters.search}
                    onChange={updateFilter}
                    aria-label="Search opportunities"
                  />
                </div>

                <select
                  name="type"
                  className="form-select"
                  value={filters.type}
                  onChange={updateFilter}
                  aria-label="Filter by opportunity type"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value || 'all'}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  name="location"
                  className="form-input"
                  placeholder="Location"
                  value={filters.location}
                  onChange={updateFilter}
                  aria-label="Filter by location"
                />

                <select
                  name="sort"
                  className="form-select"
                  value={filters.sort}
                  onChange={updateFilter}
                  aria-label="Sort opportunities"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label className="opportunities__remote">
                  <input
                    name="is_remote"
                    type="checkbox"
                    checked={filters.is_remote}
                    onChange={updateFilter}
                  />
                  <span>Remote only</span>
                </label>

                {hasFilters ? (
                  <button
                    type="button"
                    className="opportunities__clear"
                    onClick={clearFilters}
                  >
                    <X size={15} /> Clear filters
                  </button>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            </form>
          )}

          {isSavedView && (
            <p className="opportunities__saved-note">
              These are the opportunities you bookmarked. Remove one using the
              saved button on its card.
            </p>
          )}

          {isLoading && (
            <div
              className="spinner opportunities__spinner"
              role="status"
              aria-label={
                isSavedView
                  ? 'Loading saved opportunities'
                  : 'Loading opportunities'
              }
            />
          )}

          {!isLoading && currentError && (
            <div className="card opportunities__state">
              <div className="alert alert-error" role="alert">
                {currentError}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() =>
                  isSavedView
                    ? setSavedRefresh((current) => current + 1)
                    : setRefreshKey((current) => current + 1)
                }
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !currentError && displayed.length === 0 && (
            <div className="card opportunities__state">
              {isSavedView ? (
                <Bookmark size={32} />
              ) : tab === 'matches' ? (
                <Sparkles size={32} />
              ) : (
                <Compass size={32} />
              )}
              <h2>{emptyTitle}</h2>
              <p>{emptyMessage}</p>

              {isSavedView ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => switchTab('browse')}
                >
                  Browse opportunities
                </button>
              ) : hasFilters ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : tab === 'matches' ? (
                <Link className="btn btn-primary btn-sm" to="/skills">
                  Update your skills
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  Refresh
                </button>
              )}
            </div>
          )}

          {!isLoading && !currentError && displayed.length > 0 && (
            <>
              <div className="opportunities__grid">
                {displayed.map((opportunity) => (
                  <OpportunityCard
                    opportunity={opportunity}
                    saved={savedIds.has(Number(opportunity.id))}
                    saving={savingId === opportunity.id}
                    onToggleSave={handleToggleSave}
                    onInsight={handleInsight}
                    insightLoading={insightLoadingId === opportunity.id}
                    user={user}
                    matchView={
                      tab === 'matches' ||
                      Array.isArray(opportunity.matched_skills)
                    }
                    key={opportunity.id}
                  />
                ))}
              </div>

              {!isSavedView && listMeta.totalPages > 1 && (
                <div className="opportunities__pagination">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm opportunities__page-btn"
                    onClick={() => goToPage(filters.page - 1)}
                    disabled={filters.page <= 1 || loading}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <span>
                    Page {listMeta.page} of {listMeta.totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm opportunities__page-btn"
                    onClick={() => goToPage(filters.page + 1)}
                    disabled={
                      filters.page >= listMeta.totalPages || loading
                    }
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {insight && (
        <div
          className="opportunities__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="opportunity-insight-title"
          onClick={() => setInsight(null)}
        >
          <div
            className="card opportunities__modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="opportunities__modal-head">
              <div>
                <span className="badge">
                  <Sparkles size={14} /> AI insight
                </span>
                <h2 id="opportunity-insight-title">
                  {insight.opportunity.title}
                </h2>
                <p>{insight.opportunity.organisation}</p>
              </div>
              <button
                type="button"
                className="opportunities__modal-close"
                onClick={() => setInsight(null)}
                aria-label="Close AI insight"
              >
                <X size={20} />
              </button>
            </div>

            <div className="opportunities__insight-body">
              <span
                className={`opportunities__fit opportunities__fit--${insight.insight.fit_level}`}
              >
                {formatLabel(insight.insight.fit_level)} fit
              </span>
              <p>{insight.insight.summary}</p>

              <InsightList
                title="Your strengths for this role"
                items={insight.insight.strengths}
              />
              <InsightList
                title="Gaps to close"
                items={insight.insight.gaps}
              />
              <InsightList
                title="Application tips"
                items={insight.insight.application_tips}
              />
              <InsightList
                title="Questions to prepare"
                items={insight.insight.questions_to_prepare}
              />

              <div className="opportunities__modal-actions">
                {insight.opportunity.application_url && (
                  <a
                    className="btn btn-primary btn-sm"
                    href={insight.opportunity.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply via source <ExternalLink size={15} />
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setInsight(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Opportunities;
