// AI Career Intelligence: personal assessments, career recommendations,
// path comparisons, and requirements/progression guidance. Every result is
// grounded in the user's real profile and saved so it can be revisited.
const ApiError = require('../utils/ApiError');
const aiService = require('./ai.service');
const aiCareerService = require('./aiCareer.service');
const aiAnalysesService = require('./aiAnalyses.service');
const { pool } = require('../config/db');

const SYSTEM_PROMPT = `You are SkillBridge AI, a practical career coach for young people in Zimbabwe.
Be realistic, specific, and encouraging. Use plain English. Never promise jobs, scholarships, admissions, salaries, or demand that you cannot verify.
Return only a valid JSON object with exactly the keys requested.`;

const PRIORITIES = ['high', 'medium', 'low'];

function text(value, max = 2000) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return text(JSON.stringify(value), max);
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function score(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function list(value, mapper, max = 8) {
  if (!Array.isArray(value)) return [];
  return value.map(mapper).filter(Boolean).slice(0, max);
}

function enumValue(value, allowed, fallback) {
  const normalised = text(value, 30).toLowerCase();
  return allowed.includes(normalised) ? normalised : fallback;
}

function incomplete(message) {
  return new ApiError(502, message, { code: 'AI_INVALID_RESPONSE' });
}

function mapAssessment(row) {
  if (!row) return null;
  return {
    id: row.id,
    answers: row.answers,
    result: row.result,
    model: row.model,
    created_at: row.created_at,
  };
}

async function runAssessment(userId, { answers }) {
  const context = await aiCareerService.getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are interpreting a career-interest assessment.`,
    user: `Assessment answers:
${JSON.stringify(answers, null, 2)}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "summary": "2-3 sentence interpretation of the person's strengths and direction",
  "work_style": "one short paragraph on how they seem to work best",
  "top_careers": [{"title": "string", "fit_score": 0-100 integer, "why": "why it fits", "key_skills": ["skill"]}],
  "strengths": ["concrete strength"],
  "watch_outs": ["honest thing to work on"],
  "recommended_next_steps": [{"action": "string", "timeframe": "e.g. 2 weeks"}],
  "suggested_career_goal": "one role title to save as a goal"
}

Use 3-5 careers and 3-5 items in each array. Only use evidence from the answers and profile.`,
  });

  const result = {
    summary: text(raw.summary, 2000),
    work_style: text(raw.work_style, 1000),
    top_careers: list(
      raw.top_careers,
      (item) => {
        const title = text(item?.title, 150);
        if (!title) return null;
        return {
          title,
          fit_score: score(item?.fit_score),
          why: text(item?.why, 600),
          key_skills: list(item?.key_skills, (skill) => text(skill, 100), 8),
        };
      },
      5
    ),
    strengths: list(raw.strengths, (item) => text(item, 300), 6),
    watch_outs: list(raw.watch_outs, (item) => text(item, 300), 6),
    recommended_next_steps: list(
      raw.recommended_next_steps,
      (item) => {
        const action = text(item?.action, 500);
        return action ? { action, timeframe: text(item?.timeframe, 100) } : null;
      },
      6
    ),
    suggested_career_goal: text(raw.suggested_career_goal, 150),
  };

  if (!result.summary || !result.top_careers.length) {
    throw incomplete('The AI returned an incomplete assessment. Please try again.');
  }

  const { rows } = await pool.query(
    `INSERT INTO career_assessments (user_id, answers, result, model)
     VALUES ($1, $2::jsonb, $3::jsonb, $4)
     RETURNING id, answers, result, model, created_at`,
    [userId, JSON.stringify(answers), JSON.stringify(result), aiService.getModelName()]
  );

  return mapAssessment(rows[0]);
}

async function latestAssessment(userId) {
  const { rows } = await pool.query(
    `SELECT id, answers, result, model, created_at FROM career_assessments
     WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [userId]
  );
  return mapAssessment(rows[0]);
}

async function recommendations(userId, { career_goal_id: goalId, interests, limit = 5 }) {
  const context = await aiCareerService.getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are recommending realistic career paths.`,
    user: `Extra interests from the user: ${text(interests, 500) || 'none'}
Maximum number of recommendations: ${limit}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "summary": "2-3 sentence overview of the recommendations",
  "recommendations": [
    {
      "title": "role title",
      "fit_score": 0-100 integer,
      "why": "why it fits this person",
      "entry_path": "realistic first step in Zimbabwe",
      "core_skills": ["skill"],
      "skills_to_build": ["skill"],
      "progression": ["junior role", "mid role", "senior role"]
    }
  ]
}

Only recommend roles that exist in the local or remote entry-level market. Do not invent salaries.`,
  });

  const analysis = {
    summary: text(raw.summary, 2000),
    recommendations: list(
      raw.recommendations,
      (item) => {
        const title = text(item?.title, 150);
        if (!title) return null;
        return {
          title,
          fit_score: score(item?.fit_score),
          why: text(item?.why, 700),
          entry_path: text(item?.entry_path, 700),
          core_skills: list(item?.core_skills, (skill) => text(skill, 100), 8),
          skills_to_build: list(item?.skills_to_build, (skill) => text(skill, 100), 8),
          progression: list(item?.progression, (step) => text(step, 150), 6),
        };
      },
      limit
    ),
  };

  if (!analysis.recommendations.length) {
    throw incomplete('The AI did not return any career recommendations. Please try again.');
  }

  const saved = await aiAnalysesService.saveAnalysis(userId, {
    type: 'career_recommendations',
    careerGoalId: goalId ?? null,
    model: aiService.getModelName(),
    payload: analysis,
  });

  return { analysis, generated_at: saved?.created_at || null };
}

async function latestRecommendations(userId) {
  const latest = await aiAnalysesService.getLatestAnalysis(userId, 'career_recommendations');
  return { analysis: latest?.payload || null, generated_at: latest?.created_at || null };
}

async function comparePaths(userId, { path_a: pathA, path_b: pathB, focus }) {
  const context = await aiCareerService.getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are comparing two career paths for one person.`,
    user: `Career path A: ${pathA}
Career path B: ${pathB}
What the user cares about most: ${text(focus, 300) || 'not specified'}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "summary": "2-3 sentence verdict",
  "paths": [
    {
      "title": "path name",
      "fit_score": 0-100 integer,
      "entry_difficulty": "low|medium|high",
      "time_to_readiness": "e.g. 6-12 months",
      "core_skills": ["skill"],
      "progression": ["first role", "next role", "later role"],
      "pros": ["string"],
      "cons": ["string"]
    }
  ],
  "shared_skills": ["skills useful in both paths"],
  "decision_tips": ["practical way to test each path"]
}

Exactly two entries in "paths". Be honest about difficulty and do not invent salaries or demand statistics.`,
  });

  const analysis = {
    summary: text(raw.summary, 2000),
    paths: list(
      raw.paths,
      (item) => {
        const title = text(item?.title, 150);
        if (!title) return null;
        return {
          title,
          fit_score: score(item?.fit_score),
          entry_difficulty: enumValue(item?.entry_difficulty, ['low', 'medium', 'high'], 'medium'),
          time_to_readiness: text(item?.time_to_readiness, 100),
          core_skills: list(item?.core_skills, (skill) => text(skill, 100), 8),
          progression: list(item?.progression, (step) => text(step, 150), 6),
          pros: list(item?.pros, (item) => text(item, 300), 6),
          cons: list(item?.cons, (item) => text(item, 300), 6),
        };
      },
      2
    ),
    shared_skills: list(raw.shared_skills, (item) => text(item, 100), 10),
    decision_tips: list(raw.decision_tips, (item) => text(item, 400), 6),
  };

  if (analysis.paths.length !== 2) {
    throw incomplete('The AI returned an incomplete comparison. Please try again.');
  }

  const saved = await aiAnalysesService.saveAnalysis(userId, {
    type: 'career_comparison',
    model: aiService.getModelName(),
    payload: analysis,
  });

  return { analysis, generated_at: saved?.created_at || null };
}

async function latestComparison(userId) {
  const latest = await aiAnalysesService.getLatestAnalysis(userId, 'career_comparison');
  return { analysis: latest?.payload || null, generated_at: latest?.created_at || null };
}

async function requirements(userId, { role }) {
  const context = await aiCareerService.getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are explaining what a role requires and how it progresses.`,
    user: `Target role: ${role}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "role": "string",
  "summary": "2-3 sentence overview of the role",
  "requirements": [{"area": "string", "detail": "string", "priority": "high|medium|low"}],
  "qualifications": ["realistic qualification or certification"],
  "tools": ["tool or technology"],
  "experience": ["type of experience that helps"],
  "progression": [{"level": "e.g. Junior", "title": "job title", "typical_focus": "string", "next_step": "string"}],
  "market_notes": "honest local/remote context without invented statistics"
}

Use 3-6 items per array. Do not invent specific employers, salaries, or vacancy numbers.`,
  });

  const analysis = {
    role: text(raw.role, 150) || role,
    summary: text(raw.summary, 2000),
    requirements: list(
      raw.requirements,
      (item) => {
        const area = text(item?.area, 150);
        if (!area) return null;
        return {
          area,
          detail: text(item?.detail, 600),
          priority: enumValue(item?.priority, PRIORITIES, 'medium'),
        };
      },
      6
    ),
    qualifications: list(raw.qualifications, (item) => text(item, 200), 6),
    tools: list(raw.tools, (item) => text(item, 150), 8),
    experience: list(raw.experience, (item) => text(item, 300), 6),
    progression: list(
      raw.progression,
      (item) => {
        const level = text(item?.level, 100);
        if (!level) return null;
        return {
          level,
          title: text(item?.title, 150),
          typical_focus: text(item?.typical_focus, 400),
          next_step: text(item?.next_step, 400),
        };
      },
      6
    ),
    market_notes: text(raw.market_notes, 1000),
  };

  if (!analysis.summary) {
    throw incomplete('The AI returned incomplete role requirements. Please try again.');
  }

  const saved = await aiAnalysesService.saveAnalysis(userId, {
    type: 'career_requirements',
    model: aiService.getModelName(),
    payload: analysis,
  });

  return { analysis, generated_at: saved?.created_at || null };
}

async function latestRequirements(userId) {
  const latest = await aiAnalysesService.getLatestAnalysis(userId, 'career_requirements');
  return { analysis: latest?.payload || null, generated_at: latest?.created_at || null };
}

module.exports = {
  runAssessment,
  latestAssessment,
  recommendations,
  latestRecommendations,
  comparePaths,
  latestComparison,
  requirements,
  latestRequirements,
};
