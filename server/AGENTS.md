# Server Agents

The server starts as a minimal TypeScript service boundary.

## Rules

- Keep server code lean until a real multiplayer or persistence requirement
  appears.
- Prefer built-in Node modules first.
- Define shared contracts before adding transport-specific abstractions.
- Avoid leaking browser-only concepts into server modules.
