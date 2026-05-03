# Contributing

Thanks for contributing to this project.

This repository is intended to be approachable for first-time contributors and dependable for self-hosters. Please keep changes small, documented, and easy to review.

## Before You Start

- Read the [Code of Conduct](./CODE_OF_CONDUCT.md).
- Check for an existing issue or open one before starting large changes.
- For behavior, config, or deployment changes, update the relevant documentation in the same pull request.

## Local Development Workflow

1. Install Node.js 20+ and npm 10+.
2. Copy `.env.example` to `.env` and fill in `OPENAI_API_KEY`.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start infrastructure dependencies locally or through Docker Compose.
5. Run the API and worker in separate terminals:

   ```bash
   npm run dev
   npm run worker:ts
   ```

## Required Checks

Run these before opening a pull request:

```bash
npm run format:check
npm run lint
npm run build
npm run test
```

If dependencies changed, also run:

```bash
npm run audit:security
```

## Branching and Pull Requests

- Branch from `main` using a descriptive branch name such as `feat/add-batch-metrics` or `fix/upload-timeout`.
- Keep each PR focused on one concern.
- Add screenshots or logs when UI/operational behavior changes.
- Link related issues in the PR description.

## Code and Documentation Standards

- Preserve existing behavior unless the change explicitly requires otherwise.
- Prefer small, composable functions and explicit configuration.
- Add or update tests when you change behavior in a testable area.
- Document new environment variables in `.env.example` and `README.md`.
- Document deployment/runtime implications in `docs/` for operational changes.

## Review Checklist

Before requesting review, confirm that:

- the change is scoped and explained clearly;
- lint, build, and tests pass locally;
- docs and examples match the new behavior;
- Docker or runtime changes are reflected in deployment guidance;
- any breaking change is called out explicitly.

## Release Expectations

- User-facing changes should include a short changelog-ready summary in the PR.
- Breaking changes require migration notes.
- Dependency upgrades should mention compatibility impact when relevant.

## License

By contributing, you agree that your contributions are licensed under the repository's MIT License.
