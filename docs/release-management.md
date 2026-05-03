# Release Management

## Versioning Strategy

This project follows Semantic Versioning:

- `MAJOR` for breaking API, config, or deployment changes
- `MINOR` for backward-compatible features
- `PATCH` for backward-compatible fixes and maintenance

## Release Process

1. Ensure CI is green on `main`.
2. Confirm docs and `.env.example` reflect all behavior and config changes.
3. Run:

   ```bash
   npm run format:check
   npm run lint
   npm run build
   npm run test
   npm run audit:security
   ```

4. Update changelog/release notes summary.
5. Tag a release with `vX.Y.Z`.
6. Push the tag to trigger the GitHub release workflow.

## Changelog Guidance

Each release should call out:

- new features;
- fixes;
- dependency upgrades with user-visible impact;
- breaking changes and migration steps.

## Compatibility Matrix

- Node.js: 20.11+
- npm: 10+
- MongoDB: 7.x recommended
- Redis: 7.x recommended
- Qdrant: 1.13.x recommended

## Breaking Change Policy

Breaking changes should:

- be highlighted in the README and release notes;
- include migration instructions;
- update `.env.example` and deployment docs when config changes;
- be grouped into major releases whenever practical.

## Deprecation Policy

When deprecating behavior or configuration:

- mention the deprecation in docs and release notes;
- provide the replacement path;
- remove deprecated behavior only in the next major release unless security risk requires earlier action.
