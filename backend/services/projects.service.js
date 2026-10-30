// Practical projects: recommendations, submissions, AI evaluation, and the
// data used by the shareable digital portfolio.
const ApiError = require('../utils/ApiError');
const { pool } = require('../config/db');
const aiService = require('./ai.service');
const aiCareerService = require('./aiCareer.service');
const aiAnalysesService = require('./aiAnalyses.service');
const notificationsService = require('./notifications.service');

const SYSTEM_PROMPT = `You are SkillBridge AI, a practical career coach for young people in Zimbabwe.
Be specific, realistic, and encouraging. Never invent employers, salaries, or vacancies.
Return only a valid JSON object with exactly the keys requested.`;

const PROJECT_COLUMNS = `id, user_id, title, description, skills, status, repo_url, live_url,
  evidence, evaluation, score, submitted_at, completed_at, created_at, updated_at`;

const UPDATABLE_COLUMNS = [
  'title',
  'description',
  'skills',
  'status',
  'repo_url',
  'live_url',
  'evidence',
];

function text(value, max = 4000) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return text(JSON.stringify(value), max);
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function list(value, mapper, max = 8) {
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

async function listProjects(userId, filters) {
  const conditions = ['user_id = $1'];
  const values = [userId];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT ${PROJECT_COLUMNS} FROM projects WHERE ${conditions.join(' AND ')}
     ORDER BY CASE status WHEN 'in_progress' THEN 1 WHEN 'planned' THEN 2 ELSE 3 END,
     updated_at DESC, id DESC`,
    values
  );
  return rows;
}

async function getProject(userId, projectId) {
  const { rows } = await pool.query(
    `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return rows[0] || null;
}

async function createProject(userId, data) {
  const columns = ['user_id'];
  const values = [userId];

  for (const column of UPDATABLE_COLUMNS) {
    if (data[column] === undefined) continue;
    columns.push(column);
    values.push(data[column]);
  }

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const { rows } = await pool.query(
    `INSERT INTO projects (${columns.join(', ')}) VALUES (${placeholders})
     RETURNING ${PROJECT_COLUMNS}`,
    values
  );
  return rows[0];
}

async function updateProject(userId, projectId, fields) {
  const existing = await getProject(userId, projectId);
  if (!existing) return null;

  const columns = [];
  const values = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (fields[column] === undefined) continue;
    values.push(fields[column]);
    columns.push(`${column} = $${values.length}`);
  }

  const completedAt =
    fields.status === 'completed' && existing.status !== 'completed'
      ? ', completed_at = CURRENT_TIMESTAMP'
      : '';

  if (!columns.length) return existing;

  values.push(projectId, userId);
  const { rows } = await pool.query(
    `UPDATE projects SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP${completedAt}
     WHERE id = $${values.length - 1} AND user_id = $${values.length}
     RETURNING ${PROJECT_COLUMNS}`,
    values
  );

  const project = rows[0];
  if (fields.status === 'completed' && existing.status !== 'completed') {
    await notificationsService.notify(userId, {
      type: 'project',
      title: 'Project completed',
      body: `"${project.title}" is now part of your portfolio.`,
      link: '/projects',
    });
  }

  return project;
}

async function deleteProject(userId, projectId) {
  const { rowCount } = await pool.query(
    'DELETE FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return rowCount > 0;
}

async function submitProject(userId, projectId) {
  const existing = await getProject(userId, projectId);
  if (!existing) return null;

  const { rows } = await pool.query(
    `UPDATE projects SET submitted_at = CURRENT_TIMESTAMP,
       status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 RETURNING ${PROJECT_COLUMNS}`,
    [projectId, userId]
  );

  await notificationsService.notify(userId, {
    type: 'project',
    title: 'Project submitted',
    body: `"${existing.title}" was submitted. Run an AI evaluation to get feedback.`,
    link: '/projects',
  });

  return rows[0];
}

async function evaluateProject(userId, projectId) {
  const project = await getProject(userId, projectId);
  if (!project) return null;

  if (!project.evidence && !project.description && !project.repo_url && !project.live_url) {
    throw ApiError.badRequest(
      'Add a description, evidence, or a link before requesting an evaluation.'
    );
  }

  const context = await aiCareerService.getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are evaluating a practical project submission.`,
    user: `Project:
${JSON.stringify(
  {
    title: project.title,
    description: project.description,
    skills: project.skills,
    repo_url: project.repo_url,
    live_url: project.live_url,
    evidence: project.evidence,
  },
  null,
  2
)}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "score": 0-100 integer,
  "summary": "2-3 sentence assessment",
  "strengths": ["what the project demonstrates well"],
  "improvements": ["specific improvement"],
  "skills_demonstrated": ["skill"],
  "portfolio_ready": true or false,
  "next_steps": ["what to do next"]
}

Use 2-5 items per array. Judge only what is described; if evidence is missing, say so honestly.`,
  });

  const evaluation = {
    score: score(raw.score),
    summary: text(raw.summary, 2000),
    strengths: list(raw.strengths, (item) => text(item, 400), 6),
    improvements: list(raw.improvements, (item) => text(item, 400), 6),
    skills_demonstrated: list(raw.skills_demonstrated, (item) => text(item, 100), 12),
    portfolio_ready: Boolean(raw.portfolio_ready),
    next_steps: list(raw.next_steps, (item) => text(item, 400), 6),
  };

  if (!evaluation.summary) {
    throw incomplete('The AI returned an incomplete evaluation. Please try again.');
  }

  const { rows } = await pool.query(
    `UPDATE projects SET evaluation = $1::jsonb, score = $2,
       status = 'completed', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND user_id = $4 RETURNING ${PROJECT_COLUMNS}`,
    [JSON.stringify(evaluation), evaluation.score, projectId, userId]
  );

  await notificationsService.notify(userId, {
    type: 'project',
    title: 'Project evaluation ready',
    body: `Your project "${project.title}" scored ${evaluation.score ?? '—'}/100.`,
    link: '/projects',
  });

  return { project: rows[0], evaluation };
}

async function recommendations(userId, { career_goal_id: goalId, limit = 5 }) {
  const context = await aiCareerService.getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are recommending practical portfolio projects.`,
    user: `Maximum number of projects: ${limit}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "summary": "1-2 sentence overview",
  "projects": [
    {
      "title": "string",
      "description": "what to build and what it proves",
      "skills": ["skill"],
      "difficulty": "beginner|intermediate|advanced",
      "estimated_hours": integer,
      "steps": ["step"],
      "evidence_to_collect": ["what to save for the portfolio"]
    }
  ]
}

Recommend projects that can be completed with free tools and a modest data connection. Prefer projects relevant to entry-level roles in Zimbabwe or remote work.`,
  });

  const analysis = {
    summary: text(raw.summary, 1000),
    projects: list(
      raw.projects,
      (item) => {
        const title = text(item?.title, 200);
        if (!title) return null;
        const difficulty = text(item?.difficulty, 20).toLowerCase();
        return {
          title,
          description: text(item?.description, 900),
          skills: list(item?.skills, (skill) => text(skill, 100), 10),
          difficulty: ['beginner', 'intermediate', 'advanced'].includes(difficulty)
            ? difficulty
            : 'beginner',
          estimated_hours: Number.isFinite(Number(item?.estimated_hours))
            ? Math.max(1, Math.min(400, Math.round(Number(item.estimated_hours))))
            : null,
          steps: list(item?.steps, (step) => text(step, 300), 8),
          evidence_to_collect: list(item?.evidence_to_collect, (step) => text(step, 300), 8),
        };
      },
      limit
    ),
  };

  if (!analysis.projects.length) {
    throw incomplete('The AI did not return any project ideas. Please try again.');
  }

  const saved = await aiAnalysesService.saveAnalysis(userId, {
    type: 'project_recommendations',
    careerGoalId: goalId ?? null,
    model: aiService.getModelName(),
    payload: analysis,
  });

  return { analysis, generated_at: saved?.created_at || null };
}

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  submitProject,
  evaluateProject,
  recommendations,
};
