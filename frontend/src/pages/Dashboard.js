import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  FolderKanban,
  Gauge,
  Map,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { dashboardApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRelative, titleCase } from '../utils/format';
import PageHeader from '../components/PageHeader';
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
  const stats = [
    {
      label: 'Skills',
      value: employability?.skills?.total ?? 0,
      hint: `${employability?.skills?.by_level?.advanced ?? 0} advanced`,
      icon: Sparkles,
      to: '/skills',
    },
    {
      label: 'Roadmap progress',
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
      label: 'Active applications',
      value: employability?.applications?.active ?? 0,
      hint: `${employability?.applications?.total ?? 0} tracked`,
      icon: BriefcaseBusiness,
      to: '/applications',
    },
    {
      label: 'Mock interviews',
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
      <PageHeader
        eyebrow="Your workspace"
        icon={Gauge}
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="A single view of your readiness, milestones, opportunities, and next best actions."
        actions={
          <>
            <Link to="/career" className="btn btn-primary">
              <Sparkles size={16} /> Get career guidance
            </Link>
            <Link to="/notifications" className="btn btn-outline">
              <Bell size={16} /> Notifications
            </Link>
          </>
        }
      />

      <section className="section section--soft">
        <div className="container">
          {loading && <div className="spinner" role="status" aria-label="Loading dashboard" />}

          {!loading && error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && dashboard && (
            <>
              <div className="dashboard__top">
                <article className="card dashboard__readiness">
                  <div>
                    <span className="dashboard__eyebrow">
                      <TrendingUp size={15} /> Employability readiness
                    </span>
                    <h2>{employability?.readiness_label}</h2>
                    <p>
                      Based on your profile, skills, roadmap progress, projects,
                      applications, and interview practice.
                    </p>

                    {dashboard.active_goal && (
                      <div className="dashboard__goal">
                        <Target size={16} />
                        <span>
                          Active goal: <strong>{dashboard.active_goal.career_title}</strong>
                        </span>
                      </div>
                    )}

                    <div className="dashboard__suggestions">
                      {(employability?.suggestions || []).map((suggestion) => (
                        <p key={suggestion}>
                          <CheckCircle2 size={15} /> {suggestion}
                        </p>
                      ))}
                    </div>
                  </div>

                  <ReadinessRing score={employability?.readiness_score} />
                </article>

                <div className="dashboard__breakdown card">
                  <h3>Score breakdown</h3>
                  {(employability?.breakdown || []).map((item) => (
                    <div className="dashboard__breakdown-row" key={item.area}>
                      <div>
                        <span>{item.area}</span>
                        <small>{item.value}</small>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.round((item.score / item.max) * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>
                        {item.score}/{item.max}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard__stats">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Link to={stat.to} className="card dashboard__stat" key={stat.label}>
                      <span className="dashboard__stat-icon">
                        <Icon size={20} />
                      </span>
                      <span>
                        <small>{stat.label}</small>
                        <strong>{stat.value}</strong>
                        <em>{stat.hint}</em>
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="dashboard__grid">
                <article className="card dashboard__panel">
                  <header>
                    <h3>Upcoming milestones</h3>
                    <Link to="/roadmaps">
                      All roadmaps <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.upcoming_milestones?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.upcoming_milestones.map((task) => (
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
                      No active milestones yet.{' '}
                      <Link to="/roadmaps">Create a roadmap</Link> to get started.
                    </p>
                  )}
                </article>

                <article className="card dashboard__panel">
                  <header>
                    <h3>Recent activity</h3>
                  </header>

                  {dashboard.recent_activities?.length ? (
                    <ul className="dashboard__activity">
                      {dashboard.recent_activities.map((item, index) => (
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
                    <h3>Recommended opportunities</h3>
                    <Link to="/opportunities">
                      Browse <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.recommended_opportunities?.length ? (
                    <ul className="dashboard__list">
                      {dashboard.recommended_opportunities.map((item) => (
                        <li key={item.id}>
                          <span className="dashboard__opp-icon">
                            <BriefcaseBusiness size={17} />
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
                    <h3>Latest notifications</h3>
                    <Link to="/notifications">
                      View all <ArrowRight size={14} />
                    </Link>
                  </header>

                  {dashboard.notifications?.latest?.length ? (
                    <ul className="dashboard__notifications">
                      {dashboard.notifications.latest.map((item) => (
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

              {(dashboard.career_recommendations ||
                dashboard.project_recommendations) && (
                <div className="dashboard__insights">
                  {dashboard.career_recommendations?.recommendations?.length > 0 && (
                    <article className="card dashboard__panel">
                      <header>
                        <h3>Career paths for you</h3>
                        <Link to="/career">
                          Explore <ArrowRight size={14} />
                        </Link>
                      </header>
                      <ul className="dashboard__list">
                        {dashboard.career_recommendations.recommendations
                          .slice(0, 3)
                          .map((item) => (
                            <li key={item.title}>
                              <span className="dashboard__score">{item.fit_score ?? '-'}</span>
                              <div>
                                <strong>{item.title}</strong>
                                <small>{item.why}</small>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </article>
                  )}

                  {dashboard.project_recommendations?.projects?.length > 0 && (
                    <article className="card dashboard__panel">
                      <header>
                        <h3>Project ideas for you</h3>
                        <Link to="/projects">
                          Build <ArrowRight size={14} />
                        </Link>
                      </header>
                      <ul className="dashboard__list">
                        {dashboard.project_recommendations.projects
                          .slice(0, 3)
                          .map((item) => (
                            <li key={item.title}>
                              <span className="dashboard__opp-icon">
                                <FolderKanban size={17} />
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
                    </article>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
