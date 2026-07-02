/**
 * generateSchedule — Firebase Functions v2 HTTP proxy that returns a
 * MiMo-generated `{ rules, careTip }` for a given (scientificName,
 * commonName, locale, createdAt). Cached by `(scientificName, locale,
 * month)` for 30 days in Firestore.
 *
 * Per the issue:
 *   - Input:  { scientificName, commonName, locale, createdAt }
 *   - Output: { rules: ScheduleRule[], careTip: string }
 *   - Cache key: `${scientificName}|${locale}|${YYYY-MM}` (lower-cased)
 *   - Cache TTL: 30 days
 *   - MiMo API key held server-side only (secret, never on the client)
 *
 * See `docs/issues/0004-schedule-detail.md` for the acceptance criteria
 * and `docs/adr/0001-plantnet-proxy.md` for the proxy-boundary rationale.
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";

import { callMimoStructured } from "./mimo";
import { hemisphereFromLocale, seasonFromDate } from "./locale";
import {
  DEFAULT_TTL_MS,
  getCachedSchedule,
  setCachedSchedule,
} from "./cache";

const MIMO_API_KEY = defineSecret("MIMO_API_KEY");
const MIMO_BASE_URL = defineString("MIMO_BASE_URL", {
  default: "https://api.xiaomimimo.com/v1",
});

/* ───────────────────────────  Public contract  ────────────────────────── */

/** Mirrors `CareType` from `src/domain/types.ts`. */
type CareType = "water" | "fertilize" | "mist";

/** Mirrors `ScheduleRule` from `src/domain/types.ts`. */
export interface ScheduleRule {
  careType: CareType;
  /** Integer 1..60; the number picker clamps on the client too. */
  cadenceDays: number;
  enabled: boolean;
}

/** Mirrors the `Plant.careTip` shape. */
export interface ScheduleGenerateResult {
  rules: ScheduleRule[];
  careTip: string;
}

export interface ScheduleGenerateRequest {
  /** Latin name, may be empty (e.g. the user added a plant manually). */
  scientificName?: string;
  /** Display name. Always present. */
  commonName: string;
  /** BCP-47 locale, e.g. "en-US", "fr-FR". */
  locale: string;
  /** ISO timestamp; used to derive the cache-month. */
  createdAt: string;
}

/* ──────────────────────────────  Validation  ───────────────────────────── */

const ALLOWED_CARE_TYPES = new Set<CareType>([
  "water",
  "fertilize",
  "mist",
]);

function isScheduleRule(x: unknown): x is ScheduleRule {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  const ct = r.careType;
  const cd = r.cadenceDays;
  const en = r.enabled;
  if (typeof ct !== "string" || !ALLOWED_CARE_TYPES.has(ct as CareType)) return false;
  if (typeof cd !== "number" || !Number.isFinite(cd)) return false;
  if (typeof en !== "boolean") return false;
  return true;
}

function isResult(x: unknown): x is ScheduleGenerateResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.rules)) return false;
  if (typeof o.careTip !== "string") return false;
  // Accept partial outputs (the user only ever gets the three care types
  // in v1, but be lenient on what MiMo returns).
  for (const r of o.rules) {
    if (!isScheduleRule(r)) return false;
  }
  return true;
}

/* ───────────────────────  Cache key + cache layer  ────────────────────── */

/**
 * Build the cache key. We use `createdAt`'s month + the locale + the
 * scientific name. Falls back to the common name when the scientific
 * name is missing (manual-add path).
 */
function buildCacheKey(req: ScheduleGenerateRequest): string {
  const species =
    (req.scientificName || req.commonName || "unknown").trim() || "unknown";
  const locale = (req.locale || "en-US").trim();
  const month = monthFromIso(req.createdAt);
  return `${species}|${locale}|${month}`;
}

/** Returns "YYYY-MM" for an ISO timestamp; defaults to the current month. */
function monthFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ─────────────────────────────  MiMo prompt  ──────────────────────────── */

/**
 * Build the user-turn prompt. We pass the species (both common + sci if
 * we have it), hemisphere, and current season so the model can season-
 * adjust cadences (e.g. less water in winter).
 */
function buildPrompt(req: ScheduleGenerateRequest, season: string): string {
  const sci = (req.scientificName || "").trim();
  const common = (req.commonName || "").trim();
  const lines = [
    "You are a horticulturist generating a care schedule for a houseplant.",
    `Plant: ${common}${sci ? ` (${sci})` : ""}`,
    `Season: ${season}`,
    "",
    "Return ONLY a JSON object with this exact shape and nothing else:",
    '{"rules":[{"careType":"water","cadenceDays":7,"enabled":true},' +
    '{"careType":"fertilize","cadenceDays":30,"enabled":true},' +
    '{"careType":"mist","cadenceDays":3,"enabled":false}],' +
    '"careTip":"<one or two sentences>"}',
    "",
    "Rules:",
    "- Every rule.careType MUST be one of water|fertilize|mist.",
    "- cadenceDays MUST be a positive integer between 1 and 60.",
    "- Include all three care types, even if enabled is false.",
    "- For cacti/succulents: water less often (10-21 days), mist disabled.",
    "- For ferns/tropicals: water more often (3-7 days), mist enabled.",
    "- cadences should be season-adjusted: water less in winter.",
    "- careTip: one or two short sentences with a concrete weekly cadence.",
  ];
  return lines.join("\n");
}

/* ─────────────────────────  Public HTTP handler  ──────────────────────── */

/**
 * POST /generateSchedule  body: ScheduleGenerateRequest
 * 200 → ScheduleGenerateResult
 * 400 → invalid request
 * 500 → server-side error
 */
export const generateSchedule = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [MIMO_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const body = (req.body ?? {}) as Partial<ScheduleGenerateRequest>;
    const commonName = typeof body.commonName === "string" ? body.commonName.trim() : "";
    const locale = typeof body.locale === "string" && body.locale.trim()
      ? body.locale.trim()
      : "en-US";
    const createdAt = typeof body.createdAt === "string" && body.createdAt
      ? body.createdAt
      : new Date().toISOString();
    const scientificName = typeof body.scientificName === "string"
      ? body.scientificName.trim()
      : "";

    if (!commonName) {
      res.status(400).json({ error: "missing_commonName" });
      return;
    }

    const request: ScheduleGenerateRequest = {
      commonName,
      locale,
      createdAt,
      scientificName,
    };

    const cacheKey = buildCacheKey(request);

    // Cache lookup
    try {
      const hit = await getCachedSchedule<ScheduleGenerateResult>(cacheKey);
      if (hit) {
        res.status(200).json(hit);
        return;
      }
    } catch (err) {
      logger.warn("cache get threw", { err: String(err) });
    }

    const mimoKey = MIMO_API_KEY.value();
    const mimoBase = MIMO_BASE_URL.value();
    if (!mimoKey) {
      logger.error("MIMO_API_KEY secret is not configured");
      res.status(500).json({
        error: "mimo_key_missing",
        message: "Server-side schedule key is not configured.",
      });
      return;
    }

    // Derive hemisphere + season for prompt enrichment. The hemisphere
    // decision is logged but never sent back to the client.
    const hemisphere = hemisphereFromLocale(locale);
    const season = seasonFromDate(new Date(createdAt), hemisphere);

    const prompt = buildPrompt(request, season);

    let parsed: ScheduleGenerateResult | null = null;
    try {
      parsed = await callMimoStructured<ScheduleGenerateResult>(
        mimoKey,
        mimoBase,
        prompt,
        isResult,
        { maxTokens: 2000, temperature: 0.2, timeoutMs: 25_000 },
      );
    } catch (err) {
      logger.error("mimo schedule call threw", { err: String(err) });
    }

    if (!parsed) {
      // Conservative fallback: every species gets water every 7 days,
      // fertilize monthly. The client renders this as the care tip too.
      parsed = {
        rules: [
          { careType: "water", cadenceDays: 7, enabled: true },
          { careType: "fertilize", cadenceDays: 30, enabled: true },
          { careType: "mist", cadenceDays: 3, enabled: false },
        ],
        careTip: "Water when the top inch of soil is dry.",
      };
    } else {
      // Normalise — clamp cadenceDays, dedupe by careType (keep first).
      const seen = new Set<CareType>();
      parsed.rules = parsed.rules
        .filter((r) => {
          if (seen.has(r.careType)) return false;
          seen.add(r.careType);
          return true;
        })
        .map((r) => ({
          ...r,
          cadenceDays: Math.min(60, Math.max(1, Math.round(r.cadenceDays))),
        }));

      // Ensure all three care types are present (fill defaults if missing).
      const have = new Set(parsed.rules.map((r) => r.careType));
      if (!have.has("water")) {
        parsed.rules.push({ careType: "water", cadenceDays: 7, enabled: true });
      }
      if (!have.has("fertilize")) {
        parsed.rules.push({ careType: "fertilize", cadenceDays: 30, enabled: true });
      }
      if (!have.has("mist")) {
        parsed.rules.push({ careType: "mist", cadenceDays: 3, enabled: false });
      }
    }

    // Best-effort cache write (30-day TTL).
    try {
      await setCachedSchedule(cacheKey, parsed, DEFAULT_TTL_MS);
    } catch (err) {
      logger.warn("cache set threw", { err: String(err) });
    }

    res.status(200).json(parsed);
  },
);
