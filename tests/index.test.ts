import { describe, expect, it } from "vitest";
import { REVIEW_CAPTURE_KINDS, createStandardReviewCaptureRequests, summarizeReviewFindings } from "../src/index.js";

describe("asset review", () => {
  it("builds the standard capture pack", () => {
    const requests = createStandardReviewCaptureRequests(1200, 800);
    expect(requests.map((request) => request.kind)).toEqual(REVIEW_CAPTURE_KINDS);
    expect(requests[0]?.width).toBe(1200);
    expect(requests.find((request) => request.kind === "normal-debug")?.debugView).toBe("normal-debug");
    expect(requests.find((request) => request.kind === "hero")?.debugView).toBeUndefined();
  });

  it("summarizes blocking findings", () => {
    expect(summarizeReviewFindings([{ severity: "warning" }, { severity: "blocking" }])).toEqual({
      blocking: 1,
      warnings: 1,
      informational: 0,
      passed: false,
    });

    expect(summarizeReviewFindings([{ severity: "info" }])).toEqual({
      blocking: 0,
      warnings: 0,
      informational: 1,
      passed: true,
    });
  });
});
