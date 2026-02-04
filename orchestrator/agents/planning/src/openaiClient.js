'use strict';

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

/**
 * Extract first JSON object from a string.
 * @param {string} text
 */
function extractFirstJsonObject(text) {
  if (!text) throw new Error('Empty model output');
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in model output');
  }
  const candidate = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(candidate);
}

/**
 * @param {{
 *  apiKey?: string,
 *  model: string,
 *  messages: Array<{role:'system'|'user'|'assistant', content:string}>,
 *  temperature?: number,
 *  timeoutMs?: number,
 * }} params
 */
async function chatCompletionsJson(params) {
  const apiKey = params.apiKey || process.env.NOBLE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY (or NOBLE_OPENAI_API_KEY)');

  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? 45_000;
  const t = setTimeout(() => controller.abort(new Error('OpenAI request timed out')), timeoutMs);

  try {
    const res = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        // Best-effort enforcement. If unsupported, OpenAI will reject; caller can fall back.
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 800)}`);
    }

    /** @type {any} */
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Unexpected OpenAI response shape');

    try {
      return JSON.parse(content);
    } catch {
      return extractFirstJsonObject(content);
    }
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  chatCompletionsJson,
  extractFirstJsonObject,
};
