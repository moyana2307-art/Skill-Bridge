// Employability analytics. Everything is derived from the user's real data,
// then stored as one snapshot per day so the dashboard can show a trend.
const { pool } = require('../config/db');
const aiAnalysesService = require('./aiAnalyses.service');

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getSkillsBreakdown(userId) {
  const { rows } = await pool.query(
    `SELECT us.proficiency, COUNT(*) AS count FROM user_skills us
     WHERE us.user_id = $1 GROUP BY us.proficiency`,
    [userId]
  );
  const byLevel = { beginner: 0, intermediate: 0, advanced: 0 };
  let total = 0;

  for (const row of rows) {
    const count = Number(row.count);
    total += count;
    if (byLevel[row.proficiency] !== undefined) byLevel[row.proficiency] = count;
  }

  return { total, by_level: byLevel };
}

async function getRoadmapBreakdown(userId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(DISTINCT r.id) AS total_roadmaps,
       COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed') AS completed_roadmaps,
       COUNT(t.id) AS total_tasks,
       COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
       COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_tasks
     FROM learning_roadmaps r LEFT JOIN roadmap_tasks t ON t.roadmap_id = r.id
     WHERE r.user_id = $1`,
    [userId]
  );
  const row = rows[0];
  const totalTasks = Number(row.total_tasks);

  return {
    total: Number(row.total_roadmaps),
    completed: Number(row.completed_roadmaps),
    total_tasks: totalTasks,
    completed_tasks: Number(row.completed_tasks),
    in_progress_tasks: Number(row.in_progress_tasks),
    progress_percent: percent(Number(row.completed_tasks), totalTasks),
  };
}

async function getProjectBreakdown(userId) {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*) AS count, AVG(score) FILTER (WHERE score IS NOT NULL) AS avg_score
     FROM projects WHERE user_id = $1 GROUP BY status`,
    [userId]
  );
  const byStatus = { planned: 0, in_progress: 0, completed: 0 };
  let total = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  for (const row of rows) {
    const count = Number(row.count);
    total += count;
    if (byStatus[row.status] !== undefined) byStatus[row.status] = count;
    if (row.avg_score !== null) {
      scoreSum += Number(row.avg_score) * count;
      scoreCount += count;
    }
  }

  return {
    total,
    by_status: byStatus,
    average_score: scoreCount ? Math.round(scoreSum / scoreCount) : null,
  };
}

async function getApplicationBreakdown(userId) {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*) AS count FROM applications WHERE user_id = $1 GROUP BY status`,
    [userId]
  );
  const byStatus = {};
  let total = 0;

  for (const row of rows) {
    const count = Number(row.count);
    total += count;
    byStatus[row.status] = count;
  }

  return {
    total,
    by_status: byStatus,
    active: (byStatus.applied || 0) + (byStatus.interviewing || 0),
    offers: byStatus.offer || 0,
  };
}

async function getInterviewBreakdown(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       AVG((SELECT AVG(a.score) FROM interview_answers a WHERE a.interview_id = i.id)) AS avg_score
     FROM mock_interviews i WHERE i.user_id = $1`,
    [userId]
  );
  const row = rows[0];
  return {
    total: Number(row.total),
    completed: Number(row.completed),
    average_score: row.avg_score === null ? null : Math.round(Number(row.avg_score)),
  };
}

function profileCompleteness(profile) {
  const fields = [
    profile?.name,
    profile?.education_level,
    profile?.work_experience,
    profile?.career_interests,
    profile?.location,
    profile?.learning_preferences,
  ];
  const filled = fields.filter((value) => value && String(value).trim()).length;
  return Math.round((filled / fields.length) * 100);
}

function buildScore({ profileScore, skills, roadmaps, projects, applications, interviews, skillsGap }) {
  const profilePart = (profileScore / 100) * 15;
  const skillsPart = Math.min(skills.total / 10, 1) * 15;
  const roadmapPart = (roadmaps.progress_percent / 100) * 25;
  const projectPart = Math.min(projects.by_status.completed / 3, 1) * 20;
  const applicationPart = Math.min(applications.active / 3, 1) * 15;
  const interviewPart = Math.min(interviews.completed / 1, 1) * 10;

  const total = Math.round(
    clamp(profilePart + skillsPart + roadmapPart + projectPart + applicationPart + interviewPart)
  );

  const breakdown = [
    { area: 'Profile completeness', score: Math.round(profilePart), max: 15, value: `${profileScore}%` },
    { area: 'Skills breadth', score: Math.round(skillsPart), max: 15, value: `${skills.total} skills` },
    { area: 'Roadmap progress', score: Math.round(roadmapPart), max: 25, value: `${roadmaps.progress_percent}%` },
    { area: 'Completed projects', score: Math.round(projectPart), max: 20, value: `${projects.by_status.completed} completed` },
    { area: 'Active applications', score: Math.round(applicationPart), max: 15, value: `${applications.active} active` },
    { area: 'Mock interviews', score: Math.round(interviewPart), max: 10, value: `${interviews.completed} completed` },
  ];

  const suggestions = [];

  if (profileScore < 80) suggestions.push('Complete the remaining profile fields so recommendations are more accurate.');
  if (skills.total < 5) suggestions.push('Add at least five skills to improve opportunity matching.');
  if (roadmaps.progress_percent < 50) suggestions.push('Finish a few roadmap tasks to show consistent progress.');
  if (projects.by_status.completed < 2) suggestions.push('Complete two portfolio projects with evidence links.');
  if (applications.active < 2) suggestions.push('Track at least two live applications and their deadlines.');
  if (!interviews.completed) suggestions.push('Run one mock interview to practise your answers.');

  return {
    readiness_score: total,
    readiness_label:
      total >= 80 ? 'Strong' : total >= 60 ? 'Developing well' : total >= 40 ? 'Building' : 'Getting started',
    breakdown,
    suggestions: suggestions.slice(0, 5),
    skills_gap_readiness: skillsGap?.readiness_score ?? null,
  };
}

async function getSnapshotTrend(userId, limit = 14) {
  const { rows } = await pool.query(
    `SELECT snapshot_date, readiness_score FROM employability_snapshots
     WHERE user_id = $1 ORDER BY snapshot_date DESC LIMIT $2`,
    [userId, limit]
  );
  return rows
    .map((row) => ({
      date: row.snapshot_date instanceof Date
        ? row.snapshot_date.toISOString().slice(0, 10)
        : String(row.snapshot_date).slice(0, 10),
      readiness_score: row.readiness_score,
    }))
    .reverse();
}

async function getEmployability(userId) {
  const { rows: profileRows } = await pool.query(
    `SELECT u.name, p.education_level, p.work_experience, p.career_interests,
       p.location, p.learning_preferences
     FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId]
  );
  const profile = profileRows[0] || {};

  const [skills, roadmaps, projects, applications, interviews, skillsGap] = await Promise.all([
    getSkillsBreakdown(userId),
    getRoadmapBreakdown(userId),
    getProjectBreakdown(userId),
    getApplicationBreakdown(userId),
    getInterviewBreakdown(userId),
    aiAnalysesService.getLatestAnalysis(userId, 'skills_gap'),
  ]);

  const profileScore = profileCompleteness(profile);
  const score = buildScore({
    profileScore,
    skills,
    roadmaps,
    projects,
    applications,
    interviews,
    skillsGap: skillsGap?.payload,
  });

  const payload = {
    ...score,
    profile_completeness: profileScore,
    skills,
    roadmaps,
    projects,
    applications,
    interviews,
  };

  await pool.query(
    `INSERT INTO employability_snapshots (user_id, snapshot_date, readiness_score, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (user_id, snapshot_date)
     DO UPDATE SET readiness_score = EXCLUDED.readiness_score, payload = EXCLUDED.payload`,
    [userId, todayIso(), score.readiness_score, JSON.stringify(payload)]
  );

  const trend = await getSnapshotTrend(userId);

  return { ...payload, trend };
}

module.exports = { getEmployability };
