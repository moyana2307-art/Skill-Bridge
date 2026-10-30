import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ExternalLink,
  FolderKanban,
  GraduationCap,
  MapPin,
  Sparkles,
  Target,
} from 'lucide-react';
import { portfolioApi } from '../api/client';
import { formatDate, titleCase } from '../utils/format';
import './PublicPortfolio.css';

function PublicPortfolio() {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    portfolioApi
      .getPublic(slug)
      .then((response) => {
        if (active) setPortfolio(response.data.portfolio);
      })
      .catch((err) => {
        if (active) setError(err.message || 'That portfolio is not available.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="spinner" role="status" aria-label="Loading portfolio" />
        </div>
      </section>
    );
  }

  if (error || !portfolio) {
    return (
      <section className="section">
        <div className="container">
          <div className="card public-portfolio__missing">
            <h1>Portfolio not available</h1>
            <p>{error || 'This portfolio is private or does not exist.'}</p>
            <Link to="/" className="btn btn-primary">
              Back to SkillBridge AI
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const skillsByCategory = (portfolio.skills || []).reduce((groups, skill) => {
    const category = skill.category || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(skill);
    return groups;
  }, {});

  return (
    <div className="public-portfolio">
      <section className="public-portfolio__hero">
        <div className="container public-portfolio__hero-inner">
          <div className="public-portfolio__avatar" aria-hidden="true">
            {portfolio.avatar ? (
              <img src={portfolio.avatar} alt="" />
            ) : (
              portfolio.name
                ?.split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
            )}
          </div>

          <div className="public-portfolio__intro">
            <span className="badge">
              <Sparkles size={14} /> SkillBridge AI portfolio
            </span>
            <h1>{portfolio.name}</h1>
            {portfolio.headline && <p className="public-portfolio__headline">{portfolio.headline}</p>}

            <div className="public-portfolio__meta">
              {portfolio.location && (
                <span>
                  <MapPin size={14} /> {portfolio.location}
                </span>
              )}
              {portfolio.education_level && (
                <span>
                  <GraduationCap size={14} /> {titleCase(portfolio.education_level)}
                </span>
              )}
              {portfolio.joined_at && <span>Joined {formatDate(portfolio.joined_at)}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container public-portfolio__layout">
          <div className="public-portfolio__main">
            {portfolio.about && (
              <article className="card">
                <h2>About</h2>
                <p className="public-portfolio__about">{portfolio.about}</p>
              </article>
            )}

            <article className="card">
              <h2>Projects</h2>
              {portfolio.projects?.length ? (
                <div className="public-portfolio__projects">
                  {portfolio.projects.map((project) => (
                    <div className="public-portfolio__project" key={project.id}>
                      <div className="public-portfolio__project-head">
                        <h3>{project.title}</h3>
                        <span className={`status-badge status-badge--${project.status}`}>
                          {titleCase(project.status)}
                        </span>
                      </div>
                      {project.description && <p>{project.description}</p>}
                      {project.skills && (
                        <div className="public-portfolio__tags">
                          {String(project.skills)
                            .split(',')
                            .map((skill) => (
                              <span key={skill.trim()}>{skill.trim()}</span>
                            ))}
                        </div>
                      )}
                      <div className="public-portfolio__links">
                        {project.repo_url && (
                          <a href={project.repo_url} target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> Repository
                          </a>
                        )}
                        {project.live_url && (
                          <a href={project.live_url} target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> Live project
                          </a>
                        )}
                        {project.score != null && <span>AI score {project.score}/100</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No public projects yet.</p>
              )}
            </article>
          </div>

          <aside className="public-portfolio__aside">
            <article className="card">
              <h2>Skills</h2>
              {Object.keys(skillsByCategory).length ? (
                Object.entries(skillsByCategory).map(([category, skills]) => (
                  <div className="public-portfolio__skill-group" key={category}>
                    <h3>{titleCase(category)}</h3>
                    <div className="public-portfolio__tags">
                      {skills.map((skill) => (
                        <span key={skill.name} title={titleCase(skill.proficiency)}>
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">No skills listed yet.</p>
              )}
            </article>

            <article className="card">
              <h2>Focus</h2>
              {portfolio.goals?.length ? (
                <ul className="public-portfolio__goals">
                  {portfolio.goals.map((goal) => (
                    <li key={goal.career_title}>
                      <Target size={15} />
                      <span>
                        {goal.career_title}
                        <small>{titleCase(goal.status)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No career goals listed.</p>
              )}

              {portfolio.roadmaps?.total > 0 && (
                <p className="public-portfolio__roadmaps">
                  <FolderKanban size={15} /> {portfolio.roadmaps.completed} of{' '}
                  {portfolio.roadmaps.total} learning roadmaps completed
                </p>
              )}
            </article>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default PublicPortfolio;
