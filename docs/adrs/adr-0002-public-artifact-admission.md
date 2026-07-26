# ADR 0002: Public artifact admission

- Status: Accepted
- Date: 2026-07-26
- Feature flag: `platform.public-artifact-integrity.enabled`

## Context

Administrative contributor records are not runtime package inputs. Including
such a record in source or an immutable npm tarball creates an unnecessary
public-data surface and makes correction harder than preventing admission.

Package CI uses controlled self-hosted capacity. npm trusted publishing,
however, requires a supported cloud-hosted runner and an OIDC identity tied to
the repository, workflow, and optional deployment environment. Node 24.18 LTS
bundles an npm client above the trusted-publishing minimum, so the workflow
does not need a separately installed global npm client.

## Decision

- Remove the administrative contributor registry from the current source tip.
- Ignore the exact path locally and reject its case-normalized equivalent from
  both the Git index and `npm pack --dry-run --json` inventory.
- Run the admission check in CI and again immediately before publication.
- Keep CI on approved self-hosted runners.
- Run npm publication on `ubuntu-latest`, through the GitHub `production`
  environment, with Node 24.18 LTS, `id-token: write`, and npm trusted
  publishing.
- Do not use a long-lived npm write token.

## Consequences

The package cannot be promoted while the administrative registry is tracked or
packaged. Publication requires the npm package's trusted-publisher settings to
match `Plasius-LTD/asset-review`, `cd.yml`, and the `production` environment.
Rollback disables the release workflow; it never restores the removed record.
