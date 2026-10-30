// AI Career Mentor endpoints.
const mentorService = require('../services/mentor.service');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

async function list(req, res) {
  const threads = await mentorService.listThreads(req.user.id);
  return sendSuccess(res, { data: { threads } });
}

async function create(req, res) {
  const thread = await mentorService.createThread(req.user.id, req.validated.body);
  return sendSuccess(res, {
    statusCode: 201,
    data: { thread },
    message: 'Conversation started',
  });
}

async function getOne(req, res) {
  const { threadId } = req.validated.params;
  const thread = await mentorService.getThread(req.user.id, threadId);

  if (!thread) throw ApiError.notFound(`Conversation ${threadId} was not found`);
  return sendSuccess(res, { data: { thread } });
}

async function update(req, res) {
  const { threadId } = req.validated.params;
  const thread = await mentorService.updateThread(
    req.user.id,
    threadId,
    req.validated.body
  );

  if (!thread) throw ApiError.notFound(`Conversation ${threadId} was not found`);
  return sendSuccess(res, { data: { thread }, message: 'Conversation renamed' });
}

async function remove(req, res) {
  const { threadId } = req.validated.params;
  const deleted = await mentorService.deleteThread(req.user.id, threadId);

  if (!deleted) throw ApiError.notFound(`Conversation ${threadId} was not found`);
  return sendSuccess(res, {
    data: { thread_id: threadId },
    message: 'Conversation deleted',
  });
}

async function send(req, res) {
  const { threadId } = req.validated.params;
  const result = await mentorService.sendMessage(
    req.user.id,
    threadId,
    req.validated.body.content
  );

  if (result.status === 'not_found') {
    throw ApiError.notFound(`Conversation ${threadId} was not found`);
  }

  return sendSuccess(res, { data: result });
}

module.exports = { list, create, getOne, update, remove, send };
