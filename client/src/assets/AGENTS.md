# Assets Agents

The `assets` domain owns asset IDs, manifests, loading plans, and future
reticle/model organization.

## Rules

- Asset references should use typed IDs rather than raw strings spread through
  gameplay code.
- Treat manifests as typed registries of stable IDs and metadata first, not as
  file-loader ceremony.
- Keep art direction decisions explicit in manifests once the style is chosen.
- Preserve placeholder assets and manifests until the replacement path is ready.
