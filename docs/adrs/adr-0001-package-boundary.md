# Architectural Decision Record (ADR)

## Title

Asset Review Package Boundary

---

## Status

- Accepted
- Date: 2026-05-27
- Version: 1.0

---

## Tags

assets, ai, pipeline, package-boundary

---

## Context

The unified AI asset pipeline needs stable package boundaries so local seed assets and AI-generated assets use one governed lifecycle without mixing contracts, processing, review, and MCP responsibilities.

---

## Decision

Keep screenshot review planning and AI review policy separate from rendering implementation and model processing.

Normalized review reports and approval-readiness policy are implemented here as
specified in ADR 0004. Reuse published `@plasius/asset-contracts` for the asset
identity/version validators, severity/capture vocabulary and base report shape.
The package validates evidence metadata without rendering, fetching artifacts,
invoking an AI provider, authenticating reviewers or granting promotion authority.

---

## Alternatives Considered

- Keep this responsibility inside plasius-ltd-site only: rejected because the contracts need to be reusable across backend, CI, MCP, and runtime consumers.
- Merge all asset pipeline responsibilities into one package: rejected because it would couple contracts, orchestration, processing, review, and MCP service surfaces.

---

## Consequences

- The package has a narrow public API and can evolve independently.
- Additional integration packages will compose these contracts rather than reimplement them.
- Follow-up tasks must wire package publishing and repository creation through approved workflows.

---

## Related Decisions

- plasius-ltd-site ADR 0069: Use a Unified AI Asset Pipeline with Dedicated Asset Packages
- plasius-ltd-site `docs/adrs/adr-0084-unified-ai-asset-pipeline-packages.md`
- plasius-ltd-site `docs/tdrs/tdr-0004-unified-ai-asset-pipeline.md`
- [ADR 0004: Normalized Review Reports](adr-0004-normalized-review-reports.md)
