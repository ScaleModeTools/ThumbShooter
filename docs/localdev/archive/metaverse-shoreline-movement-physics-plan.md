# Metaverse Shoreline Movement And Physics Plan

Role: plan. Durable code-grounded implementation plan for the shoreline
movement and physics push that fixes hub grounded/swim routing without breaking
the authoritative multiplayer foundation.

Status: implemented on April 13, 2026.

Scope: escalated durable-truth plan for metaverse hub shoreline movement,
client/server surface parity, and client contact detail. This document does not
amend repo-wide `AGENTS.md` law; when conflict appears, `AGENTS.md` wins.

## Implementation Outcome

- Steps 1 through 7 landed in product code and test coverage
- Step 8 completed as an explicit evaluation with no threshold retune required
- client prediction and server authority now share one readonly shoreline
  authoring source and one pure shoreline policy owner
- the shipped metaverse hub now includes a real shoreline slice with semantic
  support/blocker cuboids plus optional client-only contact mesh detail
- developer telemetry now surfaces local routing, issued traversal intent,
  authoritative ack, and correction truth at the shoreline seam

## Goal

- stable dock-to-water entry, sustained swim, shoreline re-exit, and no edge
  ejection in the shipped metaverse hub
- one authoritative shoreline truth that survives buffered authoritative world
  snapshots, client prediction, and reconciliation
- one client physics path that can add detailed static contact if needed
  without inventing different traversal semantics from the server

## Current Code Truth

- visual ocean is still created in
  `client/src/metaverse/render/webgpu-metaverse-scene.ts` as a shader-displaced
  `PlaneGeometry` at `config.ocean.height`; movement authority still does not
  read triangle positions from it
- shared readonly shoreline authoring now lives in
  `packages/shared/src/metaverse/metaverse-world-surface-authoring.ts` and
  drives both client proof/static surface snapshots and server authoritative
  surface config
- shared pure grounded/swim surface policy now lives in
  `packages/shared/src/metaverse/metaverse-world-surface-policy.ts` and is the
  decision owner for both
  `client/src/metaverse/traversal/policies/surface-routing.ts` and
  `server/src/metaverse/states/metaverse-authoritative-surface.ts`
- client physics boot in
  `client/src/metaverse/classes/metaverse-environment-physics-runtime.ts`
  still builds the flat water plane at ocean height and now supports semantic
  surface cuboids plus static contact meshes in the same boot when an asset
  needs both
- the shipped hub proof now includes a shoreline slice with authored pad, ramp,
  ledge, and blocker geometry exposed through shared surface authoring and
  client asset manifests
- runtime telemetry in `client/src/metaverse` now surfaces shoreline local
  decision reason, support height, blocker overlap, issued traversal intent,
  authoritative processed-input ack, and correction magnitudes in the HUD
- runtime coverage now includes shipped-shoreline dock entry, sustained swim,
  shoreline exit, no edge ejection, shared authoring/policy contract checks,
  and semantic-surface plus contact-mesh boot

## Current Movement Path

- browser input feeds `MetaverseTraversalRuntime.advance()` on the client
- local grounded/swim decisions come from
  `client/src/metaverse/traversal/policies/surface-routing.ts`
- local traversal intent is forwarded through
  `MetaverseRemoteWorldRuntime.syncLocalTraversalIntent()` into
  `MetaverseWorldClient.syncPlayerTraversalIntent()`
- `MetaverseWorldClient` stamps `inputSequence` and sends traversal intent on
  the latest-wins datagram lane when healthy, with reliable command fallback
  kept alive
- `MetaverseAuthoritativeWorldRuntime.#advanceUnmountedPlayerRuntime()` applies
  traversal intent against authoritative surface colliders and advances
  locomotion state on authoritative ticks
- buffered authoritative snapshots flow back through the metaverse world
  snapshot stream or HTTP fallback path
- `MetaverseTraversalRuntime.syncAuthoritativeLocalPlayerPose()` reconciles the
  local grounded/swim state against the latest fresh acked authoritative player
  snapshot
- `humanoid_v2` is downstream presentation:
  - `client/src/app/states/metaverse-asset-proof.ts` resolves clips and sockets
  - `client/src/metaverse/traversal/presentation/character-presentation.ts`
    derives `animationVocabulary` from traversal state
  - `client/src/metaverse/render/webgpu-metaverse-scene.ts` plays clips from
    that vocabulary

## Implemented Resolution

The push resolved the durable drift vectors this plan targeted:

- client and server shoreline support/blocker truth now come from the same
  readonly shared authoring source
- client and server grounded/swim transition math now come from the same pure
  shared policy owner
- the live runtime can now show local locomotion state, issued
  `inputSequence`, freshest authoritative `lastProcessedInputSequence`, and
  local-versus-authoritative correction magnitude without stepping frame-by-frame
- shipped-hub tests now cover a real shoreline slice instead of only dock-only
  or synthetic fixtures

## Locked Decisions

1. authoritative water remains one flat plane at `config.ocean.height` on the
   client and `oceanHeightMeters` on the server
   - neither client prediction nor server authority should sample collision or
     locomotion from visual ocean triangles
2. visual water simplification is optional and independent
   - if the ocean mesh is too expensive, reduce `segmentCount` or flatten the
     visual displacement later, but do not couple movement correctness to that
     render choice
3. `humanoid_v2` stays presentation-downstream for this push
   - do not move movement, shoreline routing, reconciliation, or transport
     policy into character assets, scene animation code, or presentation
     vocabularies
4. client and server shoreline semantics must come from one shared readonly
   authoring source and one shared pure surface-decision owner
   - render LODs, model paths, and collision asset paths stay client-local
   - shared surface authoring carries only asset ids, placements, and
     support/blocker geometry that both workspaces need
   - shared surface policy carries only pure movement-decision math and typed
     readonly snapshots; no Rapier handles, scene objects, or transport code
5. support/blocker semantics stay explicit and box-authored
   - any optional static contact mesh is client-only contact detail, not a
     second authoritative locomotion surface
   - swim/grounded routing, blockers, autostep, and authoritative movement keep
     using authored support/blocker volumes
6. buffered authoritative world snapshots remain the movement authority
   boundary
   - no per-frame shoreline data is sent over WebTransport
   - client prediction continues to use traversal intent plus snapshot ack and
     reconciliation
7. telemetry and regression coverage land before geometry expansion or
   threshold retuning
8. no full terrain system is part of this push
   - start with one intentional shoreline test slice: pad, ramp, ledge, and
     blockers

## Non-Goals

- no new transport lane, snapshot cadence, or snapshot-shape rewrite unless a
  later implementation step proves a real contract gap
- no server triangle-mesh collision runtime
- no render-mesh-derived collision or locomotion semantics
- no broad terrain editor or terrain-generation pipeline
- no attempt to solve all future experiences; this is a metaverse hub
  shoreline slice

## Naming And Structure Rules

- use `surface authoring` for shared readonly support/blocker data
- use `surface policy` for shared pure locomotion-decision logic
- use `contact mesh` for optional client-only static tri-mesh detail
- avoid vague names such as `helpers`, `common`, `movement-utils`, or
  `shoreline-misc`
- keep cross-workspace code in explicit metaverse names under
  `packages/shared/src/metaverse`
- likely module names if this work is implemented:
  - `metaverse-world-surface-authoring.ts`
  - `metaverse-world-surface-policy.ts`
  - `metaverse-shoreline-telemetry.ts` only if the telemetry surface outgrows the
    existing metaverse runtime types
- do not create a new broad folder unless one owner clearly needs it; prefer
  adding one explicit file under the current owning domain first

## Delivery Order

### Step 1 — Add Authority-Mismatch Telemetry

Status: completed on April 13, 2026.

Purpose:

- prove whether the live water-movement failure is local routing drift,
  authoritative routing drift, or input-ack visibility drift

Work:

- extend metaverse HUD and developer telemetry with local shoreline debug truth:
  - local locomotion mode
  - resolved local support height
  - whether the current probe path saw blocker overlap
  - active autostep height or `null`
  - last automatic locomotion decision reason:
    - grounded hold
    - water entry
    - shoreline exit success
    - shoreline exit blocked
  - latest issued traversal intent:
    - locomotion mode
    - movement axes
    - local `inputSequence`
  - latest fresh authoritative local-player truth:
    - locomotion mode
    - `lastProcessedInputSequence`
    - position
    - correction delta from local state
  - latest authoritative local-player correction delta near shoreline:
    - planar correction magnitude
    - vertical correction magnitude
    - locomotion mismatch flag
- keep the existing transport lane and snapshot-stream telemetry as the network
  truth surface; this step adds movement-authority visibility, not new
  transport status owners
- keep this telemetry client-owned in `client/src/metaverse`; do not push it
  into shared contracts or transport adapters

Likely owners:

- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
- `client/src/metaverse/types/metaverse-runtime.ts`
- `client/src/metaverse/components/metaverse-developer-overlay.tsx`
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`

Tests:

- runtime tests for HUD snapshot shaping and developer overlay debug fields
- runtime tests proving local intent sequence, authoritative ack, and shoreline
  corrections surface together without adding transport coupling

Exit check:

- a live "cannot move in water" report can be classified from the HUD without
  adding logs or stepping frame-by-frame

Implemented outcome:

- `MetaverseTraversalRuntime` now records shoreline local decision reason,
  support height, blocker overlap, autostep height, and correction telemetry
- `MetaverseWorldClient`, `MetaverseRemoteWorldRuntime`, and
  `WebGpuMetaverseRuntime` now surface issued traversal intent, freshest
  authoritative ack, and correction magnitudes through runtime telemetry
- the metaverse developer overlay now renders the shoreline debug block needed
  to classify local-routing, authority-routing, or ack-visibility drift

### Step 2 — Add Shoreline And Authority Parity Regressions

Status: completed on April 13, 2026.

Purpose:

- lock expected shoreline behavior before geometry or policy changes broaden

Work:

- add client runtime tests for:
  - dock-to-water entry
  - sustained swim after water entry
  - shoreline re-exit onto intentional support
  - no high-energy edge ejection at support boundaries
- add authoritative server tests for the same locomotion outcomes under
  traversal intent and tick advancement
- add reconciliation-oriented tests proving the client does not get trapped in
  repeated water-entry or water-exit correction under the same input stream
- keep the first coverage layer fixture-owned if needed, then extend the shipped
  hub proof tests once the shoreline asset lands

Likely owners:

- `tests/runtime/client/metaverse-traversal-runtime.test.mjs`
- `tests/runtime/client/metaverse-runtime.test.mjs`
- `tests/runtime/server/metaverse-authoritative-world-runtime.test.mjs`

Tests:

- the four shoreline regressions above on the client and server
- one parity test proving that the same authored shoreline surface and same
  input stream yield the same grounded/swim outcome on both sides

Exit check:

- the repo fails fast when a shoreline change breaks local prediction,
  authoritative resolution, or their parity

Implemented outcome:

- client traversal runtime tests now cover dock-to-water entry, sustained swim,
  shoreline exit, and no edge-ejection behavior against the shipped shoreline
  slice
- authoritative server runtime tests now cover the same shoreline locomotion
  outcomes under authoritative tick advancement
- client runtime tests now cover shoreline telemetry and ack/correction shaping
  during local-authoritative reconciliation
- shared surface contract tests now lock the authored shoreline slice and the
  expected shared surface-policy outcomes for dock support, open water, exit
  success, and blocked side lanes

### Step 3 — Promote Surface Authoring Into One Shared Source

Status: completed on April 13, 2026.

Purpose:

- remove durable client/server surface drift before expanding hub geometry

Work:

- introduce one readonly shared metaverse surface-authoring module under
  `@webgpu-metaverse/shared`
- move the data both workspaces truly share into that module:
  - asset ids
  - static placements
  - dynamic mountable surface colliders
  - support/blocker cuboid definitions
- keep client-only data out of shared:
  - render model paths
  - LOD groups
  - collision asset paths
  - Rapier-specific settings
- derive current server authoritative surface config from the shared source
  instead of maintaining separate hardcoded copies
- derive client proof surface-collider snapshots from the same shared source
  instead of duplicating dock/crate/boat surface semantics indirectly

Likely owners:

- `packages/shared/src/metaverse`
- `client/src/app/states/metaverse-asset-proof.ts`
- `client/src/assets/config/environment-prop-manifest.ts`
- `client/src/metaverse/states/metaverse-environment-collision.ts`
- `server/src/metaverse/config/metaverse-authoritative-world-surface.ts`

Tests:

- shared runtime and typecheck coverage for the new readonly surface-authoring
  shape
- client and server runtime tests proving current dock/crate/skiff/dive-boat
  surface data still resolve identically after extraction

Exit check:

- one change to shipped surface authoring updates both local prediction and
  authoritative shoreline logic

Implemented outcome:

- shared surface authoring now owns the dock, crate, skiff, dive-boat, and new
  shoreline slice ids, placements, and support/blocker cuboids
- server authoritative surface config now derives from the shared authoring
  module instead of a separate hardcoded copy
- client asset proof and manifest-driven surface collider snapshots now derive
  their shared traversal semantics from the same source while keeping render
  paths and collision asset paths client-local

### Step 4 — Promote Surface Policy Into One Shared Pure Owner

Status: completed on April 13, 2026.

Purpose:

- remove client/server drift in the actual grounded/swim decision rules, not
  only in the authored surface data

Work:

- extract the duplicated pure surface-decision logic currently split between:
  - `client/src/metaverse/traversal/policies/surface-routing.ts`
  - `server/src/metaverse/states/metaverse-authoritative-surface.ts`
- share:
  - surface-height resolution
  - blocker checks
  - grounded/swim transition rules
  - autostep decision rules
  - the threshold constants that define those decisions
- keep local adaptation thin where workspace-specific shapes still differ
- do not move Rapier runtime code, render presentation, or authoritative tick
  ownership into shared code

Likely owners:

- `packages/shared/src/metaverse`
- `client/src/metaverse/traversal/policies/surface-routing.ts`
- `server/src/metaverse/states/metaverse-authoritative-surface.ts`

Tests:

- shared runtime coverage for the pure surface-policy owner
- client and server parity tests proving the same inputs produce the same
  locomotion decision

Exit check:

- client and server stop carrying near-copy-pasted shoreline policy with
  independent drift risk

Implemented outcome:

- shared surface policy now owns surface-height resolution, blocker checks,
  grounded/swim transitions, and autostep decisions
- client and server shoreline policy modules are now thin workspace adapters on
  top of that shared owner
- debug reason strings and typed decision snapshots now come from the same pure
  source on both sides

### Step 5 — Add A Real Shoreline Test Slice To The Hub

Status: completed on April 13, 2026.

Purpose:

- stop proving shoreline logic only against a thin dock and synthetic fixtures

Work:

- add one small shipped shoreline asset slice to the metaverse hub:
  - walkable shore pad
  - one or two gentle ramps
  - one intentional blocker edge or ledge
  - optional shallow water entry lane
- author its traversal semantics with support/blocker cuboids
- place it near the current spawn/dock route so manual localdev validation stays
  short
- do not broaden into a full terrain system or imported terrain runtime

Likely owners:

- `client/src/assets/config/environment-prop-manifest.ts`
- `client/src/app/states/metaverse-asset-proof.ts`
- shared surface authoring from Step 3
- local model assets under `public/models/metaverse/environment` if earned

Tests:

- shipped-hub proof tests asserting the shoreline asset is present and exposes
  the expected support/blocker shape
- runtime tests proving spawn, entry, swim, and exit work against the actual
  shipped slice

Exit check:

- the shipped hub contains a stable land-water seam that exercises the real
  prediction and authority paths

Implemented outcome:

- the shipped hub now includes `metaverse-hub-shoreline-v1` near the current
  dock route with authored support pads, ramps, and blocker edges
- client manifests and metaverse asset proof now resolve the shoreline asset as
  part of the shipped environment slice
- high, low, and collision GLTF assets now exist under
  `public/models/metaverse/environment` for the shoreline slice

### Step 6 — Rework Shoreline Seam Geometry Around The New Slice

Status: completed on April 13, 2026.

Purpose:

- make dock/shore/water transitions intentional instead of emergent from a thin
  support box

Work:

- adjust authored shoreline support/blocker layout so:
  - water entry is blocker-free
  - swim exit has explicit support under the forward and center probes
  - blocker volumes do not overlap the intended exit lane
  - edge lip height stays inside the current step/jump envelope only where
    intended
- update dock support geometry if the current dock remains a traversal path, but
  do not rely on "make the dock box bigger" as the main fix
- keep geometry work downstream of the telemetry and parity steps

Likely owners:

- shared surface authoring from Step 3
- shared surface policy from Step 4

Tests:

- client and server shoreline regressions stay green under the new seam
- no repeated grounded/swim flapping at the intended transition line

Exit check:

- the intended exit lane is stable under local prediction and authoritative
  replay without blocker-overlap hacks

Implemented outcome:

- shoreline support and blocker cuboids were authored as an intentional seam
  with a clear water-entry lane, an explicit swim-exit lane, and side blockers
  that protect the ledge without overlapping the exit path
- the shoreline placement was moved outward from the dock so runtime coverage
  exercises sustained swim before re-exit
- shipped shoreline regressions now stay green on both client and server

### Step 7 — Only If Needed, Add Static Contact Mesh

Status: completed on April 13, 2026.

Purpose:

- refine client contact detail only if the shared semantic surface and seam
  geometry are already correct but the client still needs more precise static
  contact

Work:

- do not implement this step unless Steps 1 through 6 show a remaining
  client-only contact-detail problem
- if needed, allow one static asset to use both:
  - semantic surface cuboids for traversal meaning
  - a client-only fixed contact mesh for Rapier contact detail
- remove the current exclusion that skips tri-mesh baking whenever
  `physicsColliders` exist
- keep this limited to static assets in this slice
- keep contact meshes out of server authority and out of traversal-affordance
  decisions
- describe this in code and docs as `semantic surface + contact mesh`, not
  `dual collision`

Likely owners:

- `client/src/metaverse/states/metaverse-environment-collision.ts`
- `client/src/metaverse/classes/metaverse-environment-physics-runtime.ts`
- `tests/runtime/client/metaverse-environment-collision.test.mjs`
- `tests/runtime/client/metaverse-runtime.test.mjs`

Tests:

- collision-state tests proving tri meshes still bake when `physicsColliders`
  are present
- runtime tests proving static boot loads semantic cuboids and contact meshes
  without duplicating semantic surface snapshots

Exit check:

- a static shoreline asset can use box-authored semantics and optional client
  contact detail in one boot only when that extra detail is actually needed

Implemented outcome:

- the collision boot path now allows fixed tri-mesh contact data even when the
  same asset also carries semantic `physicsColliders`
- collision tests and runtime tests now prove semantic surface cuboids and
  contact meshes can boot together without duplicating traversal semantics
- the shoreline slice now has the client-only contact-mesh option available
  without changing authoritative movement ownership

### Step 8 — Retune Thresholds Only If The Authored Seam Still Requires It

Status: completed on April 13, 2026.

Purpose:

- use tuning to refine a correct model, not to compensate for missing geometry
  or split truth

Work:

- only after Steps 1 through 7 land, evaluate:
  - waterline threshold
  - grounded-hold probe padding
  - exit probe count or distances
  - automatic step leeway
  - local authoritative grounded tolerance
- keep any new values config-owned on both client and server
- if the visual ocean still costs too much after the movement path is stable,
  treat that as a separate render optimization and reduce `segmentCount` or
  flatten displacement without changing movement authority

Likely owners:

- `client/src/metaverse/config/metaverse-runtime.ts`
- `client/src/metaverse/traversal/policies/surface-routing.ts`
- `server/src/metaverse/states/metaverse-authoritative-surface.ts`
- `server/src/metaverse/classes/metaverse-authoritative-world-runtime.ts`

Tests:

- regression coverage from Step 2
- runtime checks proving client/server outcomes remain aligned after config
  changes

Exit check:

- final thresholds improve feel without reintroducing shoreline parity drift

Implemented outcome:

- after telemetry, shared authoring, shared policy, seam geometry, and contact
  mesh support landed, the current shoreline slice passed the regression suite
  without threshold retuning
- no waterline, autostep, or grounded-tolerance constants were changed for this
  push because the authored seam and shared policy were sufficient

## Initial Implementation Slice

Start with the smallest durable slice that changes real truth:

1. Step 1 authority-mismatch telemetry
2. Step 2 shoreline and authority parity regressions
3. Step 3 shared surface authoring extraction for current hub assets
4. Step 4 shared surface policy extraction

Only after that should the repo choose between:

- Step 5 plus Step 6, if the failure is semantic shoreline drift
- Step 7, if the semantics are already correct and only client contact detail is
  still insufficient

Do not start by enlarging the dock box.
Do not start by importing a terrain system.
Do not start by porting render-mesh or octree collision into authoritative
movement.
Do not start by treating `humanoid_v2` animation state as the owner of movement
  truth.
Do not start by flattening the visual ocean unless a measured render-budget
problem remains after the movement path is stable.

## Stop-Ship Line

This push is not done while any of the following remain true:

- client prediction and server authority still read different shoreline/support
  truth
- client prediction and server authority still run materially different
  shoreline decision policy for the same typed inputs
- a shoreline exit can succeed locally but fail authoritatively, or the reverse,
  under the same input sequence
- the live runtime cannot show local intent, authoritative ack, and correction
  truth when a water-movement mismatch happens
- the shipped hub still lacks one intentional land-water test slice
- shoreline tuning depends on trial-and-error thresholds without debug
  telemetry explaining the decision path
- movement debugging still depends on `humanoid_v2` presentation assumptions
  instead of traversal and authoritative state
- visual water geometry is still being treated as movement authority or
  collision truth

Result: cleared on April 13, 2026. The implemented shoreline push now satisfies
the stop-ship line above under runtime coverage and repo verification.
