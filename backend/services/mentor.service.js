// AI Career Mentor: persistent conversations with a career coach that is
// grounded in the user's own profile, skills, and goals.
const ApiError = require('../utils/ApiError');
const { pool } = require('../config/db');
const aiService = require('./ai.service');
const aiCareerService = require('./aiCareer.service');

const SYSTEM_PROMPT = `You are SkillBridge AI, a friendly career mentor for young people in Zimbabwe.
Be practical, honest, and encouraging. Use plain English. Ask a clarifying question when it helps.
Never promise jobs, scholarships, admissions, or salaries. Never invent employers, deadlines, or vacancies.
You must return a valid JSON object with exactly these keys:
{
  "reply": "your answer as 2-6 short paragraphs or a short list written in plain text",
  "suggested_actions": ["up to 4 concrete next actions"]
}`;

const THREAD_SELECT = `SELECT id, user_id, title, created_at, updated_at FROM mentor_threads`;
const MESSAGE_COLUMNS = 'id, thread_id, role, content, created_at';

function mapThread(row) {
  return row || null;
}

function text(value, max = 6000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function listThreads(userId) {
  const { rows } = await pool.query(
    `${THREAD_SELECT} WHERE user_id = $1 ORDER BY updated_at DESC, id DESC`,
    [userId]
  );
  return rows.map(mapThread);
}

async function getThreadRow(userId, threadId) {
  const { rows } = await pool.query(
    `${THREAD_SELECT} WHERE user_id = $1 AND id = $2`,
    [userId, threadId]
  );
  return mapThread(rows[0]);
}

async function getThread(userId, threadId) {
  const thread = await getThreadRow(userId, threadId);
  if (!thread) return null;

  const { rows: messages } = await pool.query(
    `SELECT ${MESSAGE_COLUMNS} FROM mentor_messages
     WHERE thread_id = $1 ORDER BY created_at ASC, id ASC`,
    [threadId]
  );

  return { ...thread, messages };
}

async function createThread(userId, { title }) {
  const { rows } = await pool.query(
    `INSERT INTO mentor_threads (user_id, title) VALUES ($1, $2)
     RETURNING id, user_id, title, created_at, updated_at`,
    [userId, title || 'Career mentor chat']
  );
  return { ...mapThread(rows[0]), messages: [] };
}

async function updateThread(userId, threadId, { title }) {
  const { rows } = await pool.query(
    `UPDATE mentor_threads SET title = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND user_id = $3
     RETURNING id, user_id, title, created_at, updated_at`,
    [title, threadId, userId]
  );
  return mapThread(rows[0]);
}

async function deleteThread(userId, threadId) {
  const { rowCount } = await pool.query(
    'DELETE FROM mentor_threads WHERE id = $1 AND user_id = $2',
    [threadId, userId]
  );
  return rowCount > 0;
}

async function sendMessage(userId, threadId, content) {
  const thread = await getThreadRow(userId, threadId);
  if (!thread) return { status: 'not_found' };

  const { rows: history } = await pool.query(
    `SELECT role, content FROM mentor_messages
     WHERE thread_id = $1 ORDER BY created_at DESC, id DESC LIMIT 20`,
    [threadId]
  );

  const context = await aiCareerService.getProfileContext(userId);

  const conversation = [...history]
    .reverse()
    .map((message) => `${message.role === 'user' ? 'User' : 'Mentor'}: ${message.content}`)
    .join('\n');

  const raw = await aiService.generateJson({
    system: SYSTEM_PROMPT,
    user: `The user's real profile and skills:
${JSON.stringify(context, null, 2)}

Conversation so far:
${conversation || '(new conversation)'}

New message from the user:
${content}

Reply as the mentor. Keep it focused and practical.`,
    temperature: 0.5,
  });

  const reply = text(raw.reply, 6000);
  if (!reply) {
    throw new ApiError(502, 'The mentor returned an empty reply. Please try again.', {
      code: 'AI_INVALID_RESPONSE',
    });
  }

  const client = await pool.connect();
  let savedUser;
  let savedAssistant;
  try {
    await client.query('BEGIN');
    const { rows: userRows } = await client.query(
      `INSERT INTO mentor_messages (thread_id, role, content) VALUES ($1, 'user', $2)
       RETURNING ${MESSAGE_COLUMNS}`,
      [threadId, content]
    );
    savedUser = userRows[0];

    const { rows: assistantRows } = await client.query(
      `INSERT INTO mentor_messages (thread_id, role, content) VALUES ($1, 'assistant', $2)
       RETURNING ${MESSAGE_COLUMNS}`,
      [threadId, reply]
    );
    savedAssistant = assistantRows[0];

    await client.query(
      'UPDATE mentor_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [threadId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const suggestedActions = Array.isArray(raw.suggested_actions)
    ? raw.suggested_actions
        .map((item) => text(item, 300))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    status: 'ok',
    message: savedAssistant,
    user_message: savedUser,
    suggested_actions: suggestedActions,
  };
}

module.exports = {
  listThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  sendMessage,
};
