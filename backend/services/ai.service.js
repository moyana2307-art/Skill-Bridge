// Thin wrapper around the OpenAI SDK. Every AI feature calls generateJson()
// and receives a parsed JavaScript object. Prompts live with the feature that
// owns them (see aiCareer.service.js) so this file stays about transport,
// timeouts, and clear errors.
const OpenAI = require('openai');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

let client = null;

function getClient() {
  if (!env.openai.apiKey) {
    throw new ApiError(
      503,
      'AI features are not configured yet. Add OPENAI_API_KEY to the backend environment.',
      { code: 'AI_NOT_CONFIGURED' }
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.openai.apiKey,
      timeout: env.openai.timeoutMs,
      maxRetries: 1,
    });
  }

  return client;
}

function parseJsonContent(content) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('The AI returned an empty response');
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    // Some models wrap JSON in prose or code fences despite the instruction.
    // Pull out the outermost object before giving up.
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');

    if (start !== -1 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }

    throw err;
  }
}

async function generateJson({ system, user, temperature = 0.4 }) {
  try {
    const completion = await getClient().chat.completions.create({
      model: env.openai.model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    return parseJsonContent(completion.choices?.[0]?.message?.content);
  } catch (err) {
    if (err instanceof ApiError) throw err;

    console.error('[ai] request failed:', err?.message || err);

    if (err?.status === 401 || err?.code === 'invalid_api_key') {
      throw new ApiError(
        503,
        'The OpenAI API key was rejected. Check OPENAI_API_KEY in the backend environment.',
        { code: 'AI_AUTH_FAILED' }
      );
    }

    if (err?.status === 429) {
      const quotaExceeded =
        err?.code === 'insufficient_quota' ||
        /quota|billing|credit/i.test(err?.message || '');

      if (quotaExceeded) {
        throw new ApiError(
          503,
          'The OpenAI account has no credits remaining. Add billing credits at https://platform.openai.com/settings/organization/billing/ and try again.',
          { code: 'AI_QUOTA_EXCEEDED' }
        );
      }

      throw new ApiError(429, 'The AI service is busy right now. Try again shortly.', {
        code: 'AI_RATE_LIMITED',
      });
    }

    throw new ApiError(
      502,
      'The AI service could not complete that request. Please try again.',
      { code: 'AI_UPSTREAM_ERROR' }
    );
  }
}

module.exports = { generateJson };
