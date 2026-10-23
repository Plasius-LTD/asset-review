import type { AssetReviewSeverity } from "@plasius/asset-contracts";

/** Severity-only input retained for callers that already validate their findings. */
export interface ReviewFindingLike {
  readonly severity: AssetReviewSeverity;
}

/** Deterministic disposition of validated review findings. */
export interface ReviewFindingSummary {
  readonly blocking: number;
  readonly warnings: number;
  readonly informational: number;
  readonly passed: boolean;
}

/** Summarize typed findings; use normalizeReviewReport for untrusted payloads. */
export function summarizeReviewFindings(findings: readonly ReviewFindingLike[]): ReviewFindingSummary {
  const blocking = findings.filter((finding) => finding.severity === "blocking").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const informational = findings.filter((finding) => finding.severity === "info").length;
  return Object.freeze({ blocking, warnings, informational, passed: blocking === 0 });
}
