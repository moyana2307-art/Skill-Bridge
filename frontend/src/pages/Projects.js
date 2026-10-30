import { useEffect, useState } from 'react';
import {
  ExternalLink,
  FolderKanban,
  Globe2,
  Lightbulb,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { portfolioApi, projectsApi } from '../api/client';
import { formatDate, titleCase } from '../utils/format';
import PageHeader from '../components/PageHeader';
import UpgradePrompt from '../components/UpgradePrompt';
import './Projects.css';

const STATUSES = ['planned', 'in_progress', 'completed'];

const EMPTY_FORM = {
  title: '',
  description: '',
  skills: '',
  status: 'planned',
  repo_url: '',
  live_url: '',
  evidence: '',
};

function ProjectsPanel() {
  const [projects, setProjects] = useState([]);
  const [ideas, setIdeas] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    projectsApi
      .list()
      .then((response) => setProjects(response.data.projects || []))
      .catch((err) => setError(err.message || 'Unable to load projects.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Add a project title.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await projectsApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        skills: form.skills.trim() || undefined,
        status: form.status,
        repo_url: form.repo_url.trim() || undefined,
        live_url: form.live_url.trim() || undefined,
        evidence: form.evidence.trim() || undefined,
      });
      setProjects((current) => [response.data.project, ...current]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Unable to create that project.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (projectId, status) => {
    try {
      const response = await projectsApi.update(projectId, { status });
      setProjects((current) =>
        current.map((item) => (item.id === projectId ? response.data.project : item))
      );
    } catch (err) {
      setError(err.message || 'Unable to update that project.');
    }
  };

  const handleSubmitProject = async (projectId) => {
    try {
      const response = await projectsApi.submit(projectId);
      setProjects((current) =>
        current.map((item) => (item.id === projectId ? response.data.project : item))
      );
    } catch (err) {
      setError(err.message || 'Unable to submit that project.');
    }
  };

  const handleEvaluate = async (projectId) => {
    setEvaluating(projectId);
    setError('');
    try {
      const response = await projectsApi.evaluate(projectId);
      setProjects((current) =>
        current.map((item) =>
          item.id === projectId ? response.data.project : item
        )
      );
    } catch (err) {
      setError(err.message || 'Unable to evaluate that project.');
    } finally {
      setEvaluating(null);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await projectsApi.remove(projectId);
      setProjects((current) => current.filter((item) => item.id !== projectId));
    } catch (err) {
      setError(err.message || 'Unable to delete that project.');
    }
  };

  const handleRecommend = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await projectsApi.recommendations({ limit: 5 });
      setIdeas(response.data.analysis);
    } catch (err) {
      setError(err.message || 'Unable to generate project ideas.');
    } finally {
      setGenerating(false);
    }
  };

  const prefillFromIdea = (idea) => {
    setForm({
      ...EMPTY_FORM,
      title: idea.title,
      description: idea.description,
      skills: (idea.skills || []).join(', '),
      evidence: (idea.evidence_to_collect || []).join('; '),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="projects__toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm((current) => !current)}
        >
          <Plus size={16} /> {showForm ? 'Close form' : 'New project'}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleRecommend}
          disabled={generating}
        >
          <Lightbulb size={16} /> {generating ? 'Thinking…' : 'Get project ideas'}
        </button>
      </div>

      {showForm && (
        <form className="card projects__form" onSubmit={handleCreate}>
          <h2>Add a project</h2>
          <div className="projects__form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="project-title">
                Title
              </label>
              <input
                id="project-title"
                name="title"
                className="form-input"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-status">
                Status
              </label>
              <select
                id="project-status"
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
            <div className="form-group projects__form-wide">
              <label className="form-label" htmlFor="project-description">
                Description
              </label>
              <textarea
                id="project-description"
                name="description"
                className="form-textarea"
                rows={3}
                value={form.description}
                onChange={handleChange}
                placeholder="What did you build and what problem does it solve?"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-skills">
                Skills
              </label>
              <input
                id="project-skills"
                name="skills"
                className="form-input"
                value={form.skills}
                onChange={handleChange}
                placeholder="React, SQL, communication"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-repo">
                Repository URL
              </label>
              <input
                id="project-repo"
                name="repo_url"
                className="form-input"
                value={form.repo_url}
                onChange={handleChange}
                placeholder="https://github.com/…"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-live">
                Live URL
              </label>
              <input
                id="project-live"
                name="live_url"
                className="form-input"
                value={form.live_url}
                onChange={handleChange}
                placeholder="https://…"
              />
            </div>
            <div className="form-group projects__form-wide">
              <label className="form-label" htmlFor="project-evidence">
                Evidence
              </label>
              <textarea
                id="project-evidence"
                name="evidence"
                className="form-textarea"
                rows={2}
                value={form.evidence}
                onChange={handleChange}
                placeholder="Screenshots, results, user feedback, metrics…"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save project'}
          </button>
        </form>
      )}

      {ideas && (
        <article className="card projects__ideas">
          <header>
            <h2>Project ideas</h2>
            <p>{ideas.summary}</p>
          </header>
          <div className="projects__idea-grid">
            {ideas.projects?.map((idea) => (
              <div className="projects__idea" key={idea.title}>
                <div className="projects__idea-head">
                  <strong>{idea.title}</strong>
                  <span>{titleCase(idea.difficulty)}</span>
                </div>
                <p>{idea.description}</p>
                <div className="projects__tags">
                  {idea.skills?.map((skill) => (
                    <span className="projects__tag" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
                <small>
                  {idea.estimated_hours ? `~${idea.estimated_hours} hours · ` : ''}
                  {idea.steps?.length || 0} steps
                </small>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => prefillFromIdea(idea)}
                >
                  <Plus size={14} /> Add this project
                </button>
              </div>
            ))}
          </div>
        </article>
      )}

      {loading ? (
        <div className="spinner" role="status" aria-label="Loading projects" />
      ) : projects.length ? (
        <div className="projects__list">
          {projects.map((project) => (
            <article className="card projects__item" key={project.id}>
              <div className="projects__item-head">
                <div>
                  <h2>{project.title}</h2>
                  <p>
                    {titleCase(project.status)}
                    {project.score != null ? ` · AI score ${project.score}/100` : ''}
                  </p>
                </div>
                <span className={`status-badge status-badge--${project.status}`}>
                  {titleCase(project.status)}
                </span>
              </div>

              {project.description && <p>{project.description}</p>}

              {project.skills && (
                <div className="projects__tags">
                  {project.skills.split(',').map((skill) => (
                    <span className="projects__tag" key={skill.trim()}>
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="projects__links">
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
                {project.submitted_at && (
                  <span>Submitted {formatDate(project.submitted_at)}</span>
                )}
              </div>

              {project.evaluation && (
                <div className="projects__evaluation">
                  <p>{project.evaluation.summary}</p>
                  {project.evaluation.strengths?.length > 0 && (
                    <p>
                      <strong>Strengths:</strong> {project.evaluation.strengths.join('; ')}
                    </p>
                  )}
                  {project.evaluation.improvements?.length > 0 && (
                    <p>
                      <strong>Improve:</strong> {project.evaluation.improvements.join('; ')}
                    </p>
                  )}
                </div>
              )}

              <div className="projects__actions">
                <select
                  className="form-select projects__status-select"
                  value={project.status}
                  onChange={(event) => handleStatus(project.id, event.target.value)}
                  aria-label={`Change status for ${project.title}`}
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
                  onClick={() => handleSubmitProject(project.id)}
                >
                  Submit
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleEvaluate(project.id)}
                  disabled={evaluating === project.id}
                >
                  <Sparkles size={14} />
                  {evaluating === project.id ? 'Evaluating…' : 'Evaluate'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleDelete(project.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FolderKanban size={28} />
          <p>No projects yet. Add one or generate an idea to get started.</p>
        </div>
      )}
    </>
  );
}

function PortfolioPanel() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    portfolio_slug: '',
    portfolio_headline: '',
    portfolio_about: '',
    portfolio_public: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    portfolioApi
      .getSettings()
      .then((response) => {
        const loaded = response.data.settings;
        setSettings(loaded);
        setForm({
          portfolio_slug: loaded.portfolio_slug || '',
          portfolio_headline: loaded.portfolio_headline || '',
          portfolio_about: loaded.portfolio_about || '',
          portfolio_public: Boolean(loaded.portfolio_public),
        });
      })
      .catch((err) => setError(err.message || 'Unable to load portfolio settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setSaved(false);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await portfolioApi.updateSettings({
        portfolio_slug: form.portfolio_slug.trim() || null,
        portfolio_headline: form.portfolio_headline.trim() || null,
        portfolio_about: form.portfolio_about.trim() || null,
        portfolio_public: form.portfolio_public,
      });
      setSettings(response.data.settings);
      setForm((current) => ({
        ...current,
        portfolio_slug: response.data.settings.portfolio_slug || '',
      }));
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Unable to save portfolio settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="spinner" role="status" aria-label="Loading portfolio settings" />;
  }

  return (
    <div className="projects__portfolio">
      <form className="card projects__portfolio-form" onSubmit={handleSubmit}>
        <h2>Public portfolio</h2>
        <p>
          Share a page with your skills, projects, and goals. Your email and private
          data are never shown.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {saved && <div className="alert alert-success">Portfolio settings saved.</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="portfolio-slug">
            Portfolio link
          </label>
          <div className="projects__slug">
            <span>/portfolio/</span>
            <input
              id="portfolio-slug"
              name="portfolio_slug"
              className="form-input"
              value={form.portfolio_slug}
              onChange={handleChange}
              placeholder="your-name"
            />
          </div>
          <p className="form-hint">3-80 lowercase letters, numbers, or dashes.</p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="portfolio-headline">
            Headline
          </label>
          <input
            id="portfolio-headline"
            name="portfolio_headline"
            className="form-input"
            value={form.portfolio_headline}
            onChange={handleChange}
            placeholder="e.g. Junior web developer building practical tools"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="portfolio-about">
            About you
          </label>
          <textarea
            id="portfolio-about"
            name="portfolio_about"
            className="form-textarea"
            rows={5}
            value={form.portfolio_about}
            onChange={handleChange}
            placeholder="A short introduction for visitors."
          />
        </div>

        <label className="projects__toggle">
          <input
            type="checkbox"
            name="portfolio_public"
            checked={form.portfolio_public}
            onChange={handleChange}
          />
          <span>
            Make my portfolio public
            <small>Anyone with the link can view it.</small>
          </span>
        </label>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <aside className="card projects__portfolio-preview">
        <Globe2 size={26} />
        <h3>Share your work</h3>
        {settings?.portfolio_public && form.portfolio_slug ? (
          <>
            <p>Your portfolio is live at:</p>
            <a
              href={`/portfolio/${form.portfolio_slug}`}
              target="_blank"
              rel="noreferrer"
            >
              /portfolio/{form.portfolio_slug} <ExternalLink size={13} />
            </a>
          </>
        ) : (
          <p>Turn on public visibility to get a shareable link.</p>
        )}
      </aside>
    </div>
  );
}

function Projects() {
  const [tab, setTab] = useState('projects');

  return (
    <div className="projects">
      <PageHeader
        eyebrow="Projects and portfolio"
        icon={FolderKanban}
        title="Prove your skills with real work"
        description="Build practical projects, get AI feedback, and publish a portfolio employers can open."
      />

      <section className="section section--soft">
        <div className="container">
          <UpgradePrompt feature="project_ideas" />
          <div className="ci__tabs" role="tablist" aria-label="Projects and portfolio">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'projects'}
              className={`ci__tab ${tab === 'projects' ? 'ci__tab--active' : ''}`}
              onClick={() => setTab('projects')}
            >
              <FolderKanban size={17} /> Projects
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'portfolio'}
              className={`ci__tab ${tab === 'portfolio' ? 'ci__tab--active' : ''}`}
              onClick={() => setTab('portfolio')}
            >
              <Globe2 size={17} /> Public portfolio
            </button>
          </div>

          {tab === 'projects' ? <ProjectsPanel /> : <PortfolioPanel />}
        </div>
      </section>
    </div>
  );
}

export default Projects;
