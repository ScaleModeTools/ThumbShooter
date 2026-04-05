# Client Source Agents

`client/src` is organized by product domains first.

## Domain Rules

- `game` owns renderer-facing gameplay systems.
- `navigation` owns route and flow transitions.
- `network` owns persistence, profile transport, and future remote contracts.
- `assets` owns manifests, asset identifiers, and loading plans.
- `ui` owns overlays, HUD, prompts, and viewport layout rules.

## Spawning Rules

- Start with `config` and `types`.
- Add `states`, `components`, `systems`, `services`, or `adapters` only when a
  domain earns them through actual complexity.
- Keep pure types and config separate from browser side effects.
