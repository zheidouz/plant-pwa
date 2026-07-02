/**
 * Thin client wrapper around the Firebase Function `identifyPlant`.
 *
 * Configuration:
 *   - `VITE_FIREBASE_FUNCTIONS_URL` is set in `.env` after the parent agent
 *     deploys (issue #10). The fallback `"/api"` keeps the client usable
 *     against the Firebase Hosting + Functions rewrite combo during local
 *     dev / preview (`firebase.json` rewrites unknown paths to the function).
 *
 * Per ADR 0001 (`docs/adr/0001-plantnet-proxy.md`), the client never sees
 * the Pl@ntNet or MiMo API key — everything goes through this proxy.
 */

import type {
  IdentifyRequest,
  IdentifyResult,
  Organ,
} from "./identifyTypes";

const FUNCTIONS_URL =
  (import.meta.env.VITE_FIREBASE_FUNCTIONS_URL as string | undefined) ?? "/api";

/**
 * Identifier-specific error thrown by `identifyPlant()`. Carries the
 * server-supplied `error` code and a fallback `message` so the UI can
 * distinguish "rate-limited" from "no network" from "garbled image".
 */
export class IdentifyError extends Error {
  readonly status?: number;
  readonly code?: string;
  constructor(message: string, opts: { status?: number; code?: string } = {}) {
    super(message);
    this.name = "IdentifyError";
    this.status = opts.status;
    this.code = opts.code;
  }
}

/**
 * Call the Firebase Function `identifyPlant`. Returns the parsed
 * {@link IdentifyResult} on success. Throws {@link IdentifyError} on any
 * non-2xx response or on a network failure.
 */
export async function identifyPlant(
  imageBase64: string,
  organ: Organ,
): Promise<IdentifyResult> {
  const body: IdentifyRequest = { imageBase64, organ };
  const url = `${FUNCTIONS_URL.replace(/\/$/, "")}/identifyPlant`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // fetch() rejection typically means "you are offline" or DNS failure.
    throw new IdentifyError(
      "Could not reach the identification service. Check your connection and try again.",
      { code: "network" },
    );
  }

  if (!res.ok) {
    let payload: { error?: string; message?: string } = {};
    try {
      payload = (await res.json()) as { error?: string; message?: string };
    } catch {
      // Body wasn't JSON — fall back to status-based copy below.
    }
    const message =
      payload.message ??
      friendlyMessageForStatus(res.status) ??
      "Identification failed. Please try again.";
    throw new IdentifyError(message, { status: res.status, code: payload.error });
  }

  let data: IdentifyResult;
  try {
    data = (await res.json()) as IdentifyResult;
  } catch {
    throw new IdentifyError("Unexpected response from the identification service.", {
      code: "parse",
    });
  }

  if (!data?.topCandidate || typeof data.topCandidate.commonName !== "string") {
    throw new IdentifyError("Identification did not return a plant name.", {
      code: "no_candidates",
    });
  }

  return data;
}

function friendlyMessageForStatus(status: number): string | null {
  if (status === 429) return "Plant identification is rate-limited. Please try again later.";
  if (status === 502) return "Identification service is temporarily unavailable. Try again.";
  if (status === 500) return "Identification failed on our side. Please try again.";
  if (status === 400) return "The image or organ was rejected by the service.";
  return null;
}
