# Metaverse Authoritative Movement and World Builder Plan

Purpose: eliminate online movement jitter first, stabilize render counts and
animation state second, then finish authority parity and shared world authoring.

## Current facts

- The local traversal path is smoother with the server off, especially for
  swim.
- The local player advances every frame, then authority can correct that state
  in the same runtime loop.
- Local correction is currently hard-applied once divergence passes a small
  threshold.
- Render telemetry is not stable under movement. Draw calls and triangles are
  fluctuating frame to frame instead of settling.
- Environment LOD and visibility are evaluated every frame from camera
  distance, so camera jitter can become render-count jitter.
- Shared gameplay surface truth already exists in
  `packages/shared/src/metaverse/metaverse-world-surface-authoring.ts`.
- World truth is still split because placements and render metadata are
  mirrored through client proof assembly.
- Static shoreline tri mesh is active in local Rapier.
- Dynamic mount `collisionPath` is dead runtime config unless new evidence says
  otherwise.

## Success criteria

- The local player no longer jitters under server authority.
- Draw calls and triangle counts stay stable during steady movement and steady
  camera motion.
- Continuous grounded movement stays in `walk` during normal play.
- Continuous swim movement stays in `swim` during normal play.
- Routine corrections become small, rare, and visually blended.
- The server validates movement against the same gameplay-relevant world truth
  the client uses.
- The builder writes one shared world config shape instead of feeding separate
  client and server truths.
- `npm run editor` is the canonical editor launch command.
- The hub includes above-water grounded traversal space, not only shoreline and
  floating-water-edge paths.

## Non-negotiables

- Local player movement remains client-predicted.
- Local player locomotion animation remains client-owned presentation.
- The server remains authoritative for accepted movement outcomes and snapshots.
- Do not hide jitter by adding interpolation delay first.
- Do not treat world-builder work as the fix for runtime jitter.
- Shared world authoring remains the durable source for gameplay collision and
  placement truth once runtime stability work is done.

## Implementation plan

### 1. Reproduce and correlate the jitter

Capture server-off and server-on baselines for:
- held grounded movement
- held swim movement
- shoreline enter and exit
- blocker contact
- quick jump tap

Temporary telemetry should answer:
- local measured speed
- local locomotion mode
- requested and rendered animation vocabulary
- local correction magnitude
- correction frequency
- camera position delta
- active LOD changes
- draw calls
- triangle counts

Outcome: the team knows whether render churn tracks local-authority correction,
camera jitter, or both.

### 2. Isolate the local-authority correction path

Prove whether the main source of visible jitter is the local-authority
reconciliation path. Compare:
- local prediction without authoritative correction
- local prediction with authoritative correction
- steady camera movement versus steady player movement

Focus on the local player first, not remote players.

Outcome: the main online jitter source is identified before any tuning work
starts.

### 3. Stabilize local presentation against routine corrections

Routine authority disagreement should not hard-snap the local player
presentation. Reserve hard snaps for true divergence, invalid prediction, or
stale authority. Small authoritative corrections should be blended in local
presentation and should not immediately reset locomotion state.

Outcome: online movement stops looking like a series of correction hits.

### 4. Stabilize render counts and LOD behavior

Treat alternating draw-call and triangle counts as a real bug, not as harmless
telemetry noise.

Check whether:
- camera jitter is crossing LOD thresholds
- visibility is flapping between LODs
- a specific asset family is causing the count swing

Use temporary tests such as pinning LOD for a steady movement run if needed.
Then add the smallest durable fix:
- stronger hysteresis
- LOD switch cooldown
- camera-stability fix
- asset threshold adjustment

Outcome: steady movement no longer causes frame-to-frame render-count churn.

### 5. Stabilize local locomotion animation

Replace raw one-frame speed thresholds with a latched local presentation policy.
Use enter and exit thresholds or short hold windows for `walk` and `swim`.
Consider locomotion mode, input intent, applied speed, and airborne state
together.

Outcome: movement no longer flickers to `idle` because of small speed dips or
small corrections.

### 6. Share one movement-to-animation policy

Move movement-to-animation policy into one shared owner. Keep it small and
data-driven:
- thresholds
- hold windows
- locomotion mode inputs
- airborne inputs

Use that policy on the client for local presentation and on the server for
authoritative snapshots and remote players.

Outcome: local and authoritative animation vocabulary stop drifting apart.

### 7. Align swim authority first

Swim is still the first movement-parity target because it already runs on
shared cuboid surface truth and is the clearest server-on regression. Keep swim
authority on the same support and blocker rules the client already uses. Remove
server-side swim heuristics that contradict shared surface policy.

Outcome: continuous swim remains visually continuous with the server on.

### 8. Resolve grounded parity and shoreline collision

After swim and local correction behavior are stable, resolve the grounded
mismatch. Audit what grounded feel still depends on local shoreline tri mesh
versus shared surface cuboids. Prefer promoting gameplay-relevant grounded
contact into shared authored truth before considering server-side
physics-engine duplication.

Make a firm decision for shoreline:
- shared authored colliders are enough
- a richer shared collision shape is required
- local tri mesh stays visual-only and does not affect gameplay authority

Also remove dynamic mount `collisionPath` requirements if mount runtime
collision remains cuboid-only.

Outcome: grounded authority disagreement is no longer driven by client-only
collision truth.

### 9. Separate held state from one-shot actions

Keep movement axes as latest-wins state. Treat jump as an acknowledged action
edge. Preserve input sequence tracking through prediction and server
processing.

Outcome: a fast jump tap is visible locally and processed authoritatively as the
same action.

### 10. Unify world truth for gameplay and builder

Define one shared world config that can represent:
- placed assets
- gameplay collider semantics
- render-facing asset references
- dynamic instance metadata where needed

Keep asset-library metadata separate from placed world layout. Make client proof
and server authority read the same shared world config or a direct derived
snapshot from it.

Outcome: placements and gameplay collision truth stop being mirrored across
separate systems.

### 11. Turn the builder into the real authoring path

Add the root editor entrypoint: `npm run editor`.

Make the builder write the shared world config directly. Support manual JSON
authoring first if that is the fastest path. Add tile, wall, and smart-height
families on top of that shared shape instead of inventing a separate runtime
builder model.

The first content pass should add clearly dry above-water traversal space:
- platforms
- walkways
- decks
- ramps or stairs where needed

Ship at least one above-water running loop so grounded movement is evaluated
away from the waterline.

Outcome: the editor launches from `npm run editor`, writes the same world shape
gameplay consumes, and the hub gains real above-water running space.

### 12. Remove superseded paths

Delete:
- duplicated client and server animation threshold logic
- stale dynamic mount `collisionPath` requirements if unused
- mirrored placement assembly once shared world config owns world truth
- temporary telemetry that is no longer needed

Update tests and delivery expectations to match the real runtime path. Run
`./tools/verify` when code changes land.

Outcome: the repo reflects the final runtime path instead of carrying old and
new paths together.

## Execution order

1. Reproduce and correlate the jitter.
2. Isolate the local-authority correction path.
3. Stabilize local presentation against routine corrections.
4. Stabilize render counts and LOD behavior.
5. Stabilize local locomotion animation.
6. Share one movement-to-animation policy.
7. Align swim authority first.
8. Resolve grounded parity and shoreline collision.
9. Separate held state from one-shot actions.
10. Unify world truth for gameplay and builder.
11. Turn the builder into the real authoring path.
12. Remove superseded paths.

## Primary risks

- Trying to tune movement feel before isolating correction jitter will hide the
  real failure.
- Treating draw-call churn as unrelated renderer noise may miss the actual
  camera or LOD instability.
- Fixing only animation thresholds will improve the look but not the online
  movement path.
- Doing builder work before runtime stability will create new world data on top
  of an unstable runtime.
- Jumping straight to server-side Rapier duplication may add cost without
  solving the actual jitter source.

## Readiness

This plan is ready for implementation.

The preferred path is:
1. Stop local-authority jitter.
2. Stop render-count churn.
3. Stabilize animation.
4. Finish movement parity.
5. Then complete the shared builder path.
