// Imports real opportunities from public APIs. Records are upserted using
// (source_name, external_id), so running a sync repeatedly never duplicates
// listings. Nothing is invented: every stored record keeps its source and
// application link.
const { pool } = require('../config/db');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const REQUEST_TIMEOUT_MS = 20000;
const DESCRIPTION_LIMIT = 5000;

const COLUMNS = [
  'title',
  'organisation',
  'description',
  'opportunity_type',
  'required_skills',
  'location',
  'is_remote',
  'eligibility',
  'application_deadline',
  'application_url',
  'source_name',
  'external_id',
  'last_synced_at',
  'is_active',
];

function truncate(value, max) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}

function stripHtml(value) {
  if (!value) return '';

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toDate(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function namesOf(value) {
  if (!Array.isArray(value)) return '';

  return value
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
    .join(', ');
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SkillBridgeAI/1.0',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchReliefWeb() {
  const body = {
    profile: 'list',
    preset: 'latest',
    limit: 100,
    filter: { field: 'country', value: 'Zimbabwe' },
    fields: {
      include: [
        'title',
        'url',
        'source',
        'date',
        'body',
        'city',
        'country',
        'experience',
        'career_categories',
      ],
    },
  };

  const url = `https://api.reliefweb.int/v2/jobs?appname=${encodeURIComponent(
    env.opportunitySync.reliefwebAppName
  )}`;

  const payload = await requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return (payload.data || []).map((item) => {
    const fields = item.fields || {};
    const description = stripHtml(fields.body);
    const sourceName =
      namesOf(fields.source) || fields.source?.[0]?.shortname || 'ReliefWeb';
    const location =
      namesOf(fields.city) || namesOf(fields.country) || 'Zimbabwe';
    const remote = /remote|home[- ]based|telework|work from home/i.test(
      `${fields.title || ''} ${description}`
    );

    return {
      title: truncate(fields.title, 200) || 'Untitled role',
      organisation: truncate(sourceName, 150),
      description: truncate(description, DESCRIPTION_LIMIT),
      opportunity_type: 'job',
      required_skills: truncate(namesOf(fields.career_categories), 500),
      location: truncate(location, 150),
      is_remote: remote ? 1 : 0,
      eligibility: truncate(namesOf(fields.experience), 2000),
      application_deadline: toDate(fields.date?.closing),
      application_url:
        fields.url || `https://reliefweb.int/job/${encodeURIComponent(item.id)}`,
      source_name: 'ReliefWeb',
      external_id: `reliefweb:${item.id}`,
    };
  });
}

async function fetchRemotive() {
  const payload = await requestJson(
    'https://remotive.com/api/remote-jobs?limit=100'
  );

  const relevant = /worldwide|anywhere|africa|zimbabwe|emea|remote/i;

  return (payload.jobs || [])
    .filter((job) => {
      const location = String(job.candidate_required_location || '').trim();
      return !location || relevant.test(location);
    })
    .map((job) => ({
      title: truncate(job.title, 200) || 'Untitled role',
      organisation: truncate(job.company_name, 150),
      description: truncate(stripHtml(job.description), DESCRIPTION_LIMIT),
      opportunity_type: 'job',
      required_skills: truncate(
        Array.isArray(job.tags) ? job.tags.join(', ') : '',
        500
      ),
      location: truncate(
        job.candidate_required_location || 'Remote',
        150
      ),
      is_remote: 1,
      eligibility: truncate(job.job_type, 2000),
      application_deadline: null,
      application_url: job.url,
      source_name: 'Remotive',
      external_id: `remotive:${job.id}`,
    }));
}

async function upsertOpportunities(items, runAt) {
  let saved = 0;
  const inserted = [];

  for (const item of items) {
    const values = COLUMNS.map((column) => {
      if (column === 'is_active') return item.is_active ?? true;
      if (column === 'is_remote') return Boolean(item.is_remote);
      if (column === 'last_synced_at') return item.last_synced_at ?? runAt;
      return item[column] ?? null;
    });
    const updateClause = COLUMNS.filter(
      (column) => !['source_name', 'external_id'].includes(column)
    )
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(', ');

    const { rows } = await pool.query(
      `INSERT INTO opportunities (${COLUMNS.join(', ')})
       VALUES (${COLUMNS.map((_, index) => `$${index + 1}`).join(', ')})
       ON CONFLICT (source_name, external_id) DO UPDATE SET ${updateClause}
       RETURNING id, title, organisation, required_skills, (xmax = 0) AS inserted`,
      values
    );

    if (rows[0]?.inserted) inserted.push(rows[0]);
    saved += 1;
  }

  return { saved, inserted };
}

function normalizeSkill(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9+#.]/g, '');
}

function parseRequiredSkills(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;|\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

// Tell learners about newly imported opportunities that match skills they
// already have. Notifications are best-effort and never fail the sync.
async function notifyMatchingUsers(inserted) {
  if (!inserted.length) return 0;

  try {
    const { rows } = await pool.query(
      `SELECT us.user_id, s.name FROM user_skills us
       JOIN skills s ON s.id = us.skill_id`
    );

    if (!rows.length) return 0;

    const byUser = new Map();
    for (const row of rows) {
      if (!byUser.has(row.user_id)) byUser.set(row.user_id, new Set());
      byUser.get(row.user_id).add(normalizeSkill(row.name));
    }

    const notificationsService = require('./notifications.service');
    let sent = 0;

    for (const opportunity of inserted) {
      const required = parseRequiredSkills(opportunity.required_skills)
        .map(normalizeSkill)
        .filter(Boolean);
      if (!required.length) continue;

      const matchedUsers = [];
      for (const [userId, skills] of byUser.entries()) {
        if (required.some((skill) => skills.has(skill))) matchedUsers.push(userId);
      }

      sent += await notificationsService.notifyMany(matchedUsers, {
        type: 'opportunity',
        title: `New opportunity: ${opportunity.title}`,
        body: opportunity.organisation
          ? `${opportunity.organisation} posted a role that matches your skills.`
          : 'A new listing matches skills on your profile.',
        link: '/opportunities',
      });
    }

    return sent;
  } catch (err) {
    console.error('[sync] could not create opportunity notifications:', err.message);
    return 0;
  }
}

let activeSync = null;

async function runSync() {
  const runAt = new Date();
  runAt.setMilliseconds(0);
  const sources = [];
  const errors = [];
  let totalSaved = 0;

  const providers = [{ name: 'Remotive', fetcher: fetchRemotive }];

  if (env.opportunitySync.reliefwebAppName) {
    providers.unshift({ name: 'ReliefWeb', fetcher: fetchReliefWeb });
  } else {
    console.warn(
      '[sync] ReliefWeb skipped: set RELIEFWEB_APP_NAME to an approved appname from https://apidoc.reliefweb.int/parameters#appname'
    );
  }

  for (const provider of providers) {
    try {
      const items = await provider.fetcher();

      if (!items.length) {
        sources.push({
          name: provider.name,
          fetched: 0,
          saved: 0,
          deactivated: 0,
        });
        continue;
      }

      const result = await upsertOpportunities(items, runAt);
      const deactivateResult = await pool.query(
        `UPDATE opportunities
         SET is_active = FALSE
         WHERE source_name = $1
           AND external_id IS NOT NULL
           AND (last_synced_at IS NULL OR last_synced_at < $2)`,
        [provider.name, runAt]
      );

      const notified = await notifyMatchingUsers(result.inserted);

      totalSaved += result.saved;
      sources.push({
        name: provider.name,
        fetched: items.length,
        saved: result.saved,
        notified,
        deactivated: deactivateResult.rowCount,
      });
    } catch (err) {
      console.error(`[sync] ${provider.name} failed:`, err.message);
      errors.push({ source: provider.name, message: err.message });
    }
  }

  if (!sources.length) {
    throw new ApiError(
      502,
      'Opportunity sync failed for every source. Check the server logs.',
      { code: 'SYNC_FAILED', details: errors }
    );
  }

  return {
    run_at: runAt.toISOString(),
    total_saved: totalSaved,
    sources,
    errors,
  };
}

function syncOpportunities() {
  if (activeSync) return activeSync;

  activeSync = runSync().finally(() => {
    activeSync = null;
  });

  return activeSync;
}

module.exports = { syncOpportunities };
