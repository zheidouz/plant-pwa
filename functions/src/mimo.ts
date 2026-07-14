/**
 * Shared MiMo v2.5 chat-completions helpers.
 *
 * Provides:
 *   - `callMimoStructured<T>()` — text-only prompt, returns parsed JSON
 *   - `parseMimoJson<T>()`      — tolerant JSON extractor (first `{` to last `}`)
 *
 * Slice #5 / #6 add the schedule-generation caller. Slice #4's
 * `identifyPlant.ts` keeps its own `parseMimoJson` copy for now (no edit
 * here — issue #4 owns that file). Duplication is intentional for v1:
 * see `docs/adr/0001-plantnet-proxy.md` § "MiMo reasoning trap" for
 * the rationale.
 *
 * MiMo is a reasoning model — the actual answer (or its JSON form) lives
 * in `choices[0].message.content`, while any chain-of-thought reasoning
 * lives in the sibling `reasoning_content` field. We must:
 *   - set `max_tokens` generously (≥ 2000) so the model can finish a
 *     reasoning pass before serialising the answer
 *   - NEVER read `reasoning_content` (we'd burn context for no gain)
 *   - apply `temperature ≤ 0.3` for determinism
 *   - parse the first balanced `{...}` in `content` rather than the whole
 *     string (the model may add prose before/after the JSON).
 */

import { logger } from "firebase-functions";

/** Default MiMo model identifier for structured chat-completions. */
export const MIMO_MODEL = "mimo-v2.5";

export interface MimoMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call MiMo with a single-user-turn prompt and return the assistant's
 * `content` field as a string. Caller is responsible for JSON parsing.
 */
export async function callMimoChat(
  apiKey: string,
  baseUrl: string,
  messages: MimoMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: MIMO_MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.2,
    messages,
  };

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), opts.timeoutMs ?? 20_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!res.ok) {
      logger.warn("mimo non-ok", { status: res.status });
      return null;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    return raw || null;
  } catch (err) {
    logger.warn("mimo fetch failed", { err: String(err) });
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Tolerant JSON extractor for MiMo responses. Looks for the first `{`
 * and the last `}` in `raw`, JSON.parses the slice, and validates it
 * through `validate`. Returns `null` on any failure (callers should
 * fall back gracefully).
 */
export function parseMimoJson<T>(
  raw: string,
  validate: (obj: unknown) => obj is T,
): T | null {
  const stripped = raw.replace(/```json|```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
  return validate(parsed) ? parsed : null;
}

/**
 * Convenience wrapper: call MiMo with a single user-turn prompt and parse
 * the response as JSON matching `validate`. Returns `null` on parse
 * failure or upstream error.
 */
export async function callMimoStructured<T>(
  apiKey: string,
  baseUrl: string,
  userPrompt: string,
  validate: (obj: unknown) => obj is T,
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<T | null> {
  const raw = await callMimoChat(apiKey, baseUrl, [{ role: "user", content: userPrompt }], opts);
  if (!raw) return null;
  return parseMimoJson(raw, validate);
}
