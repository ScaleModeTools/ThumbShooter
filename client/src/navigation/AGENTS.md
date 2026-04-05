# Navigation Agents

The `navigation` domain owns player-facing flow state.

## Rules

- Keep route IDs and transition guards explicit and typed.
- Reflect the product flow from `spec.md`: login, permissions, calibration,
  gameplay.
- Do not bury onboarding logic inside UI components or renderer code.
