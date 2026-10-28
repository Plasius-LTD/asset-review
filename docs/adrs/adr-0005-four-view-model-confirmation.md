# ADR 0005: Four-view Model Review and Explicit Confirmation

Status: Accepted
Date: 2026-10-28
Task: [asset-review#15](https://github.com/Plasius-LTD/asset-review/issues/15)
Parent: site Story1484 / Feature903 / Epic902

## Problem

Generic capture plans and normalized AI findings cannot establish canonical
model-candidate identity, calibrated assurance or a human's explicit decision
over the exact four-view pack. Semantic confidence must never bypass hard gates.

## Decision

Add `assessModelCandidateReview(unknown)` and
`confirmReviewedModelCandidate(candidate, confirmation, previous?)` as additive
public APIs. Reuse the existing exact published asset-contracts0.4.6 constructors,
confirmability policy, immutable types, identity/resource/hash/time bindings,
independent gates and low-risk requirements. Consume the exact public
ai-governance0.1.10 assurance evaluator required by Task15/ai-governance36; do not
copy its thresholds, exact-identifier policy, evidence ceilings or reason codes.
Keep the full immutable assurance decision alongside the canonical assessment.

Before canonical traversal, snapshot bounded plain data without invoking ordinary
accessors. Reject sparse/custom arrays, hidden/symbol/prototype properties,
non-finite numbers, exotic objects and oversized graphs. Public limits cover
65,536 values,1,048,576 characters,depth24,1,024 array items,64 record keys and
2,048 characters per string. Canonical field limits remain authoritative.
Opaque stable errors exclude upstream exceptions, raw values, identities and
token contents. Outputs own frozen copies. JavaScript Proxies are not a sandbox;
host code must not execute arbitrary untrusted programs in this process.

Assessment returns `confirmationReady`, never a confirmation or promotion grant.
Confirmation requires the canonical explicit human metadata over exact identity,
opaque token and ordered hashes. None is blocked; low requires explicit semantic
risk acceptance; high rejects an unnecessary override. Independent rights,
provenance, technical, malware, human/accessibility, converter and fidelity gates
cannot be overridden. Exact prior evidence marks a duplicate; conflicting prior
evidence fails closed. No global mutable confirmation registry is introduced.

The host authenticates the human and binds confirmedBy, enforces capabilities,
verifies token signatures/image bytes/render integrity, supplies authoritative
prior state and performs atomic durable compare-and-set/idempotency. These
helpers never fetch resources, issue tokens, verify signatures or promote assets.
No `promotionReady` grant is returned. Model acknowledgements and recognition
pages remain owning site/provider Tasks; this adds no provider or source adapter.

## Alternatives and impact

- Reimplement canonical validators or assurance locally: rejected to avoid drift.
- Treat AI pass or high confidence as approval: rejected because all bands
  require the separate authenticated human decision and independent hard gates.
- Store replay state in process memory: rejected; distributed ACID/idempotency
  belongs at the host's durable transaction boundary.
- Add I/O, renderer, service or site-local policy: rejected; deterministic
  shared review policy belongs in this package.

Existing generic capture/summary/normalization signatures are unchanged. Only
the required ai-governance dependency is added (none→exact0.1.10); its existing
asset-contracts range resolves to our exact0.4.6. Other locked versions remain.
Use synchronous canonical validation; consumers can lazy-load at async entry.

## Rollout and release

Inherit `asset.pipeline.unified-ai-assets.enabled`, evaluated by the host from
the governed backend store. Disabled/unavailable state pauses new orchestration;
validation, independent hard gates and human confirmation remain mandatory.
Do not add env-only rollout, live-flag mutation or new entitlements here.
Existing Feature903 review/confirmation capabilities remain caller-owned.

Release an additive minor through focused PR, green required CI, permitted
squash merge, exact-main push CI, approved cd.yml/main prepare and GitHub-hosted
production/OIDC publication. No local publish or manual version/dated changelog
section edit. Verify public ESM/CJS/types, integrity and exact-source provenance.
Roll back consumer adoption through its approved release path while preserving
mandatory safety gates; parent Feature/Story completion is separate.

## Tests and NFRs

Public-entry failing-first tests cover score boundaries, ceiling/exact evidence,
each hard gate, view completeness/uniqueness/identity/dimensions/hash/resource
safety, confirmation binding/time/risk, replay/conflict, immutable copies,
malformed/accessor/cyclic/oversized graphs and existing API compatibility.
Run frozen install, full tests/coverage>=80% with each changed source in LCOV,
lint/types/build/admission, strict dependency tree/audits, packed/public consumer
and signature/provenance checks. No check or coverage threshold is weakened.

Security/privacy: bounded value-free diagnostics and canonical independent
validation, no secrets/logging/I/O. Reliability/performance/scalability: bounded
deterministic metadata traversal, no retries or distributed state. Host owns
concurrency/transactions. Maintainability/testability: canonical reuse, pure
functions and regression coverage. Observability: typed error codes and policy
reason snapshots. Reproducibility: exact required dependency and frozen lock.
UI/accessibility presentation, SEO/browser/device and ACA sensitive-secretrefs
are N/A for this headless npm-only change; accessibility-review evidence remains
mandatory. No new website/runtime pipeline is deployed by this Task.

## References

- [ADR0001 package boundary](adr-0001-package-boundary.md)
- [ADR0004 normalized reports](adr-0004-normalized-review-reports.md)
- Site ADR0084 and TDR0004 unified asset-pipeline design
