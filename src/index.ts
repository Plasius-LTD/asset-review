export const ASSET_REVIEW_PACKAGE = "@plasius/asset-review";

export const REVIEW_CAPTURE_KINDS = Object.freeze([
  "hero",
  "front",
  "back",
  "left",
  "right",
  "top",
  "material-closeup",
  "wireframe-density",
  "normal-debug",
  "lod-comparison",
  "collision-proxy",
  "scale-reference",
] as const);

export type ReviewCaptureKind = typeof REVIEW_CAPTURE_KINDS[number];

export interface ReviewCaptureRequest {
  readonly kind: ReviewCaptureKind;
  readonly cameraPreset: string;
  readonly width: number;
  readonly height: number;
  readonly debugView?: string;
}

export interface ReviewFindingSummary {
  readonly blocking: number;
  readonly warnings: number;
  readonly informational: number;
  readonly passed: boolean;
}

export interface ReviewFindingLike {
  readonly severity: "blocking" | "warning" | "info";
}

export function createStandardReviewCaptureRequests(
  width = 1600,
  height = 1000
): readonly ReviewCaptureRequest[] {
  return Object.freeze(
    REVIEW_CAPTURE_KINDS.map((kind) =>
      Object.freeze({
        kind,
        cameraPreset: kind,
        width,
        height,
        debugView: kind.includes("debug") || kind.includes("wireframe") ? kind : undefined,
      })
    )
  );
}

export function summarizeReviewFindings(findings: readonly ReviewFindingLike[]): ReviewFindingSummary {
  const blocking = findings.filter((finding) => finding.severity === "blocking").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const informational = findings.filter((finding) => finding.severity === "info").length;
  return Object.freeze({
    blocking,
    warnings,
    informational,
    passed: blocking === 0,
  });
}
