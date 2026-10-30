import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  GitCompareArrows,
  ListChecks,
  Sparkles,
  Target,
} from 'lucide-react';
import { careerApi } from '../api/client';
import { formatDateTime, titleCase } from '../utils/format';
import PageHeader from '../components/PageHeader';
import UpgradePrompt from '../components/UpgradePrompt';
import './CareerIntelligence.css';

const ASSESSMENT_QUESTIONS = [
  'Which activities energise you most?',
  'Which subjects or tasks come naturally to you?',
  'What kind of work environment suits you best?',
  'What problem do you most want to help solve?',
  'What are you willing to learn next?',
  'What practical constraints matter (time, money, location)?',
];

const TABS = [
  { id: 'assessment', label: 'Assessment', icon: Sparkles },
  { id: 'recommendations', label: 'Recommendations', icon: Compass },
  { id: 'compare', label: 'Compare paths', icon: GitCompareArrows },
  { id: 'requirements', label: 'Role requirements', icon: ListChecks },
];

function ResultMeta({ generatedAt }) {
  if (!generatedAt) return null;
  return <p className="ci__meta">Generated {formatDateTime(generatedAt)}</p>;
}

function PriorityBadge({ value }) {
  return <span className={`ci__priority ci__priority--${value}`}>{titleCase(value)}</span>;
}

function AssessmentPanel() {
  const [answers, setAnswers] = useState(
    ASSESSMENT_QUESTIONS.map((question) => ({ question, answer: '' }))
  );
  const [result, setResult] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    careerApi
      .latestAssessment()
      .then((response) => {
        const assessment = response.data.assessment;
        if (assessment) {
          setResult(assessment.result);
          setGeneratedAt(assessment.created_at);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const filled = answers.filter((item) => item.answer.trim());
    if (filled.length < 3) {
      setError('Answer at least three questions for a useful assessment.');
      return;
    }

    setRunning(true);
    setError('');
    try {
      const response = await careerApi.runAssessment({ answers: filled });
      setResult(response.data.assessment.result);
      setGeneratedAt(response.data.assessment.created_at);
    } catch (err) {
      setError(err.message || 'Unable to run the assessment.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="ci__layout">
      <form className="card ci__form" onSubmit={handleSubmit}>
        <h2>Career interest assessment</h2>
        <p>Answer honestly. The AI uses your profile and these answers.</p>

        {answers.map((item, index) => (
          <div className="form-group" key={item.question}>
            <label className="form-label" htmlFor={`assessment-${index}`}>
              {item.question}
            </label>
            <textarea
              id={`assessment-${index}`}
              className="form-textarea"
              rows={2}
              value={item.answer}
              onChange={(event) =>
                setAnswers((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index
                      ? { ...entry, answer: event.target.value }
                      : entry
                  )
                )
              }
            />
          </div>
        ))}

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={running}>
          {running ? 'Analysing…' : 'Run assessment'}
        </button>
      </form>

      <div className="ci__results">
        {!result && <p className="empty-state">Your assessment results will appear here.</p>}

        {result && (
          <>
            <ResultMeta generatedAt={generatedAt} />
            <article className="card ci__result-card">
              <h2>Summary</h2>
              <p>{result.summary}</p>
              <h3>How you work best</h3>
              <p>{result.work_style}</p>

              <div className="ci__careers">
                {result.top_careers?.map((career) => (
                  <div className="ci__career" key={career.title}>
                    <div className="ci__career-head">
                      <strong>{career.title}</strong>
                      <span>{career.fit_score ?? '-'}% fit</span>
                    </div>
                    <p>{career.why}</p>
                    <div className="ci__tags">
                      {career.key_skills?.map((skill) => (
                        <span className="ci__tag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="ci__two-col">
                <div>
                  <h3>
                    <CheckCircle2 size={16} /> Strengths
                  </h3>
                  <ul>
                    {result.strengths?.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>
                    <AlertTriangle size={16} /> Watch-outs
                  </h3>
                  <ul>
                    {result.watch_outs?.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {result.suggested_career_goal && (
                <p className="ci__goal">
                  <Target size={16} /> Suggested goal: <strong>{result.suggested_career_goal}</strong>
                </p>
              )}

              {result.recommended_next_steps?.length > 0 && (
                <>
                  <h3>Next steps</h3>
                  <ul>
                    {result.recommended_next_steps.map((step) => (
                      <li key={`${step.action}-${step.timeframe}`}>
                        {step.action}
                        {step.timeframe ? ` (${step.timeframe})` : ''}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          </>
        )}
      </div>
    </div>
  );
}

function RecommendationsPanel() {
  const [interests, setInterests] = useState('');
  const [limit, setLimit] = useState(5);
  const [result, setResult] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    careerApi
      .latestRecommendations()
      .then((response) => {
        setResult(response.data.analysis);
        setGeneratedAt(response.data.generated_at);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setRunning(true);
    setError('');
    try {
      const response = await careerApi.recommendations({
        interests: interests.trim() || undefined,
        limit: Number(limit),
      });
      setResult(response.data.analysis);
      setGeneratedAt(response.data.generated_at);
    } catch (err) {
      setError(err.message || 'Unable to generate recommendations.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="ci__layout">
      <form className="card ci__form" onSubmit={handleSubmit}>
        <h2>Career recommendations</h2>
        <p>Get realistic roles based on your profile, skills, and interests.</p>

        <div className="form-group">
          <label className="form-label" htmlFor="ci-interests">
            Extra interests (optional)
          </label>
          <textarea
            id="ci-interests"
            className="form-textarea"
            rows={3}
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            placeholder="e.g. community health, data, small business"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ci-limit">
            Number of recommendations
          </label>
          <select
            id="ci-limit"
            className="form-select"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          >
            {[3, 4, 5, 6, 8].map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={running}>
          {running ? 'Generating…' : 'Generate recommendations'}
        </button>
      </form>

      <div className="ci__results">
        {!result && (
          <p className="empty-state">Career recommendations will appear here.</p>
        )}

        {result && (
          <>
            <ResultMeta generatedAt={generatedAt} />
            <article className="card ci__result-card">
              <h2>Overview</h2>
              <p>{result.summary}</p>

              <div className="ci__careers">
                {result.recommendations?.map((item) => (
                  <div className="ci__career" key={item.title}>
                    <div className="ci__career-head">
                      <strong>{item.title}</strong>
                      <span>{item.fit_score ?? '-'}% fit</span>
                    </div>
                    <p>{item.why}</p>
                    {item.entry_path && (
                      <p>
                        <strong>Entry path:</strong> {item.entry_path}
                      </p>
                    )}
                    <div className="ci__tags">
                      {item.core_skills?.map((skill) => (
                        <span className="ci__tag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    {item.skills_to_build?.length > 0 && (
                      <p>
                        <strong>Build next:</strong> {item.skills_to_build.join(', ')}
                      </p>
                    )}
                    {item.progression?.length > 0 && (
                      <p>
                        <strong>Progression:</strong> {item.progression.join(' → ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </>
        )}
      </div>
    </div>
  );
}

function ComparePanel() {
  const [form, setForm] = useState({ path_a: '', path_b: '', focus: '' });
  const [result, setResult] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    careerApi
      .latestComparison()
      .then((response) => {
        setResult(response.data.analysis);
        setGeneratedAt(response.data.generated_at);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.path_a.trim().toLowerCase() === form.path_b.trim().toLowerCase()) {
      setError('Choose two different paths.');
      return;
    }

    setRunning(true);
    setError('');
    try {
      const response = await careerApi.compare({
        path_a: form.path_a.trim(),
        path_b: form.path_b.trim(),
        focus: form.focus.trim() || undefined,
      });
      setResult(response.data.analysis);
      setGeneratedAt(response.data.generated_at);
    } catch (err) {
      setError(err.message || 'Unable to compare those paths.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="ci__layout">
      <form className="card ci__form" onSubmit={handleSubmit}>
        <h2>Compare two career paths</h2>
        <p>See fit, entry difficulty, shared skills, and how to test each path.</p>

        {['path_a', 'path_b'].map((field, index) => (
          <div className="form-group" key={field}>
            <label className="form-label" htmlFor={`ci-${field}`}>
              Path {index === 0 ? 'A' : 'B'}
            </label>
            <input
              id={`ci-${field}`}
              className="form-input"
              value={form[field]}
              onChange={(event) =>
                setForm((current) => ({ ...current, [field]: event.target.value }))
              }
              placeholder={index === 0 ? 'e.g. Data analyst' : 'e.g. Digital marketer'}
              required
            />
          </div>
        ))}

        <div className="form-group">
          <label className="form-label" htmlFor="ci-focus">
            What matters most? (optional)
          </label>
          <input
            id="ci-focus"
            className="form-input"
            value={form.focus}
            onChange={(event) =>
              setForm((current) => ({ ...current, focus: event.target.value }))
            }
            placeholder="e.g. quick income, remote work, stability"
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={running}>
          {running ? 'Comparing…' : 'Compare paths'}
        </button>
      </form>

      <div className="ci__results">
        {!result && <p className="empty-state">Your comparison will appear here.</p>}

        {result && (
          <>
            <ResultMeta generatedAt={generatedAt} />
            <article className="card ci__result-card">
              <h2>Verdict</h2>
              <p>{result.summary}</p>

              <div className="ci__compare">
                {result.paths?.map((path) => (
                  <div className="ci__compare-card" key={path.title}>
                    <div className="ci__career-head">
                      <strong>{path.title}</strong>
                      <span>{path.fit_score ?? '-'}% fit</span>
                    </div>
                    <p>
                      <strong>Entry difficulty:</strong> {titleCase(path.entry_difficulty)}
                    </p>
                    <p>
                      <strong>Time to readiness:</strong> {path.time_to_readiness || '—'}
                    </p>
                    <div className="ci__tags">
                      {path.core_skills?.map((skill) => (
                        <span className="ci__tag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    {path.progression?.length > 0 && (
                      <p>
                        <strong>Progression:</strong> {path.progression.join(' → ')}
                      </p>
                    )}
                    <div className="ci__two-col">
                      <div>
                        <h4>Pros</h4>
                        <ul>
                          {path.pros?.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Cons</h4>
                        <ul>
                          {path.cons?.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {result.shared_skills?.length > 0 && (
                <>
                  <h3>Shared skills</h3>
                  <div className="ci__tags">
                    {result.shared_skills.map((skill) => (
                      <span className="ci__tag" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {result.decision_tips?.length > 0 && (
                <>
                  <h3>How to decide</h3>
                  <ul>
                    {result.decision_tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          </>
        )}
      </div>
    </div>
  );
}

function RequirementsPanel() {
  const [role, setRole] = useState('');
  const [result, setResult] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    careerApi
      .latestRequirements()
      .then((response) => {
        setResult(response.data.analysis);
        setGeneratedAt(response.data.generated_at);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!role.trim()) {
      setError('Type a role first.');
      return;
    }

    setRunning(true);
    setError('');
    try {
      const response = await careerApi.requirements({ role: role.trim() });
      setResult(response.data.analysis);
      setGeneratedAt(response.data.generated_at);
    } catch (err) {
      setError(err.message || 'Unable to load role requirements.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="ci__layout">
      <form className="card ci__form" onSubmit={handleSubmit}>
        <h2>Role requirements</h2>
        <p>Understand what a role needs and how it progresses.</p>

        <div className="form-group">
          <label className="form-label" htmlFor="ci-role">
            Target role
          </label>
          <input
            id="ci-role"
            className="form-input"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Junior software developer"
            required
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={running}>
          {running ? 'Loading…' : 'Show requirements'}
        </button>
      </form>

      <div className="ci__results">
        {!result && <p className="empty-state">Role requirements will appear here.</p>}

        {result && (
          <>
            <ResultMeta generatedAt={generatedAt} />
            <article className="card ci__result-card">
              <h2>{result.role}</h2>
              <p>{result.summary}</p>

              <h3>Requirements</h3>
              <ul className="ci__requirements">
                {result.requirements?.map((item) => (
                  <li key={item.area}>
                    <div>
                      <strong>{item.area}</strong>
                      <PriorityBadge value={item.priority} />
                    </div>
                    <p>{item.detail}</p>
                  </li>
                ))}
              </ul>

              <div className="ci__two-col">
                <div>
                  <h3>Qualifications</h3>
                  <ul>
                    {result.qualifications?.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Tools</h3>
                  <div className="ci__tags">
                    {result.tools?.map((item) => (
                      <span className="ci__tag" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <h3>Useful experience</h3>
              <ul>
                {result.experience?.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3>Progression</h3>
              <div className="ci__progression">
                {result.progression?.map((step) => (
                  <div className="ci__step" key={`${step.level}-${step.title}`}>
                    <span>{step.level}</span>
                    <strong>{step.title}</strong>
                    <p>{step.typical_focus}</p>
                    {step.next_step && <small>Next: {step.next_step}</small>}
                  </div>
                ))}
              </div>

              {result.market_notes && (
                <div className="alert alert-info">{result.market_notes}</div>
              )}
            </article>
          </>
        )}
      </div>
    </div>
  );
}

function CareerIntelligence() {
  const [tab, setTab] = useState('assessment');

  return (
    <div className="career-intelligence">
      <PageHeader
        eyebrow="Career intelligence"
        icon={Compass}
        title="Understand your direction"
        description="Assess your interests, explore realistic roles, compare paths, and see what a role really requires."
      />

      <section className="section section--soft">
        <div className="container">
          <UpgradePrompt feature="career_compare" />
          <div className="ci__tabs" role="tablist" aria-label="Career intelligence tools">
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`ci__tab ${tab === item.id ? 'ci__tab--active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  <Icon size={17} /> {item.label}
                </button>
              );
            })}
          </div>

          {tab === 'assessment' && <AssessmentPanel />}
          {tab === 'recommendations' && <RecommendationsPanel />}
          {tab === 'compare' && <ComparePanel />}
          {tab === 'requirements' && <RequirementsPanel />}
        </div>
      </section>
    </div>
  );
}

export default CareerIntelligence;
