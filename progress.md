# ThumbShooter Progress

## Current Milestone

Phase 0: foundation scaffold and build instructions.

## Completed

- Initialized git and connected the repository to GitHub.
- Created the monorepo directory structure: `client`, `server`,
  `packages/shared`.
- Wrote the initial repository spec in `spec.md`.
- Added repository and domain `AGENTS.md` files.
- Added dependency/reference documentation in `docs/dependencies.md`.
- Added the example reference structure under `examples/`.
- Pinned the first dependency set for the client and toolchain.
- Installed workspace dependencies and generated the initial lockfile.
- Verified workspace `typecheck` and `build` scripts successfully.
- Removed extra dev orchestration dependencies in favor of local ignored helper
  scripts.
- Tightened the shared typing model with immutable profile scaffolding, typed
  manifests, and tuple-derived domain unions.
- Renamed shared contract files to be more descriptive and updated repo naming
  guidance in `AGENTS.md`.

## In Progress

- Keep refining domain contracts so the eventual full-build prompt has a stable
  starting surface.

## Next

1. Confirm the scaffold and repo practices.
2. Expand shared domain contracts where needed.
3. Start the actual implementation pass against the approved scaffold.

## Update Rule

Whenever a meaningful task lands, update this file in the same change set so
the repo always reflects real progress against `spec.md`.
