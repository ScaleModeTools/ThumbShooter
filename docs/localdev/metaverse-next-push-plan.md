# Metaverse Next Push Plan

Status: in progress. Push 1, Push 2, Push 3, Push 4, and Push 5 are complete.
Push 6 is the active slice.

This note now tracks only the current next push. Completed pushes stay
compressed here unless they still shape the next implementation.

## Current Local Truth

- the metaverse proof consumer now routes through one explicit local active
  full-body character selection seam instead of hardcoding a mannequin id
- the character manifest already models multiple character assets and
  per-vocabulary clip source paths, so the next character swap should happen
  through typed manifest selection rather than a runtime special case
- the active proof character now resolves a shipped canonical animation pack
  for `idle`, `walk`, `aim`, `interact`, and `seated`; the generated local
  walk fallback is removed
- the active full-body render asset is still the mannequin; the remaining
  Push 6 work is the later Mesh2Motion-derived full-body mesh swap through the
  same manifest-owned seam
- Mesh2Motion is acceptable as an external authoring intermediate, but the
  repo still consumes only shipped local artifacts that satisfy the canonical
  rig, delivery, and naming rules after export
- shared-contract promotion remains paused; this character-delivery slice is
  still client-local

## Completed Pushes

1. completed: presence contract correctness and remote presentation recovery
2. completed: shoreline exit and stable swim or grounded routing
3. completed: local traversal affordance metadata for support, blocker, mount,
   and pushable semantics
4. completed: dynamic pushable body ownership and pose sync
5. completed: metaverse-local autostep gating so tall support stays blocked

## Push Sequence

### Push 6 — Authored Character Delivery Proof

Status: in progress.

Scope:

- bring one Mesh2Motion-derived full-body metaverse character into the current
  proof slice as the active `humanoid_v1` character
- ship one authored canonical animation set covering:
  - `idle`
  - `walk`
  - `aim`
  - `interact`
  - `seated`
- keep the runtime change limited to manifest, proof-config, loading, and
  validation work needed to consume shipped authored assets

Must stay local:

- character asset ids, animation clip ids, proof selection, rig/socket truth,
  and delivery metadata stay inside:
  - `client/src/assets`
  - `client/src/app/states`
  - `client/src/metaverse`
  - `tests/runtime/client`
- Mesh2Motion remains an external authoring intermediate only; the repo does
  not gain Mesh2Motion project files, runtime metadata, or shared contracts

Must not be promoted yet:

- no `@webgpu-metaverse/shared` character or animation contract
- no server or storage avatar selection or persistence shape
- no cross-workspace public avatar catalog
- no generic runtime retargeting contract

Concrete repo surfaces:

- shipped artifacts under `client/public/models/metaverse/characters`
- `client/src/assets/config/character-model-manifest.ts`
- `client/src/assets/config/animation-clip-manifest.ts`
- `client/src/app/states/metaverse-asset-proof.ts`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `tests/runtime/client/metaverse-asset-pipeline.test.mjs`
- `tests/runtime/client/metaverse-runtime.test.mjs`

Hard constraints for Mesh2Motion import/export compatibility:

- preserve the locked `humanoid_v1` chain and exact socket bone names:
  - `humanoid_root`
  - `hips`
  - `spine`
  - `chest`
  - `neck`
  - `hand_r_socket`
  - `hand_l_socket`
  - `head_socket`
  - `hip_socket`
  - `seat_socket`
- socket ids remain exported authored bones with stable parentage, not stripped
  helpers
- canonical clip names stay exactly:
  - `idle`
  - `walk`
  - `aim`
  - `interact`
  - `seated`
- shipped roots stay upright, meter-scale, and free of node `scale`
  transforms
- shipped filenames stay lowercase kebab-case and unversioned under
  `/models/metaverse/characters/...`
- this character refresh moves toward locked `GLB + KTX2 + Meshopt`; do not
  add more proof-only embedded `.gltf` for new character work
- if clips ship in separate files, manifests still resolve them only through
  typed `sourcePath` entries

Push 6 phases:

1. completed: active metaverse full-body character selection now routes
   through one explicit local manifest-owned seam, and the proof consumer
   validates that the chosen asset is `humanoid_v1` and supports `full-body`
   presentation
2. completed: ship one authored canonical vocabulary set into local manifests
   as a separate local `.glb` animation pack, and require full canonical
   vocabulary coverage on the active proof path
3. completed: remove generated walk fallback for the active proof character;
   missing authored `walk` now fails load instead of warning
4. pending: replace the active mannequin full-body render asset with one
   Mesh2Motion-derived full-body character while preserving the same local rig,
   naming, socket, and manifest rules

Exit check:

- one shipped Mesh2Motion-derived full-body character is the active metaverse
  proof character
- manifest data resolves all five canonical vocabularies with authored clips
- the active authored character path no longer relies on the generated walk
  fallback
- `hand_r_socket` attachment mounting and `seat_socket` mount alignment still
  work unchanged
- runtime and asset-pipeline coverage prove:
  - active full-body character selection stays manifest-driven
  - canonical sockets remain present
  - canonical vocabulary coverage resolves without runtime alias hacks
  - delivery naming and transform rules still hold

Wait until later pushes:

- separate first-person arms art or body-mode-specific character assets
- blend graphs, additive aim layers, or upper-body layering
- runtime IK, foot planting, or hand-on-weapon refinement
- avatar selection UI, persistence, networking, or shared-contract promotion
- facial rigging, cloth, morph customization, or other presentation expansion

## Asset Pipeline Note

- `docs/localdev/metaverse-asset-pipeline.md` remains correct that the current
  shared-contract promotion step is paused; none of the above work earns
  `@webgpu-metaverse/shared` asset-shape promotion yet
- Mesh2Motion is acceptable as an external authoring intermediate for rigging
  and animation work, but shipped repo assets still need to satisfy the local
  canonical rig, delivery, and naming rules after export
