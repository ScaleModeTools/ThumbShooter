# ThumbShooter

ThumbShooter is a browser FPS prototype controlled by a "thumb gun" gesture.
This repository is now set up as a type-first monorepo scaffold so the full
game can be built against a concrete spec, dependency baseline, and agent
workflow.

## Workspace

- `client`: Vite + TypeScript browser app
- `server`: TypeScript Node service placeholder
- `packages/shared`: shared domain types for future client/server contracts
- `docs`: dependency and LLM reference material
- `examples`: external reference code and adaptation notes

## Core Docs

- [`spec.md`](./spec.md)
- [`progress.md`](./progress.md)
- [`docs/dependencies.md`](./docs/dependencies.md)
- [`AGENTS.md`](./AGENTS.md)

## Commands

```bash
npm install
npm run dev:client
npm run build
npm run start:server
npm run typecheck
```

## Rendering Direction

The production game target is Three.js `r183` with WebGPU-first gameplay code.
The included birds example remains a behavior reference, not the final runtime
architecture.

## Local Dev Helpers

Local-only launch helpers and personal notes belong under `.local-dev/`. That
folder is intentionally gitignored so public pushes stay focused on production
source, shared docs, and portable scripts.

## TypeScript File Rule

Use `.ts` by default. Introduce `.tsx` only when a file actually contains JSX.
The removed `tsx` package and the `.tsx` file extension are unrelated concerns.
