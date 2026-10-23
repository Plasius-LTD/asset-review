import {
  ASSET_REVIEW_SEVERITIES,
  ASSET_SCREENSHOT_KINDS,
  assertAssetId,
  assertImmutableAssetVersion,
  type AssetReviewFinding,
  type AssetReviewReport,
  type AssetScreenshotKind,
} from "@plasius/asset-contracts";
import { summarizeReviewFindings, type ReviewFindingSummary } from "./review-findings.js";

/** Stable, non-personal reviewer/service identity; AI sources also identify a model. */
export type ReviewSource =
  | Readonly<{ kind: "human"; id: string }>
  | Readonly<{ kind: "ai"; id: string; model: string }>;

/** Package-relative evidence reference; normalization does not read the artifact. */
export interface ReviewCaptureEvidence {
  readonly kind: AssetScreenshotKind;
  readonly artifactPath: string;
}

/** Provider-neutral payload. Derived disposition fields cannot be supplied. */
export interface ReviewReportInput {
  readonly assetId: string;
  readonly version: string;
  readonly source: ReviewSource;
  readonly captures: readonly ReviewCaptureEvidence[];
  readonly findings: readonly AssetReviewFinding[];
  readonly reviewedAt: string;
}

/** Structurally validated evidence ready for a separate, authorized human review. */
export interface NormalizedReviewReport extends AssetReviewReport {
  readonly source: ReviewSource;
  readonly captures: readonly ReviewCaptureEvidence[];
  readonly summary: ReviewFindingSummary;
  /** True only when no blocking finding exists; never grants approval/promotion. */
  readonly approvalReady: boolean;
}

/** Bounded diagnostics deliberately exclude supplied values and arbitrary property names. */
export class ReviewReportValidationError extends Error {
  readonly code = "INVALID_REVIEW_REPORT";

  constructor(field = "input") {
    super(`Invalid review report: ${field}.`);
    this.name = "ReviewReportValidationError";
  }
}

class InvalidReviewField extends Error {}

function invalid(field: string): never {
  throw new InvalidReviewField(field);
}

function record(value: unknown, keys: readonly string[], field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid(field);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(field);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length > keys.length) invalid(field);
  for (const key of ownKeys) {
    if (typeof key !== "string" || !keys.includes(key)) invalid(field);
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, "value")) invalid(field);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number, field: string): string {
  if (typeof value !== "string" || value.length > max
    || Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) invalid(field);
  const result = value.trim();
  if (!result) invalid(field);
  return result;
}

function token(value: unknown, field: string): string {
  const result = text(value, 128, field);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(result)) invalid(field);
  return result;
}

function relativePath(value: unknown, field: string): string {
  if (typeof value !== "string" || !value || value.length > 1024) invalid(field);
  if (!value.split("/").every((part) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(part))) invalid(field);
  return value;
}

function evidenceUri(value: unknown): string {
  const field = "finding.evidenceUri";
  const uri = text(value, 2048, field);
  // Check the original text before URL parsing can erase dot segments/backslashes.
  if (/[\\%]/u.test(uri) || uri.split("/").some((part) => part === "." || part === "..")) invalid(field);
  const url = new URL(uri);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) invalid(field);
  const host = url.hostname;
  if (!host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local") || /^[\d.]+$/u.test(host)) invalid(field);
  return url.href;
}

function timestamp(value: unknown): string {
  const field = "reviewedAt";
  if (typeof value !== "string" || value.length > 24
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value)) invalid(field);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== value.slice(0, 19)) invalid(field);
  return date.toISOString();
}

function source(value: unknown): ReviewSource {
  const input = record(value, ["kind", "id", "model"], "source");
  const id = token(input.id, "source.id");
  if (input.kind === "ai") return Object.freeze({ kind: "ai", id, model: token(input.model, "source.model") });
  if (input.kind !== "human" || Object.hasOwn(input, "model")) invalid("source");
  return Object.freeze({ kind: "human", id });
}

function capture(value: unknown): ReviewCaptureEvidence {
  const input = record(value, ["kind", "artifactPath"], "capture");
  const kind = ASSET_SCREENSHOT_KINDS.find((kind) => kind === input.kind);
  if (kind === undefined) invalid("capture.kind");
  return Object.freeze({ kind, artifactPath: relativePath(input.artifactPath, "capture.artifactPath") });
}

function finding(value: unknown): AssetReviewFinding {
  const input = record(value, ["severity", "code", "message", "artifactPath", "evidenceUri"], "finding");
  const severity = ASSET_REVIEW_SEVERITIES.find((severity) => severity === input.severity);
  if (severity === undefined) invalid("finding.severity");
  return Object.freeze({
    severity,
    code: token(input.code, "finding.code"),
    message: text(input.message, 4096, "finding.message"),
    ...(input.artifactPath === undefined ? {} : { artifactPath: relativePath(input.artifactPath, "finding.artifactPath") }),
    ...(input.evidenceUri === undefined ? {} : { evidenceUri: evidenceUri(input.evidenceUri) }),
  });
}

function boundedArray(value: unknown, min: number, max: number, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(field);
  if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) invalid(field);
  const items: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(value, String(index));
    if (property === undefined || !Object.hasOwn(property, "value")) invalid(field);
    items.push(property.value);
  }
  return items;
}

/**
 * Validate a provider-neutral raw payload, copy/freeze evidence, and derive readiness.
 * Performs no I/O. Human authorization, evidence integrity and promotion remain caller gates.
 */
export function normalizeReviewReport(value: unknown): NormalizedReviewReport {
  try {
    const input = record(value, ["assetId", "version", "source", "captures", "findings", "reviewedAt"], "input");
    const assetId = assertAssetId(text(input.assetId, 128, "assetId"));
    const version = assertImmutableAssetVersion(input.version);
    const captures = Array.from(boundedArray(input.captures, 1, ASSET_SCREENSHOT_KINDS.length, "captures"), capture);
    if (new Set(captures.map((entry) => entry.kind)).size !== captures.length
      || new Set(captures.map((entry) => entry.artifactPath)).size !== captures.length) invalid("captures");
    const findings = Object.freeze(Array.from(boundedArray(input.findings, 0, 1000, "findings"), finding));
    const summary = summarizeReviewFindings(findings);
    return Object.freeze({
      assetId, version,
      source: source(input.source),
      captures: Object.freeze(captures),
      findings,
      reviewedAt: timestamp(input.reviewedAt),
      summary,
      passed: summary.passed,
      approvalReady: summary.passed,
    });
  } catch (error) {
    // Canonical validators, URL parsing and hostile accessors must not leak raw diagnostics.
    throw new ReviewReportValidationError(error instanceof InvalidReviewField ? error.message : "input");
  }
}
