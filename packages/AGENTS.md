# Packages Agents

The `packages` workspace contains shared libraries and contracts.

## Rules

- Put cross-cutting types here before duplicating them in app workspaces.
- Keep packages dependency-light and purpose-specific.
- Shared packages should express domain language clearly enough for both humans
  and LLMs to navigate without guesswork.
- Prefer descriptive file names that expose both domain and role, especially for
  type-level utilities and shared contracts.
