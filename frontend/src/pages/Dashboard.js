import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Compass,
  FolderKanban,
  Map,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { dashboardApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRelative, titleCase } from '../utils/format';
import './Dashboard.css';

function ReadinessRing({ score }) {
  const safe = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div
      className="readiness-ring"
      style={{ '--value': `${safe}%` }}
      role="img"
      aria-label={`Employability readiness ${safe} out of 100`}
    >
      <span>{safe}</span>
      <small>/100</small>
    </div>
  );
}

function SectionHeading({ title, to, linkLabel }) {
  return (
    <div className="dashboard__section-head">
      <h2>{title}</h2>
      {to && (
        <Link to={to}>
          {linkLabel || 'View all'} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    dashboardApi
      .get()
      .then((response) => {
        if (active) setDashboard(response.data.dashboard);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load your dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const employability = dashboard?.employability;
  const firstName = user?.name ? user.name.split(' ')[0] : '';
  const suggestions = (employability?.suggestions || []).slice(0, 3);

  const stats = [
    {
      label: 'Skills',
      value: employability?.skills?.total ?? 0,
      hint: `${employability?.skills?.by_level?.advanced ?? 0} advanced`,
      icon: Sparkles,
      to: '/skills',
    },
    {
      label: 'Roadmap',
      value: `${employability?.roadmaps?.progress_percent ?? 0}%`,
      hint: `${employability?.roadmaps?.completed_tasks ?? 0}/${employability?.roadmaps?.total_tasks ?? 0} tasks`,
      icon: Map,
      to: '/roadmaps',
    },
    {
      label: 'Projects',
      value: employability?.projects?.total ?? 0,
      hint: `${employability?.projects?.by_status?.completed ?? 0} completed`,
      icon: FolderKanban,
      to: '/projects',
    },
    {
      label: 'Applications',
      value: employability?.applications?.active ?? 0,
      hint: `${employability?.applications?.total ?? 0} tracked`,
      icon: BriefcaseBusiness,
      to: '/applications',
    },
    {
      label: 'Interviews',
      value: employability?.interviews?.completed ?? 0,
      hint:
        employability?.interviews?.average_score != null
          ? `${employability.interviews.average_score} avg score`
          : 'Not started',
      icon: MessageCircle,
      to: '/career-studio',
    },
  ];

  return (
    <div className="dashboard">
      <section className="dashboard__welcome">
        <div className="container dashboard__welcome-inner">
          <div className="dashboard__welcome-text">
            <span className="dashboard__eyebrow">Dashboard</span>
            <h1>Welcome back{firstName ? `, ${firstName}` : ''}</h1>
            <p>Here is where you stand and what to focus on next.</p>
          </div>

          <div className="dashboard__welcome-actions">
            <Link to="/career" className="btn btn-primary">
              <Sparkles size={16} /> Get guidance
            </Link>
            <Link to="/notifications" className="btn btn-outline">
              <Bell size={16} /> Notifications
            </Link>
          </div>
        </div>
      </section>

      <div className="container dashboard__content">
        {loading && (
          <div className="dashboard__loading">
            <div className="spinner" role="status" aria-label="Loading dashboard" />
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && dashboard && (
          <>
            <section className="card dashboard__hero">
              <div className="dashboard__hero-main">
                <div className="dashboard__hero-copy">
                  <span className="dashboard__eyebrow">
                    <TrendingUp size={15} /> Employability readiness
                  </span>
                  <h2>{employability?.readiness_label || 'Getting started'}</h2>
                  <p>Your progress across skills, roadmaps, projects, and practice.</p>

                  {dashboard.active_goal && (
                    <span className="dashboard__goal">
                      <Target size={15} />
                      {dashboard.active_goal.career_title}
                    </span>
                  )}
                </div>

                <ReadinessRing score={employability?.readiness_score} />
              </div>

              <div className="dashboard__breakdown">
                <h3>Score breakdown</h3>
                {(employability?.breakdown || []).map((item) => (
                  <div className="dashboard__breakdown-row" key={item.area}>
                    <span>{item.area}</span>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${
                            item.max ? Math.round((item.score / item.max) * 100) : 0
                          }%`,
                        }}
                      />
                    </div>
                    <strong>
                      {item.score}/{item.max}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <div className="dashboard__stats">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Link to={stat.to} className="card dashboard__stat" key={stat.label}>
                    <span className="dashboard__stat-icon">
                      <Icon size={18} />
                    </span>
                    <span className="dashboard__stat-body">
                      <small>{stat.label}</small>
                      <strong>{stat.value}</strong>
                      <em>{stat.hint}</em>
                    </span>
                  </Link>
                );
              })}
            </div>

            {suggestions.length > 0 && (
              <section className="card dashboard__focus">
                <header>
                  <div>
                    <span className="dashboard__eyebrow">Next steps</span>
                    <h2>What to do now</h2>
                  </div>
                  <Link to="/career">
                    Explore <ArrowRight size={14} />
                  </Link>
                </header>

                <ul className="dashboard__steps">
                  {suggestions.map((suggestion, index) => (
                    <li key={suggestion}>
                      <span className="dashboard__step-number">{index + 1}</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="dashboard__section">
              <SectionHeading
                title="Recommended for you"
                to="/opportunities"
                linkLabel="Browse opportunities"
              />

              <div className="dashboard__columns">
                <article className="card dashboard__panel">
                  <header>
                    <h3>Opportunities</h3>
                    <Link to="/opportunities">
                      Browse <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.recommended_opportunities?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.recommended_opportunities.slice(0, 3).map((item) => (
                        <li key={item.id}>
                          <span className="dashboard__item-icon">
                            <BriefcaseBusiness size={16} />
                          </span>
                          <div>
                            <strong>{item.title}</strong>
                            <small>
                              {item.organisation || 'Organisation not listed'}
                              {item.application_deadline
                                ? ` · due ${formatDate(item.application_deadline)}`
                                : ''}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state">
                      Add more skills to unlock matched opportunities.
                    </p>
                  )}
                </article>

                <article className="card dashboard__panel">
                  <header>
                    <h3>Career paths</h3>
                    <Link to="/career">
                      Explore <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.career_recommendations?.recommendations?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.career_recommendations.recommendations
                        .slice(0, 3)
                        .map((item) => (
                          <li key={item.title}>
                            <span className="dashboard__item-icon dashboard__item-icon--score">
                              {item.fit_score ?? '-'}
                            </span>
                            <div>
                              <strong>{item.title}</strong>
                              <small>{item.why}</small>
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="empty-state">
                      <Link to="/goals">Set a career goal</Link> to see matched paths.
                    </p>
                  )}
                </article>

                <article className="card dashboard__panel">
                  <header>
                    <h3>Project ideas</h3>
                    <Link to="/projects">
                      Build <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.project_recommendations?.projects?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.project_recommendations.projects
                        .slice(0, 3)
                        .map((item) => (
                          <li key={item.title}>
                            <span className="dashboard__item-icon">
                              <FolderKanban size={16} />
                            </span>
                            <div>
                              <strong>{item.title}</strong>
                              <small>
                                {titleCase(item.difficulty)}
                                {item.estimated_hours
                                  ? ` · ~${item.estimated_hours}h`
                                  : ''}
                              </small>
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="empty-state">
                      <Link to="/skills">Add skills</Link> to get project ideas.
                    </p>
                  )}
                </article>
              </div>
            </section>

            <section className="dashboard__section">
              <SectionHeading title="Stay on track" />

              <div className="dashboard__columns">
                <article className="card dashboard__panel">
                  <header>
                    <h3>Upcoming milestones</h3>
                    <Link to="/roadmaps">
                      All <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.upcoming_milestones?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.upcoming_milestones.slice(0, 3).map((task) => (
                        <li key={task.id}>
                          <span className={`status-badge status-badge--${task.status}`}>
                            {titleCase(task.status)}
                          </span>
                          <div>
                            <strong>{task.title}</strong>
                            <small>
                              {task.roadmap_title}
                              {task.estimated_duration
                                ? ` · ${task.estimated_duration}`
                                : ''}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state">
                      No milestones yet.{' '}
                      <Link to="/roadmaps">Create a roadmap</Link>.
                    </p>
                  )}
                </article>

                <article className="card dashboard__panel">
                  <header>
                    <h3>Recent activity</h3>
                  </header>

                  {dashboard.recent_activities?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.recent_activities.slice(0, 3).map((item, index) => (
                        <li key={`${item.kind}-${item.happened_at}-${index}`}>
                          <span className="dashboard__dot" />
                          <div>
                            <strong>{item.title}</strong>
                            <small>
                              {titleCase(item.kind)} · {titleCase(item.detail)}
                            </small>
                          </div>
                          <time dateTime={item.happened_at}>
                            {formatRelative(item.happened_at)}
                          </time>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state">Your activity will appear here.</p>
                  )}
                </article>

                <article className="card dashboard__panel">
                  <header>
                    <h3>Notifications</h3>
                    <Link to="/notifications">
                      All <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.notifications?.latest?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.notifications.latest.slice(0, 3).map((item) => (
                        <li key={item.id} className={item.is_read ? '' : 'is-unread'}>
                          <span className="dashboard__dot" />
                          <div>
                            <strong>{item.title}</strong>
                            {item.body && <small>{item.body}</small>}
                          </div>
                          <time dateTime={item.created_at}>
                            {formatRelative(item.created_at)}
                          </time>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state">You are all caught up.</p>
                  )}
                </article>
              </div>
            </section>

            <section className="card dashboard__explore">
              <div>
                <span className="dashboard__eyebrow">
                  <Compass size={15} /> Keep growing
                </span>
                <h2>Ready for your next move?</h2>
                <p>Explore roles, build a project, or practise an interview.</p>
              </div>
              <div className="dashboard__explore-actions">
                <Link to="/career" className="btn btn-primary">
                  Explore careers
                </Link>
                <Link to="/career-studio" className="btn btn-outline">
                  Practise interview
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
