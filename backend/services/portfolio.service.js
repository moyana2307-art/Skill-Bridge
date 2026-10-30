// Shareable digital portfolio settings and the public portfolio payload.
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])?$/;

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toAvatar(avatarData, avatarMime) {
  if (!avatarData || !avatarMime) return null;
  return `data:${avatarMime};base64,${Buffer.from(avatarData).toString('base64')}`;
}

async function getSettings(userId) {
  const { rows } = await pool.query(
    `SELECT u.name, u.created_at, p.portfolio_slug, p.portfolio_headline,
       p.portfolio_about, p.portfolio_public, p.location
     FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function ensureUniqueSlug(userId, slug) {
  const { rows } = await pool.query(
    'SELECT user_id FROM user_profiles WHERE portfolio_slug = $1 AND user_id <> $2',
    [slug, userId]
  );
  if (rows.length) {
    throw ApiError.conflict('That portfolio link is already taken. Try another one.');
  }
}

async function updateSettings(userId, fields) {
  const current = await getSettings(userId);
  if (!current) throw ApiError.notFound('Profile not found');

  let slug = fields.portfolio_slug;
  if (slug !== undefined && slug !== null) {
    slug = toSlug(slug);
    if (!SLUG_PATTERN.test(slug) || slug.length < 3) {
      throw ApiError.validation('Use 3-80 letters, numbers, or dashes for the portfolio link.');
    }
    await ensureUniqueSlug(userId, slug);
    fields = { ...fields, portfolio_slug: slug };
  }

  if (fields.portfolio_public === true && !slug && !current.portfolio_slug) {
    const base = toSlug(current.name) || 'portfolio';
    slug = `${base}-${userId}`.slice(0, 80);
    await ensureUniqueSlug(userId, slug);
    fields = { ...fields, portfolio_slug: slug };
  }

  const columns = [];
  const values = [];

  for (const column of ['portfolio_slug', 'portfolio_headline', 'portfolio_about', 'portfolio_public']) {
    if (fields[column] === undefined) continue;
    values.push(column === 'portfolio_slug' ? slug : fields[column]);
    columns.push(`${column} = $${values.length}`);
  }

  if (columns.length) {
    values.push(userId);
    await pool.query(
      `INSERT INTO user_profiles (user_id, ${columns.map((column) => column.split(' = ')[0]).join(', ')})
       VALUES ($${values.length}, ${columns.map((_, index) => `$${index + 1}`).join(', ')})
       ON CONFLICT (user_id) DO UPDATE SET ${columns.join(', ')}`,
      values
    );
  }

  return getSettings(userId);
}

async function getPublicPortfolio(slug) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.created_at, p.portfolio_slug, p.portfolio_headline,
       p.portfolio_about, p.location, p.avatar_data, p.avatar_mime, p.education_level
     FROM users u JOIN user_profiles p ON p.user_id = u.id
     WHERE p.portfolio_slug = $1 AND p.portfolio_public = TRUE`,
    [slug]
  );

  const profile = rows[0];
  if (!profile) return null;

  const [skillsResult, projectsResult, goalsResult, roadmapsResult] = await Promise.all([
    pool.query(
      `SELECT s.name, s.category, us.proficiency FROM user_skills us
       JOIN skills s ON s.id = us.skill_id WHERE us.user_id = $1
       ORDER BY s.name ASC`,
      [profile.id]
    ),
    pool.query(
      `SELECT id, title, description, skills, status, repo_url, live_url, score,
         evaluation, completed_at
       FROM projects WHERE user_id = $1 ORDER BY
         CASE status WHEN 'completed' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
         updated_at DESC`,
      [profile.id]
    ),
    pool.query(
      `SELECT career_title, status FROM career_goals WHERE user_id = $1
       ORDER BY CASE status WHEN 'active' THEN 1 ELSE 2 END, updated_at DESC LIMIT 3`,
      [profile.id]
    ),
    pool.query(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM learning_roadmaps WHERE user_id = $1`,
      [profile.id]
    ),
  ]);

  return {
    name: profile.name,
    headline: profile.portfolio_headline,
    about: profile.portfolio_about,
    location: profile.location,
    education_level: profile.education_level,
    avatar: toAvatar(profile.avatar_data, profile.avatar_mime),
    slug: profile.portfolio_slug,
    joined_at: profile.created_at,
    skills: skillsResult.rows,
    projects: projectsResult.rows,
    goals: goalsResult.rows,
    roadmaps: {
      total: Number(roadmapsResult.rows[0].total),
      completed: Number(roadmapsResult.rows[0].completed),
    },
  };
}

module.exports = { getSettings, updateSettings, getPublicPortfolio, toSlug };
