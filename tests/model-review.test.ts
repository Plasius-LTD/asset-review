import { describe, expect, it, vi } from "vitest";
import {
  assessModelCandidateReview, confirmReviewedModelCandidate, ModelCandidateReviewError,
  createStandardReviewCaptureRequests, normalizeReviewReport,
} from "../src/index.js";
import { candidateInput, confirmationInput } from "./model-review-fixture.js";

describe("canonical model review", () => {
  it.each([[0, "none"], [.499999, "none"], [.5, "low"], [.749999, "low"], [.75, "high"], [1, "high"]])(
    "derives score %s as %s without granting confirmation", (score, assurance) => {
      const raw = candidateInput(); raw.match.score = score as number;
      const result = assessModelCandidateReview(raw);
      expect(result.assurance.assurance).toBe(assurance);
      expect(result.candidate.match.assurance).toBe(assurance);
      expect(result.confirmationReady).toBe(assurance !== "none");
      expect(result).not.toHaveProperty("confirmation");
      expect(result).not.toHaveProperty("promotionReady");
    },
  );

  it("persists the published policy's evidence ceiling and stable reasons", () => {
    const raw = candidateInput(); raw.match.ranker.evidenceMode = "text-only";
    raw.match.ranker.assuranceCeiling = "low";
    const result = assessModelCandidateReview(raw);
    expect(result.assurance).toMatchObject({ valid: true, score: .91, rawAssurance: "high",
      assurance: "low", evidenceMode: "text-only", exactMatch: false,
      declaredAssuranceCeiling: "low", appliedAssuranceCeiling: "low",
      reasonCodes: ["text-only-assurance-ceiling"] });
    expect(result.candidate.match.reasonCodes).toContain("text-only-assurance-ceiling");
  });

  it.each(["low", "none"] as const)("honors a declared %s ceiling", (ceiling) => {
    const raw = candidateInput(); raw.match.ranker.assuranceCeiling = ceiling;
    expect(assessModelCandidateReview(raw).assurance).toMatchObject({ assurance: ceiling,
      declaredAssuranceCeiling: ceiling, reasonCodes: ["ranker-assurance-ceiling"] });
  });

  it("retains exact-identifier evidence using the canonical policy", () => {
    const raw = candidateInput(); raw.match.ranker.evidenceMode = "exact-identifier";
    raw.match.exactMatch = true; raw.match.score = .2;
    expect(assessModelCandidateReview(raw).assurance).toMatchObject({ assurance: "high", exactMatch: true, evidenceMode: "exact-identifier" });
  });

  it.each(["malware-scan", "technical-validation", "human-review", "accessibility-review"])(
    "never lets confidence or semantic override bypass %s", (kind) => {
      const raw = candidateInput(); const gate = raw.hardGates.find(g => g.kind === kind)!;
      gate.outcome = "blocked"; gate.reasonCodes = ["fixture-blocked"];
      expect(assessModelCandidateReview(raw).confirmationReady).toBe(false);
      expect(() => confirmReviewedModelCandidate(raw, { ...confirmationInput(), semanticRiskAccepted: true })).toThrow(ModelCandidateReviewError);
    },
  );

  it.each(["quarantined", "blocked"] as const)("retains %s rights as an independent gate", (status) => {
    const raw = candidateInput(); raw.rights.status = status;
    expect(assessModelCandidateReview(raw).confirmationReady).toBe(false);
    expect(() => confirmReviewedModelCandidate(raw, confirmationInput())).toThrow(ModelCandidateReviewError);
  });

  it("allows attribution-required rights only with complete public attribution", () => {
    const raw = candidateInput(); raw.rights.status = "attribution-required";
    raw.rights.attribution = { title: "Synthetic table", creator: "Synthetic studio", notice: "Fixture notice", sourcePageUri: "https://example.test/model" };
    expect(assessModelCandidateReview(raw).confirmationReady).toBe(true);
    delete raw.rights.attribution;
    expect(() => assessModelCandidateReview(raw)).toThrow(ModelCandidateReviewError);
  });

  it("rejects a false claimed technical pass and retains a valid failed constraint", () => {
    const raw = candidateInput(); raw.match.request.hardConstraints.maxTriangles = 1;
    expect(() => assessModelCandidateReview(raw)).toThrow(ModelCandidateReviewError);
    raw.match.hardConstraintPass = false; raw.match.reasonCodes = ["triangle-budget-exceeded"];
    expect(assessModelCandidateReview(raw).confirmationReady).toBe(false);
    expect(assessModelCandidateReview(raw).assurance.reasonCodes).toContain("hard-constraint-failed");
  });

  it("retains converter and fidelity failures independently", () => {
    const raw = candidateInput(); raw.processingManifest.converter.diagnostics[0]!.severity = "blocking";
    raw.processingManifest.fidelityGate.outcome = "blocked"; raw.match.reasonCodes.push("fidelity-blocked");
    expect(assessModelCandidateReview(raw).confirmationReady).toBe(false);
    const other = candidateInput(); other.processingManifest.fidelityGate.outcome = "blocked";
    other.processingManifest.fidelityEvidence[0]!.outcome = "lost";
    other.match.reasonCodes.push("fidelity-blocked");
    expect(assessModelCandidateReview(other).confirmationReady).toBe(false);
    expect(() => confirmReviewedModelCandidate(other, confirmationInput())).toThrow(ModelCandidateReviewError);
  });

  it.each([
    (r: ReturnType<typeof candidateInput>) => { r.views.pop(); },
    r => { r.views[1]!.kind = "front"; },
    r => { r.views[1]!.imageUri = r.views[0]!.imageUri; },
    r => { r.views[0]!.imageUri = "https://example.test/private?token=secret"; },
    r => { r.views[0]!.imageUri = "mcp://models/resolutions/wrong/candidates/candidate-1/front.png"; },
    r => { Reflect.set(r.views[0]!, "width", 4096); },
    r => { Reflect.set(r.views[0]!, "contentType", "text/html"); },
    r => { r.views[0]!.sha256 = "0".repeat(64); },
    r => { r.renderEvidence.processingManifestId = "wrong-manifest"; },
    r => { r.provenance.contentHash = "0".repeat(64); },
    r => { r.rights.sourceAssetId = "another-source"; },
    r => { r.hardGates[0]!.subjectContentHash = "0".repeat(64); },
    r => { r.hardGates.pop(); },
    r => { r.hardGates[1]!.kind = r.hardGates[0]!.kind; },
    r => { r.match.candidateId = "different-candidate"; },
    r => { r.confirmationRequired = false as true; },
  ])("rejects unsafe or unbound canonical evidence", (mutate) => {
    const raw = candidateInput(); mutate(raw);
    expect(() => assessModelCandidateReview(raw)).toThrow(ModelCandidateReviewError);
    expect(() => confirmReviewedModelCandidate(raw, confirmationInput())).toThrow(ModelCandidateReviewError);
  });

  it("requires explicit high-assurance human confirmation and rejects an unnecessary override", () => {
    const raw = candidateInput(); const confirmation = confirmationInput();
    expect(() => confirmReviewedModelCandidate(raw, undefined)).toThrow(ModelCandidateReviewError);
    const result = confirmReviewedModelCandidate(raw, confirmation);
    expect(result.confirmation.confirmedBy).toBe("requester-42");
    expect(result.duplicate).toBe(false);
    expect(result).not.toHaveProperty("promotionReady");
    expect(() => confirmReviewedModelCandidate(raw, { ...confirmation, semanticRiskAccepted: true })).toThrow(ModelCandidateReviewError);
  });

  it("requires low-assurance risk acceptance and never confirms none", () => {
    const raw = candidateInput(); raw.match.score = .6;
    expect(() => confirmReviewedModelCandidate(raw, confirmationInput())).toThrow(ModelCandidateReviewError);
    const confirmation = { ...confirmationInput(), semanticRiskAccepted: true };
    expect(confirmReviewedModelCandidate(raw, confirmation).assurance.assurance).toBe("low");
    raw.match.score = .4;
    expect(() => confirmReviewedModelCandidate(raw, confirmation)).toThrow(ModelCandidateReviewError);
  });

  it.each([
    { resolutionId: "another-resolution" }, { candidateId: "another-candidate" },
    { confirmationToken: "different_opaque_token_0123456789abcdef" },
    { viewSha256s: ["0".repeat(64), "2".repeat(64), "3".repeat(64), "4".repeat(64)] },
    { viewSha256s: [] }, { confirmedBy: "" }, { confirmedAt: "2026-07-11T12:15:00.000Z" },
    { semanticRiskAccepted: "yes" }, { promotionReady: true },
  ])("rejects malformed/rebound confirmation %j", (patch) => {
    expect(() => confirmReviewedModelCandidate(candidateInput(), { ...confirmationInput(), ...patch })).toThrow(ModelCandidateReviewError);
  });

  it("identifies exact replay and rejects conflicting prior evidence", () => {
    const raw = candidateInput(); const confirmation = confirmationInput();
    const first = confirmReviewedModelCandidate(raw, confirmation);
    const replay = confirmReviewedModelCandidate(raw, confirmation, first.confirmation);
    expect(replay.duplicate).toBe(true); expect(replay.confirmation).toEqual(first.confirmation);
    expect(() => confirmReviewedModelCandidate(raw, { ...confirmation, confirmationId: "other" }, first.confirmation)).toThrow(ModelCandidateReviewError);
    expect(() => confirmReviewedModelCandidate(raw, confirmation, null)).toThrow(ModelCandidateReviewError);
  });

  it("owns immutable copies while leaving caller data mutable", () => {
    const raw = candidateInput(); const confirmation = confirmationInput();
    const result = confirmReviewedModelCandidate(raw, confirmation);
    const frozen = (value: unknown): void => {
      if (value !== null && typeof value === "object") { expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen); }
    };
    frozen(result);raw.views[0]!.sha256 = "0".repeat(64); confirmation.confirmedBy = "another-requester";
    expect(result.candidate.views[0].sha256).toBe("1".repeat(64));
    expect(result.confirmation.confirmedBy).toBe("requester-42");
    expect(Object.isFrozen(raw)).toBe(false);
  });

  it.each([null, undefined, 42, "secret-value", [], new Date(), { source: "secret-value" }])("fails closed on malformed input", (value) => {
    expect(() => assessModelCandidateReview(value)).toThrow(ModelCandidateReviewError);
  });

  it("rejects accessors without invoking them and masks arbitrary exception messages", () => {
    const raw = candidateInput(); const getter = vi.fn(() => raw.views);
    Object.defineProperty(raw, "views", { get: getter });
    expect(() => assessModelCandidateReview(raw)).toThrow(ModelCandidateReviewError);expect(getter).not.toHaveBeenCalled();
    const proxy = new Proxy({}, { ownKeys() { throw new Error("private-value"); } });
    try { assessModelCandidateReview(proxy); expect.fail(); } catch (error) {
      expect(error).toBeInstanceOf(ModelCandidateReviewError); expect((error as Error).message).not.toContain("private-value");
    }
  });

  it.each([
    (r: Record<string, unknown>) => { r.extra = r; },
    r => { r.extra = "x".repeat(2049); },
    r => { r.extra = Array(1025).fill(null); },
    r => { Reflect.set(r, Symbol("secret"), true); },
    r => { Object.defineProperty(r, "extra", { value: true, enumerable: false }); },
    r => { r.views = new Array(4); },
    r => { r.views = Object.assign([], { extra: true }); },
    r => { r.extra = NaN; },
  ])("bounds and validates the raw data graph", (mutate) => {
    const raw = candidateInput(); mutate(raw as unknown as Record<string, unknown>);
    expect(() => assessModelCandidateReview(raw)).toThrow(ModelCandidateReviewError);
  });

  it("enforces total resource ceilings before contract traversal", () => {
    const tooManyValues = Array.from({ length: 1024 }, () => Array(65).fill(null));
    const tooManyCharacters = Array(1024).fill("x".repeat(2048));
    const tooManyKeys = Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`key${i}`, true]));
    for (const extra of [tooManyValues, tooManyCharacters, tooManyKeys]) {
      expect(() => assessModelCandidateReview({ ...candidateInput(), extra })).toThrow(ModelCandidateReviewError);
      try { assessModelCandidateReview({ ...candidateInput(), extra }); expect.fail(); } catch (error) {
        expect(error).toMatchObject({ code: "limit-exceeded" });
      }
    }
  });

  it("accepts null-prototype records and rejects array accessors without invocation", () => {
    expect(assessModelCandidateReview(Object.assign(Object.create(null), candidateInput())).confirmationReady).toBe(true);
    const raw = candidateInput(); const getter = vi.fn(() => raw.views[0]);
    Object.defineProperty(raw.views, "0", { get: getter });
    expect(() => assessModelCandidateReview(raw)).toThrow(ModelCandidateReviewError);
    expect(getter).not.toHaveBeenCalled();
  });

  it("keeps existing generic review APIs available", () => {
    expect(createStandardReviewCaptureRequests()).toHaveLength(12);
    expect(normalizeReviewReport({ assetId: "fixture", version: "1.0.0", source: { kind: "human", id: "reviewer" }, captures: [{ kind: "front", artifactPath: "front.png" }], findings: [], reviewedAt: "2026-10-28T00:00:00Z" }).approvalReady).toBe(true);
  });
});
