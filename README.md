# @plasius/asset-review

Screenshot review plans and AI review policy helpers for Plasius asset promotion.

## Install

```bash
npm install @plasius/asset-review
```

## Scope

This package is part of the unified AI asset pipeline package family. It is scaffolded from the standard `@plasius/*` package template and owns the asset review boundary described in the Plasius asset pipeline design.

## Feature Flag

- `asset.pipeline.unified-ai-assets.enabled`

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
