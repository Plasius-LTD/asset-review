# Changelog

## Unreleased

- Refresh npm dependency lockfile to current supported stable versions (weekly maintenance, 2026-09-28).

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.5] - 2026-08-31

- **Added**
  - (placeholder)

- **Changed**
  - Enabled exact-head manual CI dispatch for reviewed release validation.
  - (placeholder)

- **Fixed**
  - Disabled package-manager caching on self-hosted CI to prevent cache-save
    cleanup stalls from blocking the validation queue.
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.4] - 2026-08-30

- **Added**
  - (placeholder)

- **Changed**
  - Kept CI on approved self-hosted runners while moving npm publication to a GitHub-hosted trusted-publishing job pinned to Node 24.18 LTS.
  - Bound publication to the exact prepared `main` commit after successful push-triggered CI.

- **Fixed**
  - (placeholder)

- **Security**
  - Removed the administrative contributor registry from the public source and package boundary and added fail-closed Git-index and tarball checks.
  - Refreshed vulnerable transitive build-tool dependencies used by local and CI validation.
  - Added a fail-closed npm 11.5.1-or-newer OIDC guard and denied fork PR code access to self-hosted CI.

## [0.1.3] - 2026-06-28

- **Added**
  - (placeholder)

- **Changed**
  - Refreshed development dependency baselines to `@types/node@26.0.1` and `eslint@10.6.0`.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.2] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.1] - 2026-06-21

- Scaffolded @plasius/asset-review for the unified AI asset pipeline.
- Corrected scaffold documentation to identify the asset-review package and ADR 0084 accurately.


[0.1.1]: https://github.com/Plasius-LTD/asset-review/releases/tag/v0.1.1
[0.1.2]: https://github.com/Plasius-LTD/asset-review/releases/tag/v0.1.2
[0.1.3]: https://github.com/Plasius-LTD/asset-review/releases/tag/v0.1.3
[0.1.4]: https://github.com/Plasius-LTD/asset-review/releases/tag/v0.1.4
[0.1.5]: https://github.com/Plasius-LTD/asset-review/releases/tag/v0.1.5
