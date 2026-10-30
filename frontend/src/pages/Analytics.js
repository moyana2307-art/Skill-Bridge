import { useEffect, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  FolderKanban,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { analyticsApi } from '../api/client';
import { formatDate } from '../utils/format';
import PageHeader from '../components/PageHeader';
import UpgradePrompt from '../components/UpgradePrompt';
import './Analytics.css';

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsApi
      .employability()
      .then((response) => setAnalytics(response.data.analytics))
      .catch((err) => setError(err.message || 'Unable to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const trend = analytics?.trend || [];
  const trendMax = Math.max(100, ...trend.map((item) => item.readiness_score || 0));

  const detailCards = [
    {
      title: 'Skills',
      icon: Sparkles,
      value: analytics?.skills?.total ?? 0,
      rows: [
        ['Beginner', analytics?.skills?.by_level?.beginner ?? 0],
        ['Intermediate', analytics?.skills?.by_level?.intermediate ?? 0],
        ['Advanced', analytics?.skills?.by_level?.advanced ?? 0],
      ],
    },
    {
      title: 'Roadmaps',
      icon: TrendingUp,
      value: `${analytics?.roadmaps?.progress_percent ?? 0}%`,
      rows: [
        ['Roadmaps', analytics?.roadmaps?.total ?? 0],
        ['Tasks done', analytics?.roadmaps?.completed_tasks ?? 0],
        ['Tasks total', analytics?.roadmaps?.total_tasks ?? 0],
      ],
    },
    {
      title: 'Projects',
      icon: FolderKanban,
      value: analytics?.projects?.total ?? 0,
      rows: [
        ['Completed', analytics?.projects?.by_status?.completed ?? 0],
        ['In progress', analytics?.projects?.by_status?.in_progress ?? 0],
        [
          'Average score',
          analytics?.projects?.average_score != null
            ? `${analytics.projects.average_score}/100`
            : '—',
        ],
      ],
    },
    {
      title: 'Applications',
      icon: BriefcaseBusiness,
      value: analytics?.applications?.total ?? 0,
      rows: [
        ['Active', analytics?.applications?.active ?? 0],
        ['Offers', analytics?.applications?.offers ?? 0],
        [
          'Interviewing',
          analytics?.applications?.by_status?.interviewing ?? 0,
        ],
      ],
    },
    {
      title: 'Mock interviews',
      icon: MessageSquare,
      value: analytics?.interviews?.completed ?? 0,
      rows: [
        ['Started', analytics?.interviews?.total ?? 0],
        ['Completed', analytics?.interviews?.completed ?? 0],
        [
          'Average score',
          analytics?.interviews?.average_score != null
            ? `${analytics.interviews.average_score}/100`
            : '—',
        ],
      ],
    },
  ];

  return (
    <div className="analytics">
      <PageHeader
        eyebrow="Employability analytics"
        icon={BarChart3}
        title="See what is moving your readiness"
        description="A transparent score built from your real profile, skills, roadmaps, projects, applications, and interviews."
      />

      <section className="section section--soft">
        <div className="container">
          <UpgradePrompt feature="advanced_analytics" />
          {loading && <div className="spinner" role="status" aria-label="Loading analytics" />}
          {error && <div className="alert alert-error">{error}</div>}

          {!loading && analytics && (
            <>
              <div className="analytics__top">
                <article className="card analytics__score">
                  <span className="analytics__eyebrow">Readiness score</span>
                  <div className="analytics__score-value">
                    {analytics.readiness_score}
                    <small>/100</small>
                  </div>
                  <p className="analytics__label">{analytics.readiness_label}</p>
                  <div className="progress-track analytics__bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${analytics.readiness_score}%` }}
                    />
                  </div>
                  {analytics.skills_gap_readiness != null && (
                    <p className="analytics__muted">
                      Latest skills-gap readiness: {analytics.skills_gap_readiness}/100
                    </p>
                  )}
                </article>

                <article className="card analytics__trend">
                  <header>
                    <h2>Last 14 days</h2>
                    <span>{trend.length} snapshots</span>
                  </header>

                  {trend.length ? (
                    <div className="analytics__chart">
                      {trend.map((item) => (
                        <div className="analytics__bar-wrap" key={item.date}>
                          <div
                            className="analytics__trend-bar"
                            style={{
                              height: `${Math.max(
                                6,
                                (item.readiness_score / trendMax) * 100
                              )}%`,
                            }}
                            title={`${formatDate(item.date)}: ${item.readiness_score}/100`}
                          />
                          <span>{formatDate(item.date, { month: 'numeric', day: 'numeric' })}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">Your trend will build as you use the platform.</p>
                  )}
                </article>
              </div>

              <div className="analytics__breakdown card">
                <h2>Score breakdown</h2>
                {analytics.breakdown?.map((item) => (
                  <div className="analytics__breakdown-row" key={item.area}>
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

              <div className="analytics__details">
                {detailCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article className="card analytics__detail" key={card.title}>
                      <header>
                        <span>
                          <Icon size={17} /> {card.title}
                        </span>
                        <strong>{card.value}</strong>
                      </header>
                      <ul>
                        {card.rows.map(([label, value]) => (
                          <li key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>

              {analytics.suggestions?.length > 0 && (
                <article className="card analytics__suggestions">
                  <h2>Next best actions</h2>
                  <ul>
                    {analytics.suggestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Analytics;
