# ADR 0004: Normalized Review Reports

Status: Accepted
Date: 2026-10-23
Task: [asset-review#12](https://github.com/Plasius-LTD/asset-review/issues/12)
Parent Feature: [site#903](https://github.com/Plasius-LTD/plasius-ltd-site/issues/903)
Parent Epic: site#902

## Problem

The typed severity counter cannot establish that raw AI/provider review payloads
are well formed. Downstream approval needs auditable asset/version identity,
findings, capture/evidence references, source metadata and a real reviewed time.
An AI-provided pass flag must not bypass blocking findings.

## Decision

Export a synchronous `normalizeReviewReport(unknown)` boundary and immutable
input/output/source/capture types. Extend the canonical `AssetReviewReport`.
Reuse the already public `@plasius/asset-contracts@0.4.6` ID and immutable-version
validators, severity taxonomy and screenshot kinds. Reuse the existing typed
summary helper internally; its original public behavior remains compatible.

Accept only plain data records and dense arrays. Reject unexpected fields,
accessors, malformed scalar data, unsafe references, duplicate capture kinds or
paths, mutable asset versions and invalid calendar timestamps. Bound reports to
12 captures and 1000 findings; codes/source tokens to 128 characters, messages to
4096, paths to 1024 and HTTPS references to 2048. Copy/freeze all output levels,
canonicalize UTC timestamps and derive pass/readiness from validated findings.
Errors have a stable code and bounded messages excluding supplied values.

Capture metadata is required, but this helper cannot establish artifact
existence/integrity or policy completeness. `approvalReady` means there are no
blocking findings in structurally valid evidence. It grants no approval or
promotion rights. Consumers must separately enforce manifest/hashes, identity,
four-view completeness, rights/malware/technical/accessibility/fidelity gates,
human confirmation and the appropriate review/approval capabilities. AI messages
remain untrusted display text. No I/O, provider calls, logging or retry is added.

## Alternatives

- Copy contract vocabulary/identity validators: rejected because it would drift
  from the shared package; the dependency is explicitly required for reuse.
- Trust provider pass/readiness flags or merely count typed severities: rejected
  because malformed payloads and blocking findings could become approval evidence.
- Put normalization in the site or contracts package: rejected because review
  policy belongs here under site ADR0084/TDR0004; contracts owns the base shape.
- Require a network/provider/renderer client: rejected because normalization
  must remain deterministic, portable and independently testable.

## Impact and rollout

This is an additive public API, released as a minor package version through the
existing focused PR -> CI -> permitted merge -> exact-main CI -> `cd.yml` on
main -> hosted production/OIDC publication route. No package version or dated
changelog release entry is edited manually. Verify actual public ESM/CJS exports,
strict declarations, registry integrity and hosted provenance before Task12 Done.
No site adoption/deployment or new provider recognition entry is delivered here.

Only the published canonical-contract dependency is added. Its transitive shader,
reflection and optional browser-tool dependencies are recorded by the lockfile;
existing dependencies are not updated. Synchronous validation requires the
canonical import immediately. Consumers may lazy-load this package at their
asynchronous review entry point. Existing capture/summary signatures remain.

Inherited flag: `asset.pipeline.unified-ai-assets.enabled`, evaluated from stored
backend state by callers, never from environment toggles. Disable the stored
flag to pause new review/promotion orchestration; validation remains mandatory.
The library does not call the flag service or add entitlement controls. Feature
903's caller capability/human-approval gates remain authoritative. Roll back
consumption to the prior published package through the consumer's approved release
path while retaining mandatory input/promotion validation; no local npm publish.

## Tests and NFRs

Failing-first public-entry tests cover valid AI/human sources, all severities,
mixed findings, missing/malformed values, unsafe paths/URIs, calendar rollover,
derived-field injection, bounds, sparse/accessor/custom arrays, opaque diagnostics
and deep-copy/freeze behavior. Run the full suite/coverage, lint, types, build,
package admission, frozen install, audits and actual packed/public consumer checks.
Every changed source file must appear in LCOV with >=80% total line coverage.

Security/privacy: bounded validated plain metadata, no raw-value diagnostics or
credentials in evidence references; no I/O/PII logging. Reliability/performance:
bounded linear processing without retries or dependency calls. Reproducibility:
exact direct contract version and frozen lockfile. Maintainability/testability:
canonical contracts and deterministic helpers. Observability: typed validation
errors for caller handling; library remains silent. Accessibility/SEO/UI/device
presentation N/A for a headless library; consumers render text safely. Deployment
safety: existing approved publication path, no backend/ACA change (secretref N/A).

## References

- [Package boundary](adr-0001-package-boundary.md)
- Site `docs/adrs/adr-0084-unified-ai-asset-pipeline-packages.md`
- Site `docs/tdrs/tdr-0004-unified-ai-asset-pipeline.md`
