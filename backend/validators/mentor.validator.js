// Validation for the AI career mentor.
const { z } = require('zod');
const { idParam, optionalText } = require('./common.validator');

const threadIdParams = z.object({ threadId: idParam });

const createThreadBody = z
  .object({
    title: optionalText(200),
  })
  .strict();

const updateThreadBody = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
  })
  .strict();

const sendMessageBody = z
  .object({
    content: z.string().trim().min(1, 'Write a message first').max(4000),
  })
  .strict();

module.exports = {
  threadIdParams,
  createThreadBody,
  updateThreadBody,
  sendMessageBody,
};
