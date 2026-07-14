/**
 * identifyPlant — Firebase Functions v2 HTTP proxy that fronts Pl@ntNet v2
 * (and falls back to MiMo v2.5 vision when Pl@ntNet confidence is too low).
 *
 * Per ADR 0001 (`docs/adr/0001-plantnet-proxy.md`), the proxy is the
 * **single boundary** for both external AI/identification calls — the client
 * never sees API keys and never makes raw external calls.
 *
 * Response contract (matches the PRD section "Identification Flow" near
 * line 158 of `docs/prd/plant-identifier-pwa-v1.md`):
 *
 *   { candidates: IdentifyCandidate[],
 *     topCandidate: IdentifyCandidate,
 *     source: "plantnet" | "mimo-vision" }
 *
 * Where IdentifyCandidate is:
 *   { commonName: string,
 *     scientificName?: string,
 *     confidence: number,           // 0..1
 *     source: "plantnet" | "mimo-vision" }
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";

const PLANTNET_API_KEY = defineSecret("PLANTNET_API_KEY");
const MIMO_API_KEY = defineSecret("MIMO_API_KEY");
const MIMO_BASE_URL = defineString("MIMO_BASE_URL", {
  default: "https://api.xiaomimimo.com/v1",
});

/** Public response contract — matches `src/lib/identifyTypes.ts`. */
export interface IdentifyCandidate {
  commonName: string;
  scientificName?: string;
  /** 0..1. */
  confidence: number;
  source: "plantnet" | "mimo-vision";
}

export interface IdentifyResult {
  candidates: IdentifyCandidate[];
  topCandidate: IdentifyCandidate;
  source: "plantnet" | "mimo-vision";
}

/** Pl@ntNet organ vocabulary. The keys are the strings accepted by the
 *  ` organs` form field (note the leading space per the v2 spec). */
const ORGANS = new Set(["leaf", "flower", "fruit", "bark", "whole"]);

/** Threshold below which we hand the image to MiMo vision as a fallback. */
const CONFIDENCE_FLOOR = 0.3;

/** Default MiMo model identifier when none is provided. */
const MIMO_MODEL = "mimo-v2.5";

/** Pl@ntNet's published /v2/identify/all endpoint. */
const PLANTNET_ENDPOINT = "https://my-api.plantnet.org/v2/identify/all";

interface PlantNetResponse {
  results?: Array<{
    score: number;
    species: {
      scientificName?: string;
      commonNames?: string[];
    };
  }>;
}

/**
 * Wrap an upstream provider call with a Node 20 fetch + a hard timeout.
 * Returns `null` on timeout so callers can fall through gracefully.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms = 15_000,
): Promise<Response | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } catch (err) {
    logger.warn("upstream fetch failed", { url, err: String(err) });
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Build a `multipart/form-data` body manually. The Node 20 global `FormData`
 * and `Blob` work, and because we round-trip through `fetch` the boundary is
 * generated automatically by the runtime — we still need to pass it as the
 * `Content-Type` header for Pl@ntNet to parse the body correctly.
 */
async function buildPlantNetForm(
  imageBase64: string,
  organ: string,
): Promise<{ body: FormData; contentType: string }> {
  const fd = new FormData();
  // Pl@ntNet's v2 spec uses the leading-space key ` organs`. Yes, really.
  // https://my-api.plantnet.org/v2/identify/all
  fd.append(" organs", organ);
  fd.append("images", base64ToBlob(imageBase64, "image/jpeg"), "plant.jpg");
  return { body: fd, contentType: "multipart/form-data; boundary=__plantpwa__" };
}

function base64ToBlob(b64: string, mime: string): Blob {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  // Convert base64 → Buffer (already an ArrayBufferView) → pass directly.
  // The BlobPart type accepts Buffer in Node 20, which is what runtime uses.
  const bin = Buffer.from(clean, "base64");
  return new Blob([bin], { type: mime });
}

/**
 * Call Pl@ntNet /v2/identify/all with the image + organ. Returns a normalized
 * candidate list (or `[]` for any non-success / parse error — the caller
 * decides whether to fall back to MiMo).
 */
async function callPlantNet(
  apiKey: string,
  imageBase64: string,
  organ: string,
): Promise<IdentifyCandidate[]> {
  const url = `${PLANTNET_ENDPOINT}?api-key=${encodeURIComponent(apiKey)}`;
  // We hand a placeholder content-type; Node 20 / undici will patch in the
  // real boundary when we hand over a `FormData` instance, so we let fetch
  // set the header itself for the FormData path:
  // (see https://github.com/nodejs/undici/issues/2299)
  const fd = new FormData();
  fd.append(" organs", organ);
  fd.append("images", base64ToBlob(imageBase64, "image/jpeg"), "plant.jpg");

  const res = await fetchWithTimeout(url, { method: "POST", body: fd });
  if (!res || !res.ok) {
    logger.warn("plantnet non-ok", { status: res?.status });
    return [];
  }
  let json: PlantNetResponse;
  try {
    json = (await res.json()) as PlantNetResponse;
  } catch {
    return [];
  }
  const results = json.results ?? [];
  return results.slice(0, 5).map((r) => {
    const scientific = r.species?.scientificName;
    const common =
      (r.species?.commonNames ?? []).find((n) => typeof n === "string" && n.length > 0) ??
      scientific ??
      "Unknown plant";
    return {
      commonName: common,
      scientificName: scientific,
      confidence: typeof r.score === "number" ? r.score : 0,
      source: "plantnet" as const,
    };
  });
}

/**
 * Fallback to MiMo v2.5 vision. We ask for a clean JSON payload
 * `{ commonName, scientificName, confidence }`. MiMo is a reasoning model,
 * so we set `max_tokens` generously and ignore any reasoning text — we only
 * parse the first JSON object in the response.
 *
 * Returns a single-element candidate list on success, or `[]` on parse /
 * network failure (caller will 502 accordingly).
 */
async function callMimoVision(
  apiKey: string,
  baseUrl: string,
  imageBase64: string,
): Promise<IdentifyCandidate[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const dataUrl = `data:image/jpeg;base64,${imageBase64.replace(/^data:[^;]+;base64,/, "")}`;
  const body = {
    model: MIMO_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Identify the plant in this photo. Respond with ONLY a JSON object of the form " +
              '{"commonName": "<best common name>", "scientificName": "<Genus species>", ' +
              '"confidence": 0.0}. No prose. No markdown fence.',
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    20_000,
  );

  if (!res || !res.ok) {
    logger.warn("mimo non-ok", { status: res?.status });
    return [];
  }

  let json: {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  };
  try {
    json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    };
  } catch {
    return [];
  }

  const raw = json.choices?.[0]?.message?.content ?? "";
  if (!raw) return [];
  return parseMimoJson(raw);
}

/**
 * Tolerant JSON extractor for MiMo responses. Looks for the first `{...}`
 * substring in `content`, then JSON.parse it. Strips markdown fences.
 */
function parseMimoJson(raw: string): IdentifyCandidate[] {
  const stripped = raw.replace(/```json|```/g, "").trim();
  // Find first '{' and its matching close brace — simple counter, no nesting
  // assumptions are needed because we expect a flat object.
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  const common = typeof obj.commonName === "string" ? obj.commonName : "";
  const sci = typeof obj.scientificName === "string" ? obj.scientificName : undefined;
  const confNum = typeof obj.confidence === "number" ? obj.confidence : 0.5;
  if (!common) return [];
  return [
    {
      commonName: common,
      scientificName: sci,
      confidence: Math.min(Math.max(confNum, 0), 1),
      source: "mimo-vision" as const,
    },
  ];
}

/**
 * Public handler exported via `index.ts`. CORS is wide-open for the v1 PWA
 * (no auth, no third-party origins); tighten once we ship auth.
 */
export const identifyPlant = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [PLANTNET_API_KEY, MIMO_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const { imageBase64, organ } = (req.body ?? {}) as {
      imageBase64?: unknown;
      organ?: unknown;
    };

    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      res.status(400).json({ error: "missing_imageBase64" });
      return;
    }
    if (typeof organ !== "string" || !ORGANS.has(organ)) {
      res.status(400).json({ error: "invalid_organ", allowed: Array.from(ORGANS) });
      return;
    }

    const plantKey = PLANTNET_API_KEY.value();
    const mimoKey = MIMO_API_KEY.value();
    const mimoBase = MIMO_BASE_URL.value();
    // Silence the bundler + keep the build green when MIMO_API_KEY isn't set:
    void mimoKey;
    void mimoBase;

    if (!plantKey) {
      logger.error("PLANTNET_API_KEY secret is not configured");
      res.status(500).json({
        error: "plantnet_key_missing",
        message: "Server-side PlantNet key is not configured.",
      });
      return;
    }

    try {
      const candidates = await callPlantNet(plantKey, imageBase64, organ);
      let top = candidates[0];
      let source: IdentifyResult["source"] = "plantnet";

      if (!top || top.confidence < CONFIDENCE_FLOOR) {
        if (mimoKey) {
          const fallback = await callMimoVision(mimoKey, mimoBase, imageBase64);
          if (fallback.length > 0) {
            top = fallback[0];
            source = "mimo-vision";
          }
        } else {
          logger.warn(
            "MIMO_API_KEY not set — Pl@ntNet low-confidence falls through with no fallback",
          );
        }
      }

      if (!top) {
        res
          .status(502)
          .json({ error: "no_candidates", message: "Neither Pl@ntNet nor MiMo returned a match." });
        return;
      }

      const body: IdentifyResult = {
        candidates: top.source === "mimo-vision" ? [top, ...candidates] : candidates,
        topCandidate: top,
        source,
      };
      res.status(200).json(body);
    } catch (err) {
      logger.error("identifyPlant crashed", { err: String(err) });
      res.status(500).json({
        error: "internal",
        message: "Identification failed unexpectedly. Please try again.",
      });
    }
  },
);
