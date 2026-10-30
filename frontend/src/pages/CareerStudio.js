import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Mail,
  MessageSquare,
  Play,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { careerStudioApi } from '../api/client';
import { formatDate, titleCase } from '../utils/format';
import PageHeader from '../components/PageHeader';
import UpgradePrompt from '../components/UpgradePrompt';
import './CareerStudio.css';

const INTERVIEW_TYPES = ['general', 'behavioural', 'technical', 'case'];

function CvPanel() {
  const [cvs, setCvs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [cv, setCv] = useState(null);
  const [form, setForm] = useState({ title: '', target_role: '' });
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    careerStudioApi
      .listCvs()
      .then((response) => {
        const loaded = response.data.cvs || [];
        setCvs(loaded);
        if (loaded.length) setSelectedId((current) => current || loaded[0].id);
      })
      .catch((err) => setError(err.message || 'Unable to load CVs.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setCv(null);
      return;
    }

    careerStudioApi
      .getCv(selectedId)
      .then((response) => {
        setCv(response.data.cv);
        setAnalysis(null);
      })
      .catch((err) => setError(err.message || 'Unable to open that CV.'));
  }, [selectedId]);

  const handleGenerate = async (event) => {
    event.preventDefault();
    setRunning(true);
    setError('');
    try {
      const response = await careerStudioApi.generateCv({
        title: form.title.trim() || undefined,
        target_role: form.target_role.trim() || undefined,
      });
      const created = response.data.cv;
      setCvs((current) => [created, ...current]);
      setSelectedId(created.id);
      setForm({ title: '', target_role: '' });
    } catch (err) {
      setError(err.message || 'Unable to generate a CV.');
    } finally {
      setRunning(false);
    }
  };

  const handleAnalyze = async () => {
    if (!cv) return;
    setAnalyzing(true);
    setError('');
    try {
      const response = await careerStudioApi.analyzeCv(cv.id, {
        target_role: form.target_role.trim() || undefined,
      });
      setAnalysis(response.data.feedback);
    } catch (err) {
      setError(err.message || 'Unable to review that CV.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePrimary = async () => {
    if (!cv) return;
    try {
      await careerStudioApi.updateCv(cv.id, { is_primary: true });
      setCvs((current) =>
        current.map((item) => ({ ...item, is_primary: item.id === cv.id }))
      );
      setCv((current) => (current ? { ...current, is_primary: true } : current));
    } catch (err) {
      setError(err.message || 'Unable to set that CV as primary.');
    }
  };

  const handleDelete = async () => {
    if (!cv || !window.confirm('Delete this CV?')) return;
    try {
      await careerStudioApi.removeCv(cv.id);
      const remaining = cvs.filter((item) => item.id !== cv.id);
      setCvs(remaining);
      setSelectedId(remaining[0]?.id || null);
    } catch (err) {
      setError(err.message || 'Unable to delete that CV.');
    }
  };

  const content = cv?.content;

  return (
    <div className="studio__layout">
      <aside className="card studio__side">
        <form onSubmit={handleGenerate} className="studio__form">
          <h2>Generate a CV</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="cv-title">
              CV title
            </label>
            <input
              id="cv-title"
              className="form-input"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="e.g. Data analyst CV"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cv-role">
              Target role
            </label>
            <input
              id="cv-role"
              className="form-input"
              value={form.target_role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_role: event.target.value,
                }))
              }
              placeholder="e.g. Junior data analyst"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={running}>
            <Sparkles size={15} /> {running ? 'Writing…' : 'Generate CV'}
          </button>
        </form>

        <div className="studio__list">
          <h3>Your CVs</h3>
          {loading && <p className="studio__muted">Loading…</p>}
          {!loading && !cvs.length && (
            <p className="studio__muted">No CVs yet.</p>
          )}
          {cvs.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`studio__list-item ${
                selectedId === item.id ? 'is-active' : ''
              }`}
              onClick={() => setSelectedId(item.id)}
            >
              <span>
                <strong>{item.title}</strong>
                <small>Updated {formatDate(item.updated_at)}</small>
              </span>
              {item.is_primary && <span className="studio__primary">Primary</span>}
            </button>
          ))}
        </div>
      </aside>

      <div className="studio__main">
        {error && <div className="alert alert-error">{error}</div>}

        {!cv && !loading && (
          <div className="card empty-state">
            <FileText size={28} />
            <p>Generate a CV to see it here.</p>
          </div>
        )}

        {cv && content && (
          <>
            <article className="card studio__document">
              <header className="studio__document-head">
                <div>
                  <h2>{content.headline || cv.title}</h2>
                  <p>
                    {content.contact?.name}
                    {content.contact?.email ? ` · ${content.contact.email}` : ''}
                    {content.contact?.location ? ` · ${content.contact.location}` : ''}
                  </p>
                </div>
                <div className="studio__document-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    <ClipboardCheck size={14} />
                    {analyzing ? 'Reviewing…' : 'Review CV'}
                  </button>
                  {!cv.is_primary && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handlePrimary}
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </header>

              {content.summary && (
                <section>
                  <h3>Profile</h3>
                  <p>{content.summary}</p>
                </section>
              )}

              {content.experience?.length > 0 && (
                <section>
                  <h3>Experience</h3>
                  {content.experience.map((item, index) => (
                    <div className="studio__entry" key={`${item.title}-${index}`}>
                      <div className="studio__entry-head">
                        <strong>
                          {item.title}
                          {item.organisation ? ` · ${item.organisation}` : ''}
                        </strong>
                        <span>
                          {item.start}
                          {item.end ? ` – ${item.end}` : ''}
                        </span>
                      </div>
                      <ul>
                        {item.bullets?.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {content.education?.length > 0 && (
                <section>
                  <h3>Education</h3>
                  {content.education.map((item) => (
                    <div className="studio__entry" key={item.qualification}>
                      <div className="studio__entry-head">
                        <strong>{item.qualification}</strong>
                        <span>{item.year}</span>
                      </div>
                      <p>{item.institution}</p>
                    </div>
                  ))}
                </section>
              )}

              {content.skills?.length > 0 && (
                <section>
                  <h3>Skills</h3>
                  <div className="studio__tags">
                    {content.skills.map((skill) => (
                      <span className="studio__tag" key={skill.name}>
                        {skill.name}
                        {skill.level ? ` · ${titleCase(skill.level)}` : ''}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {content.projects?.length > 0 && (
                <section>
                  <h3>Projects</h3>
                  {content.projects.map((item) => (
                    <div className="studio__entry" key={item.title}>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer">
                          {item.link}
                        </a>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {content.certifications?.length > 0 && (
                <section>
                  <h3>Certifications</h3>
                  <ul>
                    {content.certifications.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
            </article>

            {analysis && (
              <article className="card studio__feedback">
                <header className="studio__feedback-head">
                  <h3>CV review</h3>
                  <span className="studio__score">{analysis.score ?? '-'}/100</span>
                </header>
                <p>{analysis.summary}</p>

                <div className="studio__two-col">
                  <div>
                    <h4>Strengths</h4>
                    <ul>
                      {analysis.strengths?.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Improvements</h4>
                    <ul>
                      {analysis.improvements?.map((item) => (
                        <li key={item.area}>
                          <strong>{item.area}:</strong> {item.recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {analysis.missing_keywords?.length > 0 && (
                  <>
                    <h4>Keywords to consider</h4>
                    <div className="studio__tags">
                      {analysis.missing_keywords.map((item) => (
                        <span className="studio__tag" key={item}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {analysis.ats_tips?.length > 0 && (
                  <>
                    <h4>ATS tips</h4>
                    <ul>
                      {analysis.ats_tips.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </article>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CoverLetterPanel() {
  const [letters, setLetters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ role: '', tone: 'professional and warm' });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    careerStudioApi
      .listCoverLetters()
      .then((response) => {
        const loaded = response.data.cover_letters || [];
        setLetters(loaded);
        if (loaded.length) setSelected(loaded[0]);
      })
      .catch((err) => setError(err.message || 'Unable to load cover letters.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
    setRunning(true);
    setError('');
    try {
      const response = await careerStudioApi.generateCoverLetter({
        role: form.role.trim() || undefined,
        tone: form.tone.trim() || undefined,
      });
      const created = response.data.cover_letter;
      setLetters((current) => [created, ...current]);
      setSelected(created);
      setForm((current) => ({ ...current, role: '' }));
    } catch (err) {
      setError(err.message || 'Unable to write a cover letter.');
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (coverLetterId) => {
    if (!window.confirm('Delete this cover letter?')) return;
    try {
      await careerStudioApi.removeCoverLetter(coverLetterId);
      const remaining = letters.filter((item) => item.id !== coverLetterId);
      setLetters(remaining);
      if (selected?.id === coverLetterId) setSelected(remaining[0] || null);
    } catch (err) {
      setError(err.message || 'Unable to delete that cover letter.');
    }
  };

  return (
    <div className="studio__layout">
      <aside className="card studio__side">
        <form onSubmit={handleGenerate} className="studio__form">
          <h2>Write a cover letter</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="letter-role">
              Role
            </label>
            <input
              id="letter-role"
              className="form-input"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value }))
              }
              placeholder="e.g. Communications assistant"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="letter-tone">
              Tone
            </label>
            <input
              id="letter-tone"
              className="form-input"
              value={form.tone}
              onChange={(event) =>
                setForm((current) => ({ ...current, tone: event.target.value }))
              }
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={running}>
            <Mail size={15} /> {running ? 'Writing…' : 'Generate letter'}
          </button>
        </form>

        <div className="studio__list">
          <h3>Saved letters</h3>
          {loading && <p className="studio__muted">Loading…</p>}
          {!loading && !letters.length && (
            <p className="studio__muted">No cover letters yet.</p>
          )}
          {letters.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`studio__list-item ${
                selected?.id === item.id ? 'is-active' : ''
              }`}
              onClick={() => setSelected(item)}
            >
              <span>
                <strong>{item.title}</strong>
                <small>{formatDate(item.created_at)}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="studio__main">
        {error && <div className="alert alert-error">{error}</div>}

        {!selected && !loading && (
          <div className="card empty-state">
            <Mail size={28} />
            <p>Generate a cover letter to see it here.</p>
          </div>
        )}

        {selected && (
          <article className="card studio__document">
            <header className="studio__document-head">
              <div>
                <h2>{selected.title}</h2>
                <p>{formatDate(selected.created_at)}</p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleDelete(selected.id)}
              >
                <Trash2 size={14} /> Delete
              </button>
            </header>
            <p className="studio__letter">{selected.content}</p>
          </article>
        )}
      </div>
    </div>
  );
}

function InterviewPanel() {
  const [interviews, setInterviews] = useState([]);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ role: '', interview_type: 'general' });
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [answering, setAnswering] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    careerStudioApi
      .listInterviews()
      .then((response) => {
        const loaded = response.data.interviews || [];
        setInterviews(loaded);
        if (loaded.length) setActive((current) => current || loaded[0].id);
      })
      .catch((err) => setError(err.message || 'Unable to load mock interviews.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const loadInterview = (interviewId) => {
    if (!interviewId) {
      setActive(null);
      return;
    }
    careerStudioApi
      .getInterview(interviewId)
      .then((response) => {
        setActive(response.data.interview);
        const existingAnswers = {};
        const existingFeedback = {};
        (response.data.interview.answers || []).forEach((item) => {
          existingAnswers[item.question_index] = item.answer;
          existingFeedback[item.question_index] = item.feedback;
        });
        setAnswers(existingAnswers);
        setFeedback(existingFeedback);
      })
      .catch((err) => setError(err.message || 'Unable to open that interview.'));
  };

  useEffect(() => {
    loadInterview(active);
  }, [active]);

  const handleStart = async (event) => {
    event.preventDefault();
    if (!form.role.trim()) {
      setError('Type the role you are practising for.');
      return;
    }

    setRunning(true);
    setError('');
    try {
      const response = await careerStudioApi.startInterview({
        role: form.role.trim(),
        interview_type: form.interview_type,
      });
      const created = response.data.interview;
      setInterviews((current) => [
        {
          ...created,
          answered_count: 0,
          question_count: created.questions?.length || 0,
        },
        ...current,
      ]);
      setActive(created.id);
      setForm((current) => ({ ...current, role: '' }));
    } catch (err) {
      setError(err.message || 'Unable to start a mock interview.');
    } finally {
      setRunning(false);
    }
  };

  const handleAnswer = async (index) => {
    const answer = answers[index]?.trim();
    if (!answer) return;

    setAnswering(index);
    setError('');
    try {
      const response = await careerStudioApi.answer(active, {
        question_index: index,
        answer,
      });
      setFeedback((current) => ({
        ...current,
        [index]: response.data.feedback,
      }));
      setInterviews((current) =>
        current.map((item) =>
          item.id === active
            ? { ...item, answered_count: Object.keys(feedback).length + 1 }
            : item
        )
      );
    } catch (err) {
      setError(err.message || 'Unable to review that answer.');
    } finally {
      setAnswering(null);
    }
  };

  const handleComplete = async () => {
    try {
      await careerStudioApi.completeInterview(active);
      load();
      loadInterview(active);
    } catch (err) {
      setError(err.message || 'Unable to complete that interview.');
    }
  };

  const handleDelete = async (interviewId) => {
    if (!window.confirm('Delete this mock interview?')) return;
    try {
      await careerStudioApi.removeInterview(interviewId);
      const remaining = interviews.filter((item) => item.id !== interviewId);
      setInterviews(remaining);
      setActive(remaining[0]?.id || null);
    } catch (err) {
      setError(err.message || 'Unable to delete that interview.');
    }
  };

  const current = interviews.find((item) => item.id === active);
  const questions = current?.questions || [];

  return (
    <div className="studio__layout">
      <aside className="card studio__side">
        <form onSubmit={handleStart} className="studio__form">
          <h2>Start a mock interview</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="interview-role">
              Role
            </label>
            <input
              id="interview-role"
              className="form-input"
              value={form.role}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  role: event.target.value,
                }))
              }
              placeholder="e.g. Sales assistant"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="interview-type">
              Interview type
            </label>
            <select
              id="interview-type"
              className="form-select"
              value={form.interview_type}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  interview_type: event.target.value,
                }))
              }
            >
              {INTERVIEW_TYPES.map((type) => (
                <option value={type} key={type}>
                  {titleCase(type)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={running}>
            <Play size={15} /> {running ? 'Preparing…' : 'Start interview'}
          </button>
        </form>

        <div className="studio__list">
          <h3>Your interviews</h3>
          {loading && <p className="studio__muted">Loading…</p>}
          {!loading && !interviews.length && (
            <p className="studio__muted">No mock interviews yet.</p>
          )}
          {interviews.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`studio__list-item ${
                active === item.id ? 'is-active' : ''
              }`}
              onClick={() => setActive(item.id)}
            >
              <span>
                <strong>{item.role}</strong>
                <small>
                  {titleCase(item.interview_type)} · {item.answered_count || 0}/
                  {item.question_count || 0} answered
                </small>
              </span>
              <span className={`status-badge status-badge--${item.status}`}>
                {titleCase(item.status)}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="studio__main">
        {error && <div className="alert alert-error">{error}</div>}

        {!current && !loading && (
          <div className="card empty-state">
            <MessageSquare size={28} />
            <p>Start a mock interview to practise your answers.</p>
          </div>
        )}

        {current && (
          <>
            <article className="card studio__interview-head">
              <div>
                <h2>{current.role}</h2>
                <p>
                  {titleCase(current.interview_type)} interview ·{' '}
                  {titleCase(current.status)}
                </p>
              </div>
              <div className="studio__document-actions">
                {current.status !== 'completed' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleComplete}
                  >
                    <CheckCircle2 size={14} /> Mark complete
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleDelete(current.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </article>

            <div className="studio__questions">
              {questions.map((question, index) => (
                <article className="card studio__question" key={index}>
                  <header>
                    <span>Question {index + 1}</span>
                    {feedback[index] && (
                      <span className="studio__score">
                        {feedback[index].score ?? '-'}/100
                      </span>
                    )}
                  </header>
                  <h3>{question.question}</h3>
                  {question.why && <p className="studio__muted">Assessing: {question.why}</p>}
                  {question.hint && <p className="studio__hint">Hint: {question.hint}</p>}

                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={answers[index] || ''}
                    onChange={(event) =>
                      setAnswers((currentAnswers) => ({
                        ...currentAnswers,
                        [index]: event.target.value,
                      }))
                    }
                    placeholder="Write your answer…"
                  />

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleAnswer(index)}
                    disabled={answering === index || !answers[index]?.trim()}
                  >
                    <ClipboardCheck size={14} />
                    {answering === index ? 'Reviewing…' : 'Get feedback'}
                  </button>

                  {feedback[index] && (
                    <div className="studio__answer-feedback">
                      <p>{feedback[index].summary}</p>
                      {feedback[index].strengths?.length > 0 && (
                        <>
                          <h4>Strengths</h4>
                          <ul>
                            {feedback[index].strengths.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {feedback[index].improvements?.length > 0 && (
                        <>
                          <h4>Improve</h4>
                          <ul>
                            {feedback[index].improvements.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {feedback[index].model_answer && (
                        <>
                          <h4>Example answer</h4>
                          <p>{feedback[index].model_answer}</p>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'cvs', label: 'CV builder', icon: FileText },
  { id: 'letters', label: 'Cover letters', icon: Mail },
  { id: 'interviews', label: 'Mock interviews', icon: MessageSquare },
];

function CareerStudio() {
  const [tab, setTab] = useState('cvs');

  return (
    <div className="career-studio">
      <PageHeader
        eyebrow="Career studio"
        icon={Sparkles}
        title="Build your application toolkit"
        description="Generate an honest CV, tailor cover letters, and practise interviews with instant feedback."
      />

      <section className="section section--soft">
        <div className="container">
          <UpgradePrompt feature="cv_builder" />
          <div className="ci__tabs" role="tablist" aria-label="Career studio tools">
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

          {tab === 'cvs' && <CvPanel />}
          {tab === 'letters' && <CoverLetterPanel />}
          {tab === 'interviews' && <InterviewPanel />}
        </div>
      </section>
    </div>
  );
}

export default CareerStudio;
