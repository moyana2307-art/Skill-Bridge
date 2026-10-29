// AI transport layer. Every AI feature calls generateJson() and receives a
// parsed JavaScript object. Prompts live with the feature that owns them (see
// aiCareer.service.js) so this file stays about provider selection, timeouts,
// and clear errors. Local Ollama is the free default; Pollinations is the
// no-key hosted fallback; OpenAI remains optional.
const OpenAI = require('openai');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const SUPPORTED_PROVIDERS = new Set(['ollama', 'pollinations', 'openai']);

let openaiClient = null;

function getProvider() {
  const provider = env.ai.provider;

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new ApiError(
      503,
      `Unsupported AI_PROVIDER "${provider}". Use "ollama", "pollinations", or "openai".`,
      { code: 'AI_NOT_CONFIGURED' }
    );
  }

  return provider;
}

function getModelName() {
  const provider = getProvider();

  if (provider === 'ollama') return env.ollama.model;
  if (provider === 'pollinations') return env.pollinations.model;

  return env.openai.model;
}

function getOpenAIClient() {
  if (!env.openai.apiKey) {
    throw new ApiError(
      503,
      'AI_PROVIDER is set to "openai" but OPENAI_API_KEY is missing from the backend environment.',
      { code: 'AI_NOT_CONFIGURED' }
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.openai.apiKey,
      timeout: env.openai.timeoutMs,
      maxRetries: 1,
    });
  }

  return openaiClient;
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

function parseModelJson(content) {
  try {
    return parseJsonContent(content);
  } catch (err) {
    throw new ApiError(
      502,
      'The AI returned a response that was not valid JSON. Please try again.',
      { code: 'AI_INVALID_RESPONSE' }
    );
  }
}

async function generateWithOpenAI({ system, user, temperature }) {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: env.openai.model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    return parseModelJson(completion.choices?.[0]?.message?.content);
  } catch (err) {
    if (err instanceof ApiError) throw err;

    console.error('[ai] OpenAI request failed:', err?.message || err);

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
          'The OpenAI account has no credits remaining. Add billing credits or switch AI_PROVIDER to "ollama".',
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

function ollamaHttpError(status, body, raw, model) {
  const detail = String(body?.error || raw || '');
  const modelMissing =
    status === 404 || /model.*(not found|does not exist)|try pulling/i.test(detail);

  if (modelMissing) {
    return new ApiError(
      503,
      `The Ollama model "${model}" is not installed. Run "ollama pull ${model}" and try again.`,
      { code: 'AI_MODEL_NOT_FOUND' }
    );
  }

  if (status === 429) {
    return new ApiError(429, 'The local AI is busy right now. Try again shortly.', {
      code: 'AI_RATE_LIMITED',
    });
  }

  return new ApiError(
    502,
    'The local AI service could not complete that request. Check the Ollama logs and try again.',
    { code: 'AI_UPSTREAM_ERROR' }
  );
}

async function generateWithOllama({ system, user, temperature }) {
  const { baseUrl, model, timeoutMs, numCtx } = env.ollama;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        options: {
          temperature,
          num_ctx: numCtx,
        },
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let body = null;

    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      // The status code and raw text still give us enough information below.
    }

    if (!response.ok) {
      throw ollamaHttpError(response.status, body, raw, model);
    }

    if (body?.error) {
      throw ollamaHttpError(response.status, body, raw, model);
    }

    return parseModelJson(body?.message?.content ?? body?.response);
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err?.name === 'AbortError') {
      throw new ApiError(
        504,
        `Ollama did not respond within ${Math.round(timeoutMs / 1000)} seconds. The model may still be loading; try again or use a smaller OLLAMA_MODEL.`,
        { code: 'AI_TIMEOUT' }
      );
    }

    const code = err?.cause?.code || err?.code;
    const connectionFailed = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
    ].includes(code);

    if (connectionFailed) {
      throw new ApiError(
        503,
        `Cannot reach Ollama at ${baseUrl}. Start Ollama, run "ollama pull ${model}", and try again.`,
        { code: 'AI_NOT_CONFIGURED' }
      );
    }

    console.error('[ai] Ollama request failed:', err?.message || err);

    throw new ApiError(
      502,
      'The local AI service could not complete that request. Check that Ollama is running and try again.',
      { code: 'AI_UPSTREAM_ERROR' }
    );
  } finally {
    clearTimeout(timeout);
  }
}

function pollinationsHttpError(status, body, raw) {
  if (status === 429) {
    return new ApiError(429, 'The hosted AI service is busy right now. Try again shortly.', {
      code: 'AI_RATE_LIMITED',
    });
  }

  console.error('[ai] Pollinations request failed:', status, body?.error || raw);

  return new ApiError(
    502,
    'The hosted AI service could not complete that request. Please try again.',
    { code: 'AI_UPSTREAM_ERROR' }
  );
}

async function generateWithPollinations({ system, user, temperature }) {
  const { baseUrl, model, timeoutMs, referrer } = env.pollinations;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (referrer) headers.Referer = referrer;

    const response = await fetch(`${baseUrl}/openai`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let body = null;

    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      // The status code and raw text still give us enough information below.
    }

    if (!response.ok) {
      throw pollinationsHttpError(response.status, body, raw);
    }

    return parseModelJson(body?.choices?.[0]?.message?.content);
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err?.name === 'AbortError') {
      throw new ApiError(
        504,
        `The hosted AI service did not respond within ${Math.round(timeoutMs / 1000)} seconds. Please try again.`,
        { code: 'AI_TIMEOUT' }
      );
    }

    const code = err?.cause?.code || err?.code;
    const connectionFailed = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
    ].includes(code);

    if (connectionFailed) {
      throw new ApiError(
        503,
        'Cannot reach the hosted AI service right now. Please try again shortly.',
        { code: 'AI_NOT_CONFIGURED' }
      );
    }

    console.error('[ai] Pollinations request failed:', err?.message || err);

    throw new ApiError(
      502,
      'The hosted AI service could not complete that request. Please try again.',
      { code: 'AI_UPSTREAM_ERROR' }
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function generateJson({ system, user, temperature = 0.4 }) {
  const provider = getProvider();

  if (provider === 'ollama') {
    return generateWithOllama({ system, user, temperature });
  }

  if (provider === 'pollinations') {
    return generateWithPollinations({ system, user, temperature });
  }

  return generateWithOpenAI({ system, user, temperature });
}

module.exports = { generateJson, getModelName };
