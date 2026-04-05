# ThumbShooter Agents

This repository is built around a type-first workflow. The codebase should use
types as steering syntax: domain language, boundaries, and intent should be
explicit in the type system before implementation details expand.

## Operating Rules

1. Read `spec.md` and `progress.md` before starting meaningful work.
2. Update `progress.md` whenever a subtask is completed, deferred, or
   re-scoped.
3. Keep new work inside `client`, `server`, or `packages`. Do not add new
   top-level runtime folders without updating `spec.md` first.
4. Pin new dependencies intentionally. Document every added dependency in
   `docs/dependencies.md`.
5. Add or update the nearest local `AGENTS.md` when a subtree gains its own
   conventions.

## Naming Standard

- File and folder names must answer "what is this?" without relying on nearby
  context.
- Prefer names that state domain plus role, such as `player-profile.ts`,
  `calibration-types.ts`, or `reticle-manifest.ts`.
- Avoid vague names like `brand`, `common`, `helpers`, `misc`, or `utils`
  unless the file genuinely exists to provide that narrow shared concern.
- If a file exists primarily to define type-level utilities, say so directly in
  the filename, for example `type-branding.ts`.
- Keep names concise, but not at the cost of ambiguity.

## Type Safety Standard

- Prefer exact object shapes, discriminated unions, branded identifiers,
  `readonly` fields, and `as const` configuration objects.
- Use the type system as repo steering language. Domain intent, allowed states,
  and storage boundaries should be inferable from the types alone.
- Prefer const tuples plus derived unions over hand-written string unions when a
  runtime list already exists.
- Use template literal types for namespaced keys, storage keys, and patterned
  identifiers when they improve clarity.
- Do not use `any`.
- Do not allow `unknown` to spread through the codebase. If a boundary returns
  `unknown`, narrow it immediately and keep the unsafe edge local.
- Avoid loose string passing. Promote repeated literals into typed constants or
  literal unions.
- Prefer named config objects over long positional argument lists.
- Use classes or value objects only when they protect invariants or centralize
  domain behavior. Use readonly snapshot interfaces for serialized state.
- Treat shared types as part of the product architecture, not as incidental
  boilerplate.

## Repo Layout

- `client/src` contains the browser runtime.
- `server/src` contains backend or local-service code.
- `packages/*/src` contains shared libraries and contracts.
- Within `client/src`, use domain folders first:
  `game`, `navigation`, `network`, `assets`, `ui`.
- Inside each domain, spawn technical folders only when they are justified by
  real complexity: `config`, `types`, `states`, `components`, `systems`,
  `services`, `adapters`, `utils`.

## Rendering and Input Rules

- New gameplay rendering code targets Three.js WebGPU paths for ThumbShooter.
- Legacy WebGL examples may be stored under `examples/`, but they are reference
  material only.
- MediaPipe Hand Landmarker is the input foundation.
- Profile and calibration persistence start with local storage. Any server sync
  is additive later.
- The game uses a single viewport that fills the available browser area.

## Build Discipline

- Land small, composable modules with clear exports.
- Keep DOM/UI orchestration thin; move rules and calculations into typed
  modules.
- Keep public repo automation minimal. Personal launch helpers belong in
  `.local-dev/`, which stays gitignored.
- Default to `.ts` files. Introduce `.tsx` only when JSX is actually present.
- When a task changes the roadmap, update `spec.md` and `progress.md` in the
  same pass.
- Do not delete or rewrite reference examples unless they are clearly obsolete
  and their replacement is documented.
