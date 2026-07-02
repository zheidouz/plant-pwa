/**
 * Unit tests for the `push` lib (slice #8).
 *
 * These tests intentionally avoid firing real `Notification` instances or
 * hitting `requestPermission` — they exercise only the synchronous
 * permission-accessor surface plus the body-text formatter.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  DEFAULT_DIGEST_HOUR,
  DEFAULT_DIGEST_MINUTE,
  digestBody,
  getNotificationPermission,
} from "../push";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("push permission accessor", () => {
  it("getNotificationPermission returns a string (the mocked Notification.permission)", () => {
    // jsdom doesn't implement Notification by default — provide a minimal
    // stub so the helper has something to read.
    const original = (globalThis as unknown as { Notification?: unknown })
      .Notification;
    (globalThis as unknown as { Notification: { permission: string } }).Notification =
      { permission: "granted" };

    expect(typeof getNotificationPermission()).toBe("string");
    expect(getNotificationPermission()).toBe("granted");

    // Restore.
    if (original === undefined) {
      delete (globalThis as unknown as { Notification?: unknown }).Notification;
    } else {
      (globalThis as unknown as { Notification: unknown }).Notification = original;
    }
  });

  it("getNotificationPermission returns 'default' when Notification is undefined", () => {
    const original = (globalThis as unknown as { Notification?: unknown })
      .Notification;
    delete (globalThis as unknown as { Notification?: unknown }).Notification;

    expect(getNotificationPermission()).toBe("default");

    if (original !== undefined) {
      (globalThis as unknown as { Notification: unknown }).Notification = original;
    }
  });
});

describe("digestBody", () => {
  it("produces the PRD-mandated phrase with the right emoji mix", () => {
    expect(digestBody(0)).toBe("");
    expect(digestBody(1)).toBe("1 plants need you today 💧🌱");
    expect(digestBody(3)).toBe("3 plants need you today 💧🌱");
    expect(digestBody(7)).toBe("7 plants need you today 💧🌱");
  });
});

describe("default digest time constants", () => {
  it("defaults to 08:00 local", () => {
    expect(DEFAULT_DIGEST_HOUR).toBe(8);
    expect(DEFAULT_DIGEST_MINUTE).toBe(0);
  });
});