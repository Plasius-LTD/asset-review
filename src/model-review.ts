import {
  createModelCandidate,
  createModelCandidateConfirmation,
  isModelCandidateConfirmable,
  type ModelCandidate,
  type ModelCandidateConfirmation,
} from "@plasius/asset-contracts";
import {
  resolveModelSearchAssurance,
  type EvaluatedModelSearchAssuranceDecision,
} from "@plasius/ai-governance";

/** Metadata-only ceilings; no images, resources or tokens are fetched or verified. */
export const MODEL_CANDIDATE_REVIEW_LIMITS = Object.freeze({
  values: 65_536, characters: 1_048_576, depth: 24,
  arrayItems: 1024, objectKeys: 64, stringLength: 2048,
});

/** Stable diagnostics exclude authored values, upstream messages and token contents. */
export class ModelCandidateReviewError extends TypeError {
  constructor(public readonly code: "invalid-input" | "limit-exceeded" | "confirmation-blocked" | "confirmation-conflict") {
    super(`Invalid model candidate review: ${code}.`);
    this.name = "ModelCandidateReviewError";
  }
}

/** Validated, immutable evidence for a separate authenticated human decision. */
export interface ModelCandidateReviewAssessment {
  readonly candidate: ModelCandidate;
  readonly assurance: EvaluatedModelSearchAssuranceDecision;
  /** Structural policy only. Never grants human, signature or promotion authority. */
  readonly confirmationReady: boolean;
}

/** Confirmation metadata; callers must authenticate, verify attestations and persist atomically. */
export interface ReviewedModelCandidateConfirmation extends ModelCandidateReviewAssessment {
  readonly confirmation: ModelCandidateConfirmation;
  /** Exact replay of supplied prior evidence; does not query or update durable state. */
  readonly duplicate: boolean;
}

class InvalidModelReviewInput extends Error {
  constructor(readonly code: ModelCandidateReviewError["code"]) { super(); }
}

function fail(code: ModelCandidateReviewError["code"] = "invalid-input"): never {
  throw new InvalidModelReviewInput(code);
}

function snapshot(value: unknown, budget = { values: MODEL_CANDIDATE_REVIEW_LIMITS.values, characters: MODEL_CANDIDATE_REVIEW_LIMITS.characters }, depth = 0): unknown {
  if (--budget.values < 0 || depth > MODEL_CANDIDATE_REVIEW_LIMITS.depth) fail("limit-exceeded");
  if (value === null || value === undefined || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) fail(); return value; }
  if (typeof value === "string") {
    budget.characters -= value.length;
    if (value.length > MODEL_CANDIDATE_REVIEW_LIMITS.stringLength || budget.characters < 0) fail("limit-exceeded");
    return value;
  }
  if (typeof value !== "object") fail();
  if (Array.isArray(value)) {
    if (value.length > MODEL_CANDIDATE_REVIEW_LIMITS.arrayItems) fail("limit-exceeded");
    if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) fail();
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index++) {
      const property = Object.getOwnPropertyDescriptor(value, String(index));
      if (!property || !("value" in property) || !property.enumerable) fail();
      result.push(snapshot(property.value, budget, depth + 1));
    }
    return result;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.length > MODEL_CANDIDATE_REVIEW_LIMITS.objectKeys) fail("limit-exceeded");
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    if (typeof key !== "string" || key.length > 128 || ["__proto__", "constructor", "prototype"].includes(key)) fail();
    budget.characters -= key.length;
    if (budget.characters < 0) fail("limit-exceeded");
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (!property || !("value" in property) || !property.enumerable) fail();
    result[key] = snapshot(property.value, budget, depth + 1);
  }
  return result;
}

function assess(input: unknown): ModelCandidateReviewAssessment {
  const candidate = createModelCandidate(snapshot(input));
  const match = candidate.match;
  const assurance = resolveModelSearchAssurance({
    score: match.score, hardConstraintPass: match.hardConstraintPass,
    evidenceMode: match.ranker.evidenceMode, exactMatch: match.exactMatch,
    assuranceCeiling: match.ranker.assuranceCeiling,
  });
  if (!assurance.valid || assurance.assurance !== match.assurance) fail();
  return Object.freeze({ candidate, assurance, confirmationReady: isModelCandidateConfirmable(candidate) });
}

function boundary<T>(operation: () => T): T {
  try { return operation(); } catch (error) {
    throw new ModelCandidateReviewError(error instanceof InvalidModelReviewInput ? error.code : "invalid-input");
  }
}

/** Compose canonical evidence validation with the published ranker assurance policy. No I/O. */
export function assessModelCandidateReview(candidateInput: unknown): ModelCandidateReviewAssessment {
  return boundary(() => assess(candidateInput));
}

/**
 * Validate one exact human confirmation and detect supplied prior replay/conflict.
 * This pure helper cannot authenticate people, verify signatures or grant promotion rights.
 */
export function confirmReviewedModelCandidate(
  candidateInput: unknown,
  confirmationInput: unknown,
  previousConfirmationInput?: unknown,
): ReviewedModelCandidateConfirmation {
  return boundary(() => {
    const assessment = assess(candidateInput);
    if (!assessment.confirmationReady) fail("confirmation-blocked");
    const { candidate } = assessment;
    const confirmation = createModelCandidateConfirmation(snapshot(confirmationInput), candidate, candidate.resolutionId);
    const duplicate = previousConfirmationInput !== undefined;
    if (duplicate) {
      const previous = createModelCandidateConfirmation(snapshot(previousConfirmationInput), candidate, candidate.resolutionId);
      if (JSON.stringify(previous) !== JSON.stringify(confirmation)) fail("confirmation-conflict");
    }
    return Object.freeze({ ...assessment, confirmation, duplicate });
  });
}
