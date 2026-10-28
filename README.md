# @plasius/asset-review

[![npm version](https://img.shields.io/npm/v/@plasius/asset-review.svg)](https://www.npmjs.com/package/@plasius/asset-review)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/asset-review/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/asset-review/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/asset-review)](https://codecov.io/gh/Plasius-LTD/asset-review)
[![License](https://img.shields.io/github/license/Plasius-LTD/asset-review)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Screenshot review plans and AI review policy helpers for Plasius asset promotion.

## Install

```bash
npm install @plasius/asset-review
```

## Scope

This package is part of the unified AI asset pipeline package family. It is scaffolded from the standard `@plasius/*` package template and owns the asset review boundary described in the Plasius asset pipeline design.

## Feature Flag

- `asset.pipeline.unified-ai-assets.enabled`

The backend's stored flag governs caller rollout; this deterministic library does
not read environment variables or contact the flag service. Disable the stored
flag to pause new pipeline reviews/promotion, while keeping mandatory validation
active. Callers enforce `asset.catalog.review` and the applicable confirmation
and approval capabilities from Feature 903. Normalization grants no authority.

## Normalize review evidence

```ts
import { normalizeReviewReport, ReviewReportValidationError } from "@plasius/asset-review";

try {
  const report = normalizeReviewReport({
    assetId: "demo-chair",
    version: "1.2.3",
    source: { kind: "ai", id: "review-service", model: "review-model-v1" },
    captures: [{ kind: "hero", artifactPath: "review/hero.png" }],
    findings: [{
      severity: "warning",
      code: "MESH_DENSITY",
      message: "Consider a simpler mesh.",
      artifactPath: "review/hero.png",
      evidenceUri: "https://evidence.example/reviews/123",
    }],
    reviewedAt: "2026-10-23T12:34:56Z",
  });
  // report.passed and report.approvalReady are true: ready for human review.
  // A blocking finding makes both false; warnings/info remain in the report.
  // Attach this evidence to your separately authorized approval workflow.
} catch (error) {
  if (error instanceof ReviewReportValidationError) {
    // Stable code: INVALID_REVIEW_REPORT; bounded diagnostics omit raw input.
  } else {
    throw error;
  }
}
```

`ReviewReportInput`, `NormalizedReviewReport`, `ReviewSource`, and
`ReviewCaptureEvidence` are exported. The output extends the canonical
`AssetReviewReport`; identifiers, immutable version validation, severity taxonomy
and capture kinds reuse published `@plasius/asset-contracts@0.4.6`. Existing
capture-planning and typed severity-summary APIs retain their behavior. Use
`normalizeReviewReport(unknown)` at untrusted boundaries; the older
`summarizeReviewFindings` helper assumes already validated typed input.

The normalizer accepts plain data records and dense arrays, rejects unknown
fields/accessors, and copies/freezes the report, source, captures, findings and
summary. It derives `passed`, `approvalReady`, and severity counts; supplying
these fields in the input is an error. Warning/info-only and empty finding lists
are non-blocking. Human sources use `{ kind: "human", id: "reviewer-123" }`;
AI sources also require a model identifier. Source IDs are opaque tokens, never
names, email addresses or credentials.

- Asset IDs are canonical lowercase kebab-case, at most 128 characters. Versions
  are exact immutable tokens (no `latest`, ranges or wildcards).
- Source IDs/models and finding codes are trimmed ASCII tokens of 1–128
  characters, starting with an alphanumeric and containing alphanumerics,
  dots, underscores or hyphens. Messages are trimmed, nonblank single-line
  strings of at most 4096 characters; control characters are rejected.
- A report contains 1–12 captures with canonical kinds and unique kinds/paths,
  plus 0–1000 findings. Finding artifact/evidence references are optional.
- Artifact paths are relative ASCII paths of at most 1024 characters. Each
  segment starts with an alphanumeric and contains alphanumerics, dots,
  underscores or hyphens. Absolute paths, dot segments, empty segments,
  backslashes, encoding, query strings and fragments are rejected.
- Evidence URIs are HTTPS references of at most 2048 characters with a DNS
  hostname, no credentials, query, fragment, encoding or dot segments.
  Local/numeric hostnames are rejected. The normalizer never fetches them;
  URI validation is not network admission or proof of artifact authenticity.
- `reviewedAt` is a real UTC calendar timestamp, `YYYY-MM-DDTHH:mm:ss[.SSS]Z`,
  with zero to three fractional digits, normalized to millisecond precision.

`approvalReady` means the structurally valid report has no blocking finding.
It does not prove evidence exists, bind hashes, authenticate the reviewer,
verify rights/malware/accessibility/fidelity, require a complete four-view pack,
or replace human confirmation. The consuming pipeline must enforce all of
those gates and manifest identity before promotion, including Feature 903's
four deterministic views. Render AI messages as text. No AI invocation, network
request, filesystem access, logging, retry or global mutation occurs here.

The synchronous API imports canonical contracts directly; it cannot defer
validation until an asynchronous import. The lockfile also records the existing
contract package's GPU shader/reflection dependencies and optional browser
tooling. No local/unpublished package references are used. See
[ADR 0004](docs/adrs/adr-0004-normalized-review-reports.md) for the boundary,
tests and release route.

## Four-view model confirmation

```ts
import {
  assessModelCandidateReview,
  confirmReviewedModelCandidate,
} from "@plasius/asset-review";

const review = assessModelCandidateReview(candidatePayload);
if (review.confirmationReady) {
  // Obtain an explicit authenticated human decision over this exact view pack.
  const result = confirmReviewedModelCandidate(
    review.candidate,
    humanConfirmationPayload,
    previouslyStoredConfirmation, // optional; an exact replay sets duplicate=true
  );
  // Persist through the host's atomic confirmation/idempotency boundary.
}
```

These additive helpers reuse published `@plasius/asset-contracts@0.4.6` evidence
validators and `@plasius/ai-governance@0.1.10` assurance policy. The returned
`assurance` snapshot retains raw score/band, effective band, evidence mode,
exact-match status, declared/applied ceilings, policy version and stable ceiling
reasons. Ordinary scores below 0.50 are none, 0.50 to below 0.75 are low, and
0.75 or above are high; canonical exact-identifier evidence and declared/evidence
ceilings apply. Text-only evidence cannot exceed low. Malformed input throws
`ModelCandidateReviewError` with a value-free stable `code`.

Candidates require unique, identity-scoped front/left/top/isometric PNG originals
at 1024×1024, matching render hashes and canonical processing/rights/provenance
evidence. Technical, malware, human/accessibility review, converter and fidelity
gates remain independent of semantic confidence. None cannot be confirmed;
low requires explicit `semanticRiskAccepted: true`, while high requires false.
Confirmation binds candidate/resolution, opaque token, ordered view hashes,
reviewer identity and evidence time. A different valid prior confirmation fails
with `confirmation-conflict`; exact replay returns `duplicate: true`.

`confirmationReady` is structural policy, never approval or promotion authority.
The host must authenticate and bind `confirmedBy` to the actual human, enforce
confirmation/review capabilities, verify token signatures and referenced image
bytes/render integrity, and compare-and-set durable state atomically. These pure
helpers perform no network/file I/O, cryptographic verification, rendering,
persistence, token issuance or promotion. Supplied prior evidence is not a
substitute for querying the authoritative store. Neither helper returns a
`promotionReady` grant. Existing capture/normalization APIs are unchanged.

Raw inputs must be plain data records and dense ordinary arrays without
accessors, symbol/hidden properties or prototype keys. Traversal is bounded to
65,536 values, 1,048,576 characters, depth 24, 1,024 items per array, 64 keys per
record and 2,048 characters per string; canonical field limits also apply.
Outputs own deeply frozen copies. Disable/unavailable parent stored rollout
flag means callers pause new orchestration; input/human gates stay mandatory.
Rollback consumption through the consumer's approved release route, retaining
these gates. Consumers may dynamically import at their asynchronous review
entry point; the deterministic library adds no remote evaluator or env switch.

See [ADR 0005](docs/adrs/adr-0005-four-view-model-confirmation.md) for trust,
idempotency, dependency and test boundaries.

## Related Documents

- plasius-ltd-site `docs/Design/unified-ai-asset-pipeline.md`
- plasius-ltd-site `docs/adrs/adr-0084-unified-ai-asset-pipeline-packages.md`
- plasius-ltd-site `docs/tdrs/tdr-0004-unified-ai-asset-pipeline.md`

## Development

```bash
npm install
npm run build
npm test
npm run test:coverage
npm run pack:check
```

`pack:check` fails closed if the administrative contributor registry is tracked
or appears in the npm tarball inventory. CI remains on approved self-hosted
capacity for same-repository pull requests and `main`, while fork PR code is
denied. npm publication runs only from the GitHub-hosted `production` job using
Node 24 and npm 11.5.1 or newer. It remains token-free and is admitted only
while the prepared SHA is the exact `main` head after successful push CI.

## Governance

- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- ADRs: [docs/adrs](./docs/adrs)
- CLA and legal docs: [legal](./legal)

## License

Apache-2.0
