// AI career features: skills-gap analysis, roadmap generation, opportunity
// insights, and profile reviews. Each function builds a grounded prompt from
// the user's own profile/skills, asks OpenAI for JSON, then validates and
// normalises the result before it reaches the database or the browser.
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const aiService = require('./ai.service');
const profileService = require('./profile.service');
const userSkillsService = require('./userSkills.service');
const careerGoalsService = require('./careerGoals.service');
const roadmapsService = require('./roadmaps.service');
const opportunitiesService = require('./opportunities.service');

const SYSTEM_PROMPT = `You are SkillBridge AI, a practical career coach for young people in Zimbabwe.
Be realistic, specific, and encouraging. Use plain English. Do not promise jobs, scholarships, or admissions.
Never invent verified employers, salaries, deadlines, or vacancies. Return only a valid JSON object with the exact keys requested.`;

const PRIORITIES = ['high', 'medium', 'low'];
const FIT_LEVELS = ['strong', 'moderate', 'stretch'];

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

function list(value, mapper, max = 6) {
  if (!Array.isArray(value)) return [];

  return value.map(mapper).filter(Boolean).slice(0, max);
}

function enumValue(value, allowed, fallback) {
  const normalised = text(value, 30).toLowerCase();
  return allowed.includes(normalised) ? normalised : fallback;
}

async function getProfileContext(userId) {
  const [profileData, skills] = await Promise.all([
    profileService.getProfile(userId),
    userSkillsService.listUserSkills(userId),
  ]);

  if (!profileData) throw ApiError.notFound('Profile not found');

  return {
    profile: {
      education_level: profileData.profile.education_level,
      work_experience: profileData.profile.work_experience,
      career_interests: profileData.profile.career_interests,
      location: profileData.profile.location,
      learning_preferences: profileData.profile.learning_preferences,
    },
    skills: skills.map((skill) => ({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
    })),
  };
}

async function resolveGoal(userId, goalId) {
  if (goalId !== undefined && goalId !== null) {
    const goal = await careerGoalsService.getGoalById(userId, goalId);
    if (!goal) throw ApiError.notFound('That career goal was not found');
    return goal;
  }

  const activeGoals = await careerGoalsService.listGoals(userId, 'active');
  return activeGoals[0] || null;
}

function normaliseSkillsGap(raw, fallbackRole) {
  return {
    readiness_score: score(raw.readiness_score),
    target_role: text(raw.target_role, 150) || fallbackRole,
    summary: text(raw.summary, 2000),
    strengths: list(
      raw.strengths,
      (item) => {
        const skill = text(item?.skill, 100);
        return skill ? { skill, evidence: text(item?.evidence, 500) } : null;
      },
      8
    ),
    gaps: list(
      raw.gaps,
      (item) => {
        const skill = text(item?.skill, 100);
        if (!skill) return null;

        return {
          skill,
          priority: enumValue(item?.priority, PRIORITIES, 'medium'),
          why: text(item?.why, 500),
          how_to_close: text(item?.how_to_close, 700),
        };
      },
      8
    ),
    next_steps: list(
      raw.next_steps,
      (item) => {
        const action = text(item?.action, 500);
        return action
          ? {
              action,
              timeframe: text(item?.timeframe, 100),
              success_measure: text(item?.success_measure, 300),
            }
          : null;
      },
      6
    ),
    recommended_projects: list(
      raw.recommended_projects,
      (item) => {
        const title = text(item?.title, 150);
        return title
          ? { title, description: text(item?.description, 700) }
          : null;
      },
      6
    ),
  };
}

async function skillsGap(userId, { career_goal_id: goalId, target_role: targetRole }) {
  const [context, goal] = await Promise.all([
    getProfileContext(userId),
    resolveGoal(userId, goalId),
  ]);

  const role = text(targetRole, 150) || text(goal?.career_title, 150);

  if (!role) {
    throw ApiError.badRequest(
      'Set an active career goal or provide a target role before running an analysis.'
    );
  }

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are producing a skills-gap analysis.`,
    user: `Target role: ${role}
Career goal on the platform: ${goal?.career_title || 'not set'}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "readiness_score": 0-100 integer,
  "target_role": "string",
  "summary": "2-3 sentence honest summary",
  "strengths": [{"skill": "string", "evidence": "why this skill helps"}],
  "gaps": [{"skill": "string", "priority": "high|medium|low", "why": "why it matters", "how_to_close": "specific action"}],
  "next_steps": [{"action": "string", "timeframe": "e.g. 2 weeks", "success_measure": "how they know it is done"}],
  "recommended_projects": [{"title": "string", "description": "what to build and what it proves"}]
}

Use 3-5 items per array. Only reference skills the user actually has as strengths, and prioritise gaps for entry-level roles in Zimbabwe.`,
  });

  const analysis = normaliseSkillsGap(raw, role);

  if (!analysis.summary) {
    throw new ApiError(502, 'The AI returned an incomplete analysis. Please try again.', {
      code: 'AI_INVALID_RESPONSE',
    });
  }

  return {
    analysis,
    career_goal_id: goal?.id ?? null,
    target_role: role,
  };
}

function normaliseTask(task, index) {
  const title = text(task?.title, 200);
  if (!title) return null;

  return {
    title,
    description: text(task?.description, 5000) || null,
    skills_to_develop: text(task?.skills_to_develop, 500) || null,
    learning_activities: text(task?.learning_activities, 5000) || null,
    practical_project: text(task?.practical_project, 5000) || null,
    resources: text(task?.resources, 5000) || null,
    estimated_duration: text(task?.estimated_duration, 100) || null,
    sort_order: index,
    status: 'not_started',
  };
}

async function generateRoadmap(
  userId,
  { career_goal_id: goalId, timeframe_weeks: weeks = 12, hours_per_week: hours = 8, focus }
) {
  const [context, goal] = await Promise.all([
    getProfileContext(userId),
    resolveGoal(userId, goalId),
  ]);

  if (!goal || String(goal.id) !== String(goalId)) {
    throw ApiError.notFound('That career goal was not found');
  }

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are designing a learning roadmap.`,
    user: `Career goal: ${goal.career_title}
Available time: ${weeks} weeks at about ${hours} hours per week.
Extra focus from the user: ${text(focus, 300) || 'none'}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "title": "string, max 200 characters",
  "summary": "2-3 sentences describing the plan and the outcome",
  "tasks": [
    {
      "title": "string, max 200 characters",
      "description": "what to learn or do",
      "skills_to_develop": "comma-separated skills",
      "learning_activities": "specific activities, courses, or practice",
      "practical_project": "a concrete project that proves the skill",
      "resources": "well-known resource types or providers; do not invent URLs",
      "estimated_duration": "e.g. 2 weeks"
    }
  ]
}

Create 6-10 sequential tasks that fit the available time. Skip skills the user already has at advanced level. Make the tasks practical and suitable for the Zimbabwean entry-level job market.`,
  });

  const tasks = list(raw.tasks, normaliseTask, 12);

  if (!tasks.length) {
    throw new ApiError(502, 'The AI did not return any roadmap tasks. Please try again.', {
      code: 'AI_INVALID_RESPONSE',
    });
  }

  const result = await roadmapsService.createRoadmapWithTasks(
    userId,
    {
      title: text(raw.title, 200) || `${goal.career_title} roadmap`,
      summary:
        text(raw.summary, 5000) ||
        `A ${weeks}-week plan generated for ${goal.career_title}.`,
      career_goal_id: goal.id,
      status: 'active',
    },
    tasks
  );

  if (result.status === 'goal_not_found') {
    throw ApiError.notFound('That career goal was not found');
  }

  return {
    roadmap: result.roadmap,
    generated_tasks: tasks.length,
    timeframe_weeks: weeks,
    hours_per_week: hours,
  };
}

async function opportunityInsight(userId, { opportunity_id: opportunityId }) {
  const [context, opportunity] = await Promise.all([
    getProfileContext(userId),
    opportunitiesService.getOpportunityById(opportunityId),
  ]);

  if (!opportunity) {
    throw ApiError.notFound(`Opportunity ${opportunityId} was not found`);
  }

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are explaining how well an opportunity fits a candidate.`,
    user: `Opportunity:
${JSON.stringify(
  {
    title: opportunity.title,
    organisation: opportunity.organisation,
    type: opportunity.opportunity_type,
    description: opportunity.description,
    required_skills: opportunity.required_skills,
    location: opportunity.location,
    is_remote: opportunity.is_remote,
    eligibility: opportunity.eligibility,
  },
  null,
  2
)}

The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "fit_level": "strong|moderate|stretch",
  "summary": "2-3 sentences on fit and the main reason",
  "strengths": ["concrete strengths the user can show"],
  "gaps": ["skills or experience to address before applying"],
  "application_tips": ["specific, practical tips for this opportunity"],
  "questions_to_prepare": ["likely interview or application questions"]
}

Use 3-5 items per array. If the listing is missing details, say what the user should verify with the employer instead of inventing it.`,
  });

  const insight = {
    fit_level: enumValue(raw.fit_level, FIT_LEVELS, 'moderate'),
    summary: text(raw.summary, 2000),
    strengths: list(raw.strengths, (item) => text(item, 400), 6),
    gaps: list(raw.gaps, (item) => text(item, 400), 6),
    application_tips: list(raw.application_tips, (item) => text(item, 500), 6),
    questions_to_prepare: list(
      raw.questions_to_prepare,
      (item) => text(item, 400),
      6
    ),
  };

  if (!insight.summary) {
    throw new ApiError(502, 'The AI returned an incomplete insight. Please try again.', {
      code: 'AI_INVALID_RESPONSE',
    });
  }

  return {
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      organisation: opportunity.organisation,
      opportunity_type: opportunity.opportunity_type,
      application_url: opportunity.application_url,
      source_name: opportunity.source_name,
    },
    insight,
  };
}

async function profileReview(userId) {
  const context = await getProfileContext(userId);

  const raw = await aiService.generateJson({
    system: `${SYSTEM_PROMPT} You are reviewing a candidate profile before they apply for roles.`,
    user: `The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Return JSON with exactly these keys:
{
  "completeness_score": 0-100 integer,
  "summary": "2-3 sentence honest review",
  "strengths": ["what already stands out"],
  "improvements": [{"area": "string", "recommendation": "specific action", "priority": "high|medium|low"}],
  "suggested_headline": "a short professional headline",
  "suggested_about": "a 3-5 sentence profile summary written in first person"
}

Use 3-5 items per array. Base every comment on the supplied profile; do not invent qualifications or experience.`,
  });

  const review = {
    completeness_score: score(raw.completeness_score),
    summary: text(raw.summary, 2000),
    strengths: list(raw.strengths, (item) => text(item, 400), 6),
    improvements: list(
      raw.improvements,
      (item) => {
        const area = text(item?.area, 150);
        const recommendation = text(item?.recommendation, 600);
        if (!area || !recommendation) return null;

        return {
          area,
          recommendation,
          priority: enumValue(item?.priority, PRIORITIES, 'medium'),
        };
      },
      6
    ),
    suggested_headline: text(raw.suggested_headline, 200),
    suggested_about: text(raw.suggested_about, 2000),
  };

  if (!review.summary) {
    throw new ApiError(502, 'The AI returned an incomplete review. Please try again.', {
      code: 'AI_INVALID_RESPONSE',
    });
  }

  return { review, model: env.openai.model };
}

module.exports = {
  skillsGap,
  generateRoadmap,
  opportunityInsight,
  profileReview,
};
