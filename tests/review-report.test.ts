import { describe, expect, it } from "vitest";
import {
  normalizeReviewReport,
  ReviewReportValidationError,
  type ReviewReportInput,
} from "../src/index.js";

function input() {
  return {
    assetId: "demo-chair",
    version: "1.2.3",
    source: { kind: "ai", id: "review-service", model: "review-model-v1" },
    captures: [{ kind: "hero", artifactPath: "review/hero.png" }],
    findings: [{
      severity: "warning", code: "MESH_DENSITY", message: " Consider a simpler mesh. ",
      artifactPath: "review/hero.png", evidenceUri: "https://evidence.example/reviews/123",
    }],
    reviewedAt: "2026-10-23T12:34:56.1Z",
  };
}

describe("normalized review reports", () => {
  it("preserves identity, provenance and evidence while deriving readiness", () => {
    const raw = input();
    const result = normalizeReviewReport(raw);
    expect(result).toEqual({
      ...raw,
      findings: [{ ...raw.findings[0], message: "Consider a simpler mesh." }],
      reviewedAt: "2026-10-23T12:34:56.100Z",
      summary: { blocking: 0, warnings: 1, informational: 0, passed: true },
      passed: true, approvalReady: true,
    });
    expect(raw.findings[0]?.message).toBe(" Consider a simpler mesh. ");
    const typed: ReviewReportInput = {
      ...raw,
      source: { kind: "human", id: "reviewer-123" },
      captures: [{ kind: "front", artifactPath: "review/front.png" }],
      findings: [],
    };
    expect(normalizeReviewReport(typed).source.kind).toBe("human");
  });

  it.each(["blocking", "warning", "info"] as const)("derives %s disposition", (severity) => {
    const raw = input();
    raw.findings = [{ ...raw.findings[0]!, severity }];
    const result = normalizeReviewReport(raw);
    expect(result.passed).toBe(severity !== "blocking");
    expect(result.approvalReady).toBe(severity !== "blocking");
    expect(result.summary.blocking + result.summary.warnings + result.summary.informational).toBe(1);
  });

  it("preserves warning and info findings alongside a blocker", () => {
    const raw = input();
    raw.findings = ["blocking", "warning", "info"].map((severity) => ({ ...raw.findings[0]!, severity }));
    expect(normalizeReviewReport(raw).summary).toEqual({
      blocking: 1, warnings: 1, informational: 1, passed: false,
    });
  });

  it("owns and deeply freezes its output without freezing caller objects", () => {
    const raw = input();
    const result = normalizeReviewReport(raw);
    for (const value of [result, result.findings, result.findings[0], result.captures, result.captures[0], result.source, result.summary]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    raw.findings[0]!.message = "Changed";
    raw.captures[0]!.artifactPath = "elsewhere.png";
    raw.source.id = "another-reviewer";
    expect(result.findings[0]?.message).toBe("Consider a simpler mesh.");
    expect(result.captures[0]?.artifactPath).toBe("review/hero.png");
    expect(result.source.id).toBe("review-service");
    expect(Object.isFrozen(raw.source)).toBe(false);
  });

  it.each([null, undefined, [], 42, "raw secret", new Date()])("rejects a non-record input %j", (raw) => {
    expect(() => normalizeReviewReport(raw)).toThrow(ReviewReportValidationError);
  });

  it.each([
    ["assetId", undefined], ["assetId", ""], ["assetId", "bad/id"], ["assetId", "a".repeat(129)],
    ["version", undefined], ["version", ""], ["version", "latest"], ["version", "1.x"],
    ["version", "^1.0.0"], ["version", "1.0.0\n"],
    ["source", null], ["source", {}], ["source", { kind: "ai", id: "service" }],
    ["source", { kind: "robot", id: "service" }],
    ["source", { kind: "human", id: "user@example.test" }],
    ["source", { kind: "human", id: "user", model: "model" }],
    ["source", { kind: "ai", id: "service", model: " " }],
    ["captures", []], ["captures", null], ["captures", new Array(1)],
    ["findings", null], ["findings", new Array(1)],
    ["reviewedAt", undefined], ["reviewedAt", "2026-02-30T00:00:00Z"],
    ["reviewedAt", "2026-13-01T00:00:00Z"], ["reviewedAt", "2026-10-23"],
    ["reviewedAt", "2026-10-23T12:34:56+00:00"], ["reviewedAt", "2026-10-23T12:34:56.1234Z"],
    ["reviewedAt", "2026-10-23T24:00:00Z"], ["reviewedAt", "not a date"],
    ["passed", true], ["approvalReady", true], ["summary", {}],
  ])("rejects invalid root %s", (field, value) => {
    expect(() => normalizeReviewReport({ ...input(), [field as string]: value })).toThrow(ReviewReportValidationError);
  });

  it.each([
    { severity: "fatal" }, { severity: null }, { code: " " }, { code: "bad code" },
    { code: "x".repeat(129) }, { message: " " }, { message: 1 },
    { message: "x".repeat(4097) }, { message: "bad\u0000message" }, { unexpected: "value" },
    { artifactPath: "../secret.txt" }, { evidenceUri: "javascript:alert(1)" },
    { evidenceUri: "https://user:password@evidence.example/report" },
    { evidenceUri: "https://evidence.example/report?signature=secret" },
    { evidenceUri: "https://evidence.example/report#secret" },
    { evidenceUri: "https://evidence.example/%2e%2e/report" },
    { evidenceUri: "https://evidence.example/../report" },
    { evidenceUri: "https://evidence.example\\report" },
    { evidenceUri: "https://127.0.0.1/report" }, { evidenceUri: "https://localhost/report" },
  ])("rejects malformed finding %j", (patch) => {
    expect(() => normalizeReviewReport({ ...input(), findings: [{ ...input().findings[0], ...patch }] }))
      .toThrow(ReviewReportValidationError);
  });

  it.each([
    "../hero.png", "/hero.png", "C:/hero.png", "a\\hero.png", "a/./hero.png", "a//hero.png",
    "a/../hero.png", "a/%2e%2e/hero.png", "a/hero.png?key=secret", "a/hero.png#fragment",
    "./hero.png", "a/hero.png\u0000", "ａ/hero.png", "a/hero.png\n", "x".repeat(1025),
  ])("rejects unsafe capture paths %j", (artifactPath) => {
    expect(() => normalizeReviewReport({ ...input(), captures: [{ kind: "hero", artifactPath }] }))
      .toThrow(ReviewReportValidationError);
  });

  it("rejects unknown capture kinds, fields, duplicate kinds and duplicate paths", () => {
    const capture = input().captures[0]!;
    for (const captures of [
      [{ ...capture, kind: "unknown" }], [{ ...capture, extra: true }],
      [capture, { ...capture, artifactPath: "review/other.png" }],
      [capture, { ...capture, kind: "front" }],
    ]) expect(() => normalizeReviewReport({ ...input(), captures })).toThrow(ReviewReportValidationError);
  });

  it("bounds input work before mapping arrays", () => {
    expect(() => normalizeReviewReport({ ...input(), findings: new Array(1001) })).toThrow(ReviewReportValidationError);
    expect(() => normalizeReviewReport({ ...input(), captures: new Array(13) })).toThrow(ReviewReportValidationError);
    const raw = input();
    raw.findings = Array.from({ length: 1000 }, () => ({ ...raw.findings[0]! }));
    expect(normalizeReviewReport(raw).summary.warnings).toBe(1000);
  });

  it("rejects array accessors, subclasses and custom iterators without invoking them", () => {
    const getter = Object.defineProperty([{}], "0", { get() { throw new Error("Unexpected getter"); } });
    const iterator = Object.assign([], { [Symbol.iterator]() { throw new Error("Unexpected iterator"); } });
    class CustomArray extends Array {}
    for (const findings of [getter, iterator, new CustomArray()]) {
      expect(() => normalizeReviewReport({ ...input(), findings })).toThrow(ReviewReportValidationError);
    }
  });

  it("accepts findings without optional references and UTC timestamps without a fraction", () => {
    const result = normalizeReviewReport({
      ...input(), reviewedAt: "2024-02-29T12:00:00Z",
      findings: [{ severity: "info", code: "OK", message: "Verified" }],
    });
    expect(result.reviewedAt).toBe("2024-02-29T12:00:00.000Z");
    expect(result.findings[0]).toEqual({ severity: "info", code: "OK", message: "Verified" });
  });

  it("returns bounded diagnostics without echoing hostile values or invoking getters", () => {
    const secret = "PRIVATE_VALUE_DO_NOT_ECHO";
    const getter = Object.defineProperty(input(), "assetId", { get() { throw new Error(secret); } });
    const proxy = new Proxy({}, { getPrototypeOf() { throw new Error(secret); } });
    const forged = new Proxy({}, { getPrototypeOf() { throw new ReviewReportValidationError(secret); } });
    const symbol = { ...input(), [Symbol(secret)]: true };
    for (const raw of [getter, proxy, forged, symbol, { ...input(), [secret]: secret }, { ...input(), assetId: secret }]) {
      try {
        normalizeReviewReport(raw);
        expect.fail("Expected validation failure");
      } catch (error) {
        expect(error).toBeInstanceOf(ReviewReportValidationError);
        expect((error as Error).message).not.toContain(secret);
        expect((error as Error).message.length).toBeLessThan(160);
        expect((error as ReviewReportValidationError).code).toBe("INVALID_REVIEW_REPORT");
      }
    }
  });
});
