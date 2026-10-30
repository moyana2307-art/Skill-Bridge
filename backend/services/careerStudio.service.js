// AI CV and Interview Studio: CV generation/improvement/analysis, cover
// letters, and mock interviews with per-answer feedback.
const ApiError = require('../utils/ApiError');
const { pool } = require('../config/db');
const aiService = require('./ai.service');
const aiCareerService = require('./aiCareer.service');
const aiAnalysesService = require('./aiAnalyses.service');
const opportunitiesService = require('./opportunities.service');
const notificationsService = require('./notifications.service');

const SYSTEM_PROMPT = `You are SkillBridge AI, a practical career coach for young people in Zimbabwe.
Be honest, specific, and encouraging. Never invent qualifications, employers, dates, or experience that the user did not provide.
Return only a valid JSON object with exactly the keys requested.`;

const CV_COLUMNS = `id, user_id, title, content, is_primary, created_at, updated_at`;
const COVER_LETTER_COLUMNS = `id, user_id, opportunity_id, title, content, created_at, updated_at`;
const INTERVIEW_COLUMNS = `id, user_id, role, interview_type, questions, status, created_at, completed_at`;

function text(value, max = 4000) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return text(JSON.stringify(value), max);
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function list(value, mapper, max = 10) {
  if (!Array.isArray(value)) return [];
  return value.map(mapper).filter(Boolean).slice(0, max);
}

function score(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function incomplete(message) {
  return new ApiError(502, message, { code: 'AI_INVALID_RESPONSE' });
}

async function getUserProjects(userId) {
  const { rows } = await pool.query(
    `SELECT title, description, skills, status, repo_url, live_url
     FROM projects WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 10`,
    [userId]
  );
  return rows;
}

async function getFullContext(userId) {
  const [context, projects, goals] = await Promise.all([
    aiCareerService.getProfileContext(userId),
    getUserProjects(userId),
    pool
      .query(
        `SELECT career_title, status FROM career_goals WHERE user_id = $1
         ORDER BY CASE status WHEN 'active' THEN 1 ELSE 2 END, updated_at DESC LIMIT 5`,
        [userId]
      )
      .then((result) => result.rows),
  ]);

  return { ...context, goals, projects };
}

function normaliseCv(raw, fallbackTitle) {
  const content = {
    headline: text(raw.headline, 200),
    summary: text(raw.summary, 2000),
    contact: {
      name: text(raw.contact?.name, 150),
      email: text(raw.contact?.email, 200),
      location: text(raw.contact?.location, 150),
      links: list(raw.contact?.links, (item) => text(item, 300), 5),
    },
    experience: list(
      raw.experience,
      (item) => {
        const title = text(item?.title, 150);
        const organisation = text(item?.organisation, 150);
        if (!title && !organisation) return null;
        return {
          title,
          organisation,
          start: text(item?.start, 40),
          end: text(item?.end, 40),
          bullets: list(item?.bullets, (bullet) => text(bullet, 400), 8),
        };
      },
      8
    ),
    education: list(
      raw.education,
      (item) => {
        const qualification = text(item?.qualification, 200);
        if (!qualification) return null;
        return {
          qualification,
          institution: text(item?.institution, 200),
          year: text(item?.year, 40),
        };
      },
      6
    ),
    skills: list(
      raw.skills,
      (item) => {
        if (typeof item === 'string') return { name: text(item, 100), level: '' };
        const name = text(item?.name, 100);
        return name ? { name, level: text(item?.level, 40) } : null;
      },
      30
    ),
    projects: list(
      raw.projects,
      (item) => {
        const title = text(item?.title, 200);
        if (!title) return null;
        return {
          title,
          description: text(item?.description, 700),
          skills: list(item?.skills, (skill) => text(skill, 100), 10),
          link: text(item?.link, 300),
        };
      },
      8
    ),
    certifications: list(raw.certifications, (item) => text(item, 200), 10),
  };

  return { title: text(raw.title, 200) || fallbackTitle, content };
}

async function generateCv(userId, { title, target_role: targetRole, opportunity_id: opportunityId }) {
  const [context, opportunity] = await Promise.all([
    getFullContext(userId),
    opportunityId ? opportunitiesService.getOpportunityById(opportunityId) : Promise.resolve(null),
  ]);

  if (opportunityId && !opportunity) {
    throw ApiError.notFound(`Opportunity ${opportunityId} was not found`);
  }

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are writing an honest, ATS-friendly CV.`,
    user: `Target role: ${text(targetRole, 150) || opportunity?.title || 'general entry-level role'}
${opportunity ? `Target opportunity:\n${JSON.stringify({ title: opportunity.title, organisation: opportunity.organisation, description: opportunity.description, required_skills: opportunity.required_skills }, null, 2)}` : ''}

The user's real profile, skills, goals, and projects:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "title": "short CV title, max 200 characters",
  "headline": "professional headline",
  "summary": "3-4 sentence professional summary in first person",
  "contact": {"name": "string", "email": "string", "location": "string", "links": ["url or portfolio"]},
  "experience": [{"title": "string", "organisation": "string", "start": "string", "end": "string", "bullets": ["achievement-focused bullet"]}],
  "education": [{"qualification": "string", "institution": "string", "year": "string"}],
  "skills": [{"name": "string", "level": "beginner|intermediate|advanced"}],
  "projects": [{"title": "string", "description": "string", "skills": ["skill"], "link": "string"}],
  "certifications": ["string"]
}

Only include experience and education that appear in the supplied data. If the user has no work experience, return an empty experience array. Never invent dates, employers, or qualifications.`,
  });

  const { title: cvTitle, content } = normaliseCv(raw, title || 'My CV');

  if (!content.summary) {
    throw incomplete('The AI returned an incomplete CV. Please try again.');
  }

  const { rows } = await pool.query(
    `INSERT INTO cv_documents (user_id, title, content) VALUES ($1, $2, $3::jsonb)
     RETURNING ${CV_COLUMNS}`,
    [userId, cvTitle, JSON.stringify(content)]
  );

  return rows[0];
}

async function listCvs(userId) {
  const { rows } = await pool.query(
    `SELECT ${CV_COLUMNS} FROM cv_documents WHERE user_id = $1
     ORDER BY is_primary DESC, updated_at DESC, id DESC`,
    [userId]
  );
  return rows;
}

async function getCv(userId, cvId) {
  const { rows } = await pool.query(
    `SELECT ${CV_COLUMNS} FROM cv_documents WHERE id = $1 AND user_id = $2`,
    [cvId, userId]
  );
  return rows[0] || null;
}

async function updateCv(userId, cvId, fields) {
  const existing = await getCv(userId, cvId);
  if (!existing) return null;

  const columns = [];
  const values = [];

  for (const column of ['title', 'content', 'is_primary']) {
    if (fields[column] === undefined) continue;
    values.push(column === 'content' ? JSON.stringify(fields[column]) : fields[column]);
    columns.push(`${column} = $${values.length}${column === 'content' ? '::jsonb' : ''}`);
  }

  if (!columns.length) return existing;

  values.push(cvId, userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (fields.is_primary === true) {
      await client.query('UPDATE cv_documents SET is_primary = FALSE WHERE user_id = $1', [userId]);
    }
    const { rows } = await client.query(
      `UPDATE cv_documents SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING ${CV_COLUMNS}`,
      values
    );
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteCv(userId, cvId) {
  const { rowCount } = await pool.query(
    'DELETE FROM cv_documents WHERE id = $1 AND user_id = $2',
    [cvId, userId]
  );
  return rowCount > 0;
}

async function analyzeCv(userId, cvId, { target_role: targetRole }) {
  const cv = await getCv(userId, cvId);
  if (!cv) return null;

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are reviewing a CV before the user applies.`,
    user: `Target role: ${text(targetRole, 150) || 'not specified'}
CV content:
${JSON.stringify(cv.content, null, 2)}

Return JSON with exactly these keys:
{
  "score": 0-100 integer,
  "summary": "2-3 sentence honest review",
  "strengths": ["string"],
  "improvements": [{"area": "string", "recommendation": "specific change", "priority": "high|medium|low"}],
  "missing_keywords": ["keyword worth adding if true"],
  "ats_tips": ["string"]
}

Use 3-6 items per array. Never advise the user to invent experience or qualifications.`,
  });

  const feedback = {
    score: score(raw.score),
    summary: text(raw.summary, 2000),
    strengths: list(raw.strengths, (item) => text(item, 400), 6),
    improvements: list(
      raw.improvements,
      (item) => {
        const area = text(item?.area, 150);
        const recommendation = text(item?.recommendation, 600);
        if (!area || !recommendation) return null;
        const priority = text(item?.priority, 20).toLowerCase();
        return {
          area,
          recommendation,
          priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
        };
      },
      6
    ),
    missing_keywords: list(raw.missing_keywords, (item) => text(item, 100), 12),
    ats_tips: list(raw.ats_tips, (item) => text(item, 400), 6),
  };

  if (!feedback.summary) {
    throw incomplete('The AI returned incomplete CV feedback. Please try again.');
  }

  const saved = await aiAnalysesService.saveAnalysis(userId, {
    type: 'cv_analysis',
    model: aiService.getModelName(),
    payload: { cv_id: cv.id, ...feedback },
  });

  return { cv_id: cv.id, feedback, generated_at: saved?.created_at || null };
}

async function generateCoverLetter(userId, { opportunity_id: opportunityId, role, tone }) {
  const [context, opportunity, primaryCv] = await Promise.all([
    getFullContext(userId),
    opportunityId ? opportunitiesService.getOpportunityById(opportunityId) : Promise.resolve(null),
    pool
      .query(
        `SELECT content FROM cv_documents WHERE user_id = $1
         ORDER BY is_primary DESC, updated_at DESC LIMIT 1`,
        [userId]
      )
      .then((result) => result.rows[0] || null),
  ]);

  if (opportunityId && !opportunity) {
    throw ApiError.notFound(`Opportunity ${opportunityId} was not found`);
  }

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are writing a tailored cover letter.`,
    user: `Target role: ${text(role, 150) || opportunity?.title || 'entry-level role'}
Tone: ${text(tone, 60) || 'professional and warm'}
${opportunity ? `Opportunity details:\n${JSON.stringify({ title: opportunity.title, organisation: opportunity.organisation, description: opportunity.description, required_skills: opportunity.required_skills, eligibility: opportunity.eligibility }, null, 2)}` : ''}
${primaryCv ? `Latest CV:\n${JSON.stringify(primaryCv.content, null, 2)}` : ''}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "title": "short cover letter title",
  "content": "the full cover letter, 250-400 words, plain text with paragraphs"
}

Be specific to the opportunity. Never invent experience, qualifications, or contact details.`,
  });

  const content = text(raw.content, 8000);
  if (!content) {
    throw incomplete('The AI returned an empty cover letter. Please try again.');
  }

  const { rows } = await pool.query(
    `INSERT INTO cover_letters (user_id, opportunity_id, title, content)
     VALUES ($1, $2, $3, $4) RETURNING ${COVER_LETTER_COLUMNS}`,
    [userId, opportunityId ?? null, text(raw.title, 200) || 'Cover letter', content]
  );

  return rows[0];
}

async function listCoverLetters(userId) {
  const { rows } = await pool.query(
    `SELECT ${COVER_LETTER_COLUMNS} FROM cover_letters WHERE user_id = $1
     ORDER BY updated_at DESC, id DESC`,
    [userId]
  );
  return rows;
}

async function deleteCoverLetter(userId, coverLetterId) {
  const { rowCount } = await pool.query(
    'DELETE FROM cover_letters WHERE id = $1 AND user_id = $2',
    [coverLetterId, userId]
  );
  return rowCount > 0;
}

async function startInterview(userId, { role, interview_type: interviewType }) {
  const context = await aiCareerService.getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are preparing a realistic mock interview.`,
    user: `Role: ${role}
Interview type: ${interviewType}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "questions": [
    {"question": "string", "why": "what the interviewer is assessing", "hint": "a short hint, not a full answer"}
  ]
}

Create 6 questions suitable for this role and interview type. Use plain English and avoid trick questions.`,
  });

  const questions = list(
    raw.questions,
    (item) => {
      const question = text(item?.question, 500);
      if (!question) return null;
      return {
        question,
        why: text(item?.why, 300),
        hint: text(item?.hint, 300),
      };
    },
    8
  );

  if (!questions.length) {
    throw incomplete('The AI did not return interview questions. Please try again.');
  }

  const { rows } = await pool.query(
    `INSERT INTO mock_interviews (user_id, role, interview_type, questions)
     VALUES ($1, $2, $3, $4::jsonb) RETURNING ${INTERVIEW_COLUMNS}`,
    [userId, role, interviewType, JSON.stringify(questions)]
  );

  return { ...rows[0], answers: [] };
}

async function listInterviews(userId) {
  const { rows } = await pool.query(
    `SELECT i.id, i.role, i.interview_type, i.status, i.created_at, i.completed_at,
       (SELECT COUNT(*) FROM interview_answers a WHERE a.interview_id = i.id) AS answered_count,
       jsonb_array_length(i.questions) AS question_count
     FROM mock_interviews i WHERE i.user_id = $1
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId]
  );
  return rows.map((row) => ({
    ...row,
    answered_count: Number(row.answered_count),
    question_count: Number(row.question_count),
  }));
}

async function getInterview(userId, interviewId) {
  const { rows } = await pool.query(
    `SELECT ${INTERVIEW_COLUMNS} FROM mock_interviews WHERE id = $1 AND user_id = $2`,
    [interviewId, userId]
  );
  const interview = rows[0];
  if (!interview) return null;

  const { rows: answers } = await pool.query(
    `SELECT id, question_index, question, answer, feedback, score, created_at
     FROM interview_answers WHERE interview_id = $1 ORDER BY question_index ASC`,
    [interviewId]
  );

  return { ...interview, answers };
}

async function answerQuestion(userId, interviewId, { question_index: questionIndex, answer }) {
  const interview = await getInterview(userId, interviewId);
  if (!interview) return { status: 'not_found' };

  const questions = Array.isArray(interview.questions) ? interview.questions : [];
  const question = questions[questionIndex];
  if (!question) return { status: 'question_not_found' };

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are giving feedback on one mock interview answer.`,
    user: `Role: ${interview.role}
Interview type: ${interview.interview_type}
Question: ${question.question}
The interviewer is assessing: ${question.why || 'communication and fit'}

The candidate's answer:
${answer}

Return JSON with exactly these keys:
{
  "score": 0-100 integer,
  "summary": "2 sentence assessment",
  "strengths": ["what worked"],
  "improvements": ["what to change next time"],
  "model_answer": "a better example answer using only the candidate's own details",
  "tips": ["practical tip"]
}

Use 2-4 items per array. Be encouraging but honest. Never invent experience for the candidate.`,
  });

  const feedback = {
    score: score(raw.score),
    summary: text(raw.summary, 1200),
    strengths: list(raw.strengths, (item) => text(item, 400), 5),
    improvements: list(raw.improvements, (item) => text(item, 400), 5),
    model_answer: text(raw.model_answer, 2000),
    tips: list(raw.tips, (item) => text(item, 300), 5),
  };

  if (!feedback.summary) {
    throw incomplete('The AI returned incomplete interview feedback. Please try again.');
  }

  const { rows } = await pool.query(
    `INSERT INTO interview_answers (interview_id, question_index, question, answer, feedback, score)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     ON CONFLICT (interview_id, question_index) DO UPDATE
       SET answer = EXCLUDED.answer, feedback = EXCLUDED.feedback, score = EXCLUDED.score
     RETURNING id, question_index, question, answer, feedback, score, created_at`,
    [interviewId, questionIndex, question.question, answer, JSON.stringify(feedback), feedback.score]
  );

  return { status: 'ok', answer: rows[0], feedback };
}

async function completeInterview(userId, interviewId) {
  const interview = await getInterview(userId, interviewId);
  if (!interview) return null;

  const { rows } = await pool.query(
    `UPDATE mock_interviews SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 RETURNING ${INTERVIEW_COLUMNS}`,
    [interviewId, userId]
  );

  const scores = interview.answers.map((item) => item.score).filter((value) => value !== null);
  const average = scores.length
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : null;

  await notificationsService.notify(userId, {
    type: 'interview',
    title: 'Mock interview completed',
    body: average === null
      ? `Your ${interview.role} practice interview is complete.`
      : `Your ${interview.role} practice interview is complete with an average score of ${average}.`,
    link: '/career-studio',
  });

  return { ...rows[0], average_score: average, answered_count: interview.answers.length };
}

async function deleteInterview(userId, interviewId) {
  const { rowCount } = await pool.query(
    'DELETE FROM mock_interviews WHERE id = $1 AND user_id = $2',
    [interviewId, userId]
  );
  return rowCount > 0;
}

module.exports = {
  generateCv,
  listCvs,
  getCv,
  updateCv,
  deleteCv,
  analyzeCv,
  generateCoverLetter,
  listCoverLetters,
  deleteCoverLetter,
  startInterview,
  listInterviews,
  getInterview,
  answerQuestion,
  completeInterview,
  deleteInterview,
};
