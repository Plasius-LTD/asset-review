import { ASSET_SCREENSHOT_KINDS } from "@plasius/asset-contracts";

export { summarizeReviewFindings } from "./review-findings.js";
export type { ReviewFindingLike, ReviewFindingSummary } from "./review-findings.js";
export * from "./review-report.js";

export const ASSET_REVIEW_PACKAGE = "@plasius/asset-review";

export const REVIEW_CAPTURE_KINDS = ASSET_SCREENSHOT_KINDS;

export type ReviewCaptureKind = typeof REVIEW_CAPTURE_KINDS[number];

export interface ReviewCaptureRequest {
  readonly kind: ReviewCaptureKind;
  readonly cameraPreset: string;
  readonly width: number;
  readonly height: number;
  readonly debugView?: string;
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
