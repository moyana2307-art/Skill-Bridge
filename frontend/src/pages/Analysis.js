import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  FolderKanban,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { aiApi, careerGoalsApi } from '../api/client';
import PageHeader from '../components/PageHeader';
import './Analysis.css';

const INITIAL_FORM = {
  career_goal_id: '',
  target_role: '',
};

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Analysis() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [analysis, setAnalysis] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      careerGoalsApi.list(),
      aiApi.latestSkillsGap(),
    ]).then(([goalsResult, latestResult]) => {
      if (!active) return;

      if (goalsResult.status === 'fulfilled') {
        const loadedGoals = goalsResult.value.data.goals || [];
        setGoals(loadedGoals);

        const activeGoal =
          loadedGoals.find((goal) => goal.status === 'active') || loadedGoals[0];

        if (activeGoal) {
          setForm((current) => ({
            ...current,
            career_goal_id: String(activeGoal.id),
          }));
        }
      }

      if (latestResult.status === 'fulfilled') {
        const latest = latestResult.value.data;
        setAnalysis(latest.analysis || null);
        setGeneratedAt(latest.generated_at || null);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.career_goal_id && !form.target_role.trim()) {
      setError('Choose a career goal or type a target role first.');
      return;
    }

    setRunning(true);
    setError('');

    try {
      const response = await aiApi.skillsGap({
        career_goal_id: form.career_goal_id
          ? Number(form.career_goal_id)
          : undefined,
        target_role: form.target_role.trim() || undefined,
      });

      setAnalysis(response.data.analysis);
      setGeneratedAt(response.data.generated_at);
    } catch (err) {
      setError(err.message || 'Unable to run the skills-gap analysis.');
    } finally {
      setRunning(false);
    }
  };

  const selectedGoal = goals.find(
    (goal) => String(goal.id) === String(form.career_goal_id)
  );

  return (
    <div className="analysis">
      <PageHeader
        eyebrow="AI career coach"
        icon={Sparkles}
        title="Skills-gap analysis"
        description="See how ready you are for a target role, which skills to close next, and a practical plan based on your real profile and skills."
      />

      <section className="section section--soft">
        <div className="container analysis__layout">
          <form className="card analysis__form" onSubmit={handleSubmit}>
            <div className="analysis__form-head">
              <Target size={22} />
              <div>
                <h2>What are you aiming for?</h2>
                <p>Use a saved career goal, a custom role, or both.</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="analysis-goal">
                Career goal
              </label>
              <select
                id="analysis-goal"
                name="career_goal_id"
                className="form-select"
                value={form.career_goal_id}
                onChange={handleChange}
              >
                <option value="">No saved goal</option>
                {goals.map((goal) => (
                  <option value={goal.id} key={goal.id}>
                    {goal.career_title}
                    {goal.status !== 'active' ? ` (${goal.status})` : ''}
                  </option>
                ))}
              </select>
              {goals.length === 0 && (
                <p className="analysis__hint">
                  <Link to="/goals">Create a career goal</Link> to keep your
                  analysis linked to your direction.
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="analysis-role">
                Target role
              </label>
              <input
                id="analysis-role"
                name="target_role"
                className="form-input"
                placeholder="e.g. Junior frontend developer"
                value={form.target_role}
                onChange={handleChange}
                maxLength={150}
              />
              <p className="analysis__hint">
                {selectedGoal
                  ? `Leave blank to use "${selectedGoal.career_title}".`
                  : 'Type the role you want to be considered for.'}
              </p>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary analysis__submit"
              disabled={running}
            >
              <Sparkles size={17} />
              {running ? 'Analysing...' : 'Run analysis'}
            </button>
          </form>

          <div className="analysis__result">
            {loading && (
              <div
                className="spinner analysis__spinner"
                role="status"
                aria-label="Loading your latest analysis"
              />
            )}

            {!loading && !analysis && (
              <div className="card analysis__empty">
                <TrendingUp size={34} />
                <h2>No analysis yet</h2>
                <p>
                  Run your first analysis to see a readiness score, strengths,
                  gaps, and next steps.
                </p>
              </div>
            )}

            {!loading && analysis && (
              <>
                <article className="card analysis__summary-card">
                  <div className="analysis__score-row">
                    <div
                      className="analysis__score"
                      style={{
                        '--score': `${analysis.readiness_score || 0}%`,
                      }}
                    >
                      <span>{analysis.readiness_score ?? '—'}</span>
                      <small>/ 100</small>
                    </div>
                    <div>
                      <span className="analysis__eyebrow">Target role</span>
                      <h2>{analysis.target_role}</h2>
                      {generatedAt && (
                        <p className="analysis__timestamp">
                          Generated {formatDate(generatedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {analysis.summary && <p>{analysis.summary}</p>}
                </article>

                <div className="analysis__grid">
                  <section className="card analysis__panel">
                    <h3>
                      <TrendingUp size={18} /> Strengths
                    </h3>
                    {analysis.strengths?.length ? (
                      <ul className="analysis__list">
                        {analysis.strengths.map((item) => (
                          <li key={item.skill}>
                            <strong>{item.skill}</strong>
                            {item.evidence && <span>{item.evidence}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="analysis__muted">No strengths returned.</p>
                    )}
                  </section>

                  <section className="card analysis__panel">
                    <h3>
                      <AlertTriangle size={18} /> Gaps to close
                    </h3>
                    {analysis.gaps?.length ? (
                      <ul className="analysis__list">
                        {analysis.gaps.map((gap) => (
                          <li key={gap.skill}>
                            <strong>
                              {gap.skill}
                              <span
                                className={`analysis__priority analysis__priority--${gap.priority}`}
                              >
                                {gap.priority}
                              </span>
                            </strong>
                            {gap.why && <span>{gap.why}</span>}
                            {gap.how_to_close && (
                              <em>How: {gap.how_to_close}</em>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="analysis__muted">No gaps returned.</p>
                    )}
                  </section>
                </div>

                <section className="card analysis__panel">
                  <h3>
                    <ListChecks size={18} /> Next steps
                  </h3>
                  {analysis.next_steps?.length ? (
                    <ol className="analysis__steps">
                      {analysis.next_steps.map((step, index) => (
                        <li key={`${step.action}-${index}`}>
                          <div>
                            <strong>{step.action}</strong>
                            {step.success_measure && (
                              <span>Done when: {step.success_measure}</span>
                            )}
                          </div>
                          {step.timeframe && (
                            <span className="analysis__timeframe">
                              {step.timeframe}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="analysis__muted">No next steps returned.</p>
                  )}
                </section>

                <section className="card analysis__panel">
                  <h3>
                    <FolderKanban size={18} /> Projects to prove your skills
                  </h3>
                  {analysis.recommended_projects?.length ? (
                    <ul className="analysis__projects">
                      {analysis.recommended_projects.map((project) => (
                        <li key={project.title}>
                          <strong>{project.title}</strong>
                          {project.description && (
                            <span>{project.description}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="analysis__muted">No projects returned.</p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Analysis;
