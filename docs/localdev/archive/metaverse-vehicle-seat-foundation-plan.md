# Metaverse Vehicle Seat Foundation Plan

Role: plan. Durable review-driven plan for turning the current skiff mount
proof into a reusable vehicle, seat, camera, collision, and attachment
foundation.

Status: completed.

## Goal

Build one reusable mounted-occupancy foundation that:

- keeps `humanoid_v2` as the active full-body character contract
- keeps character rigs generic and reusable across vehicles
- transfers driver input to the vehicle instead of rotating the seated
  character as if the body itself were steering
- makes seat facing, bow or port or starboard, and attachment forward or up
  truth explicit and testable
- supports driver seats, passenger seats, bench rows, turret pods, and future
  weapon stations without reworking the core model
- keeps a clean path to walking on moving vehicles later
- removes proof-only debug presentation from normal runtime output

## Read This First

This document is intended to run from fresh context.

Code is the primary source of truth for this plan.

Before implementation:

1. re-read the required `AGENTS.md` surfaces for repo law and domain
   boundaries
2. inspect the current runtime code paths listed below
3. use docs only for durable asset-contract truth such as canonical humanoid
   bones, sockets, and delivery constraints

Required steering surfaces:

- `AGENTS.md`
- `client/AGENTS.md`
- `client/src/AGENTS.md`
- `client/src/metaverse/AGENTS.md`
- `client/src/physics/AGENTS.md`
- `client/src/assets/AGENTS.md`
- `packages/AGENTS.md`
- `packages/shared/src/metaverse/AGENTS.md`
- `server/src/metaverse/AGENTS.md`

Do not assume chat context not restated here.

Docs are secondary here, not primary. Read them only when the implementation
touches one of these durable truths:

- canonical humanoid bones and sockets:
  `docs/localdev/metaverse-canonical-rig.md`
- asset packaging and delivery constraints:
  `docs/localdev/metaverse-asset-pipeline.md`
  `docs/localdev/metaverse-asset-delivery-rules.md`
- why `humanoid_v2` exists:
  `docs/localdev/decisions/decision-humanoid-v2.md`

## Definitions

- `vehicle`: a dynamic environment runtime owner with motion, seats, entries,
  and collision
- `seat`: an authored occupant anchor with role, facing, camera policy, and
  control-routing policy
- `entry`: an authored boarding target that may lead to a seat or only to the
  vehicle interior or deck state
- `occupancy`: the state linking one character to one seat role on one vehicle
- `simulation pose`: the canonical runtime pose used by gameplay, camera
  policy, physics handoff, and replication
- `presentation pose`: render-only decoration derived from simulation pose,
  such as bob, sway, or interpolation
- `seat-local look`: passenger or gunner look movement relative to the seat
  frame, not free body rotation in world space

## Current Audited Files

The current proof slice and its coupling points were reviewed in these files:

- `client/src/app/states/metaverse-asset-proof.ts`
- `client/src/assets/config/environment-prop-manifest.ts`
- `client/src/assets/config/attachment-model-manifest.ts`
- `client/src/assets/types/environment-asset-manifest.ts`
- `client/src/assets/types/attachment-asset-manifest.ts`
- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
- `client/src/metaverse/classes/metaverse-environment-physics-runtime.ts`
- `client/src/metaverse/classes/metaverse-presence-runtime.ts`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `client/src/metaverse/traversal/presentation/mount-presentation.ts`
- `client/src/metaverse/traversal/presentation/camera-presentation.ts`
- `client/src/metaverse/traversal/presentation/character-presentation.ts`
- `client/src/metaverse/traversal/types/traversal.ts`
- `client/src/metaverse/states/metaverse-environment-collision.ts`
- `packages/shared/src/metaverse/metaverse-presence-contract.ts`
- `packages/shared/src/metaverse/vehicle-orientation.ts`
- `server/src/metaverse/classes/metaverse-presence-runtime.ts`
- `server/src/metaverse/adapters/metaverse-presence-http-adapter.ts`
- `tests/runtime/client/metaverse-runtime.test.mjs`
- `tests/runtime/client/metaverse-mount-presentation.test.mjs`
- `tests/runtime/client/metaverse-traversal-runtime.test.mjs`

## Repo Review Summary

- `humanoid_v2` is the right active full-body skeleton and its animation
  vocabulary is already generic:
  - `docs/localdev/metaverse-canonical-rig.md`
  - `docs/localdev/decisions/decision-humanoid-v2.md`
- The current character rig is not where skiff driving is coupled.
  The actual coupling sits in:
  - `client/src/app/states/metaverse-asset-proof.ts`
  - `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
  - `client/src/metaverse/traversal/types/traversal.ts`
  - `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- Mounted occupancy is single-seat and skiff-specific today.
  Current limits:
  - `EnvironmentMountDescriptor` only supports `riderFacingDirection` plus one
    `seatSocketId`
  - proof config requires `seat_socket`
  - proof config keeps dynamic mountables single-LOD "until seat switching is
    implemented"
  - traversal runtime special-cases `metaverse-hub-skiff-v1`
  - mounted state is literally named `MountedSkiffRuntimeState`
- The current vehicle-forward orientation metadata is suspect.
  Evidence:
  - `client/src/assets/config/environment-prop-manifest.ts` sets
    `forwardModelYawRadians: Math.PI * 0.25`
  - the skiff mesh spans about `4.35m` on local X and `1.8m` on local Z, so
    the authored long axis is lateral relative to the repo's usual `-Z`
    scene-forward expectation
  - your observed "forward feels ninety degrees counterclockwise from current
    seated facing" is more consistent with an approximately quarter-turn
    correction than the current forty-five-degree one
- The current skiff `seat_socket` is translation-only.
  The asset gives the runtime a seat position, but no authored seat-facing
  rotation to trust.
- Render-time mount presentation and locomotion truth are partially mixed.
  The scene adds bob, pitch, roll, and extra yaw motion to mountable assets in
  `syncEnvironmentProofRuntime`, while traversal camera and vehicle locomotion
  read and write a different pose source.
- Dynamic mountables are not first-class collision or platform owners yet.
  `MetaverseEnvironmentPhysicsRuntime` ignores dynamic mount collision proxies,
  so the skiff can be focused and mounted but is not a real solid moving
  platform in physics.
- Attachments have no orientation contract beyond "mount with identity local
  transform under the socket".
  That is why the pistol can point roughly forward while still being upside
  down.
- Socket debug markers are always spawned in the main scene.
  That is why the colored spheres are visible.
- Shared and server presence contracts now carry pose plus mounted occupancy
  reference state for vehicle id, entry or seat id, and occupant role.
  They do not yet carry replicated seat-local look or parent-relative seat
  pose beyond that occupancy reference.

## Target Runtime Model

This is the runtime graph the implementation should converge toward.

- asset manifests define:
  - vehicle asset identity
  - seat definitions
  - entry definitions
  - attachment grip or orientation metadata
- metaverse proof config assembles local proof assets into runtime-ready
  metaverse config without inventing gameplay rules
- vehicle runtime instances own:
  - canonical simulation pose
  - seat occupancy state
  - entry resolution
  - vehicle-role input acceptance
- traversal runtime owns:
  - character locomotion state outside vehicles
  - occupancy transitions into and out of seats
  - driver intent routing into the occupied vehicle
  - dismount handoff back to grounded or swim routing
- character presentation owns:
  - seated versus grounded versus swim animation selection
  - character anchor alignment from occupancy state
  - no direct interpretation of raw driver input
- camera presentation owns:
  - camera resolution from seat policy after simulation truth is known
  - seat-local look limits
  - no mutation of vehicle authority pose
- physics owns:
  - hull and platform collision
  - moving-platform support when earned
  - no seat semantics
- scene or render code owns:
  - visual decoration
  - debug visualization
  - interpolation or sway derived from simulation
  - no authority branching
- shared and server layers own:
  - replicated occupancy state after the local model is proven
  - seat and driver authority rules across clients

## Runtime Layering Laws

These rules should be treated as implementation law for this slice:

- simulation pose is canonical
- presentation derives from simulation pose only
- replication derives from simulation and occupancy state only
- render sway, bob, and interpolation must never become authority truth
- seats may constrain camera and look, but camera code must not mutate vehicle
  simulation directly
- character presentation may consume occupancy state, but it must not decide
  who owns steering
- physics owns solid collision and platform motion, not seat role semantics
- entry resolution may choose a seat, but entry data is not the seat runtime
- debug markers and proof aids are opt-in only

## Current Frame Order From Code

The current frame order is implicit in
`client/src/metaverse/classes/webgpu-metaverse-runtime.ts`.

Today the frame effectively runs as:

1. input sampling
   - `MetaverseFlightInputRuntime.readSnapshot()`
2. traversal update
   - `MetaverseTraversalRuntime.advance()`
   - this currently owns grounded, swim, and mounted-skiff motion
3. dynamic body presentation sync
   - `MetaverseEnvironmentPhysicsRuntime.syncPushableBodyPresentations()`
4. presence sync
   - local pose push plus remote roster shaping
5. scene presentation sync
   - `createMetaverseScene().syncPresentation()`
   - this currently also reapplies mounted seat alignment in render space
6. debug sync
7. renderer submit

Immediate consequences of the current order:

- vehicle simulation is not a distinct phase yet
- seat occupancy alignment is still partly a scene concern
- camera truth is produced before a generic vehicle-seat runtime exists
- dynamic mount collision and moving-platform handoff are not part of the
  frame lifecycle yet

## Target Frame Lifecycle

The final system should make frame order explicit and testable.

Target frame order:

1. input sampling
   - raw device state becomes one typed metaverse input snapshot
2. interaction and occupancy intent resolution
   - board, dismount, switch-seat, interact-seat, and use-station intents are
     resolved
3. traversal routing
   - choose grounded or swim locomotion, or occupied-seat control routing
4. vehicle simulation
   - driver-controlled vehicles update canonical simulation pose from routed
     seat input
5. physics step and platform resolution
   - collision, solid hull resolution, and moving-platform handoff run here
6. seat occupancy alignment
   - occupied character anchor resolves from finalized vehicle and seat
     simulation state
7. simulation pose finalization
   - local character, occupied seat, and vehicle snapshots become canonical
8. presence and replication shaping
   - only simulation and occupancy state may feed this step
9. presentation
   - camera resolves from seat or locomotion policy
   - render-only decoration, interpolation, and sway derive from finalized
     simulation
10. render submit

Implementation law:

- no later step may mutate earlier simulation truth
- presentation may decorate simulation but may not repair bad simulation
- seat alignment must happen before camera resolution if camera depends on seat
  policy

## Current Input Path From Code

The current metaverse input flow is:

1. browser events update `MetaverseFlightInputRuntime`
2. `readSnapshot()` emits one `MetaverseFlightInputSnapshot`
3. `WebGpuMetaverseRuntime.#syncFrame()` passes that snapshot directly into
   `MetaverseTraversalRuntime.advance()`
4. in mounted-skiff mode, traversal forwards locomotion axes into
   `advanceSurfaceLocomotionSnapshot()`
5. traversal writes the resulting vehicle pose back through
   `setDynamicEnvironmentPose()`
6. camera and character presentation are derived from traversal state
7. scene presentation consumes that state and re-applies seat alignment

There is also one out-of-band occupancy path:

- `MetaverseStageScreen` button -> `WebGpuMetaverseRuntime.toggleMount()` ->
  scene interaction snapshot -> `MetaverseTraversalRuntime.syncMountedEnvironment()`

This is sufficient for the proof slice, but it is too implicit for a durable
seat system.

## Target Input Routing

The durable routing contract should be:

1. raw device input
2. metaverse input snapshot
3. traversal interprets context:
   - free locomotion
   - seat interaction intent
   - occupied-seat control intent
4. occupied seat policy resolves allowed controls:
   - driver seat maps movement or yaw into vehicle control intent
   - passenger seat suppresses vehicle steering and may expose look-only or
     station actions
   - turret seat maps look or fire controls into station intent
5. vehicle runtime consumes only vehicle control intent, not raw device input
6. character presentation consumes only finalized occupancy state
7. camera consumes only finalized seat or locomotion state

Implementation law:

- raw input must not flow directly into vehicle simulation once seat routing
  exists
- seat role policy decides which controls survive routing
- traversal owns routing, but vehicle runtime owns motion

## Seat Runtime Shape

The plan now requires an explicit seat runtime object model.

Recommended runtime ownership:

- one `VehicleRuntime` instance per active vehicle
- each `VehicleRuntime` owns a stable collection of `VehicleSeatRuntime`
  instances keyed by seat id
- each `VehicleSeatRuntime` owns:
  - immutable authored seat definition reference
  - current occupancy state
  - current seat-local look state if the role allows it
  - resolved seat-local simulation transform
- occupancy lives on the seat runtime first, with vehicle-level aggregate
  accessors for convenience
- the character runtime does not own seat occupancy
- traversal requests occupancy transitions, but the vehicle runtime commits
  them

Recommended shape guidance:

- `VehicleRuntime` should be a class or invariant-bearing runtime owner
- `VehicleSeatRuntime` should also be a class or explicit owner type, not
  anonymous object soup
- snapshots exposed outward should stay readonly and data-shaped

Minimum seat runtime fields:

- `seatId`
- `seatRole`
- `seatNodeName`
- `occupantPlayerId | null`
- `occupantCharacterId | null`
- `entryPolicyId`
- `cameraPolicyId`
- `controlRoutingPolicyId`
- `lookLimitPolicyId`
- `seatLocalPose`
- `seatLocalLookState`

The exact field names may change, but this ownership model should not.

## Repo Placement Map

Keep implementation aligned to the repo’s current domain boundaries.

- `client/src/assets/types`
  - manifest types for seats, entries, vehicle orientation descriptors, and
    attachment grip metadata
- `client/src/assets/config`
  - manifest entries for vehicles, seats, entries, and attachments
- `client/src/metaverse/traversal`
  - occupancy transitions, locomotion handoff, and camera or character
    snapshot shaping only
- `client/src/metaverse/render`
  - scene graph mounting, seat anchor lookup, debug markers, and render-only
    decoration only
- `client/src/physics`
  - generic collision, moving-platform, and dynamic-body ownership
- `client/src/metaverse`
  - metaverse-local vehicle and seat orchestration that is not reusable enough
    for top-level shared client domains
- `packages/shared/src/metaverse`
  - only the promoted mounted-occupancy contracts that cross workspace
    boundaries
- `server/src/metaverse`
  - metaverse authority for mounted occupancy only after shared promotion is
    earned

## Minimal Folder Growth Plan

Do not let this foundation stay smeared across
`metaverse-traversal-runtime.ts`, `webgpu-metaverse-scene.ts`, and one app
proof assembly file forever.

When Step 2 begins, spawn the minimum metaverse-local structure needed under a
new `client/src/metaverse/vehicles/` concern:

- `client/src/metaverse/vehicles/types`
  - vehicle runtime snapshots, seat runtime snapshots, entry definitions after
    proof assembly
- `client/src/metaverse/vehicles/classes`
  - vehicle runtime owners and seat occupancy owners
- `client/src/metaverse/vehicles/presentation`
  - vehicle or seat presentation shaping only if it grows beyond one file
- `client/src/metaverse/vehicles/policies`
  - seat-role or camera-role policy files only if multiple policies land

Do not create all folders up front if one or two files are enough. Spawn them
only when the current hotspots would otherwise mix concerns further.

`client/src/app/states/metaverse-asset-proof.ts` is acceptable as the current
proof assembly surface, but if seat and entry proof assembly grows during Step
3 it should move into `client/src/metaverse/config/` so `app` does not become
the long-term owner of metaverse gameplay configuration.

## Current Hotspots To Shrink

Fresh implementation work should treat these files as extraction hotspots, not
as permanent destinations for more seat or vehicle complexity:

- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
  - keep locomotion routing here, but move durable vehicle-seat runtime
    ownership out once generic occupancy lands
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
  - keep scene binding and presentation here, but move seat or vehicle
    authority logic out
- `client/src/app/states/metaverse-asset-proof.ts`
  - keep only transitional proof assembly here until metaverse-local config
    earns a dedicated owner
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
  - keep orchestration here, but do not let it absorb seat policy or vehicle
    control law

If a fresh session is about to add more branching to one of these files, it
should first ask whether the new `client/src/metaverse/vehicles/` concern is
already earned.

## Durable End State

The durable model should be:

- characters own animation, socket hierarchy, and seat-anchor alignment
- seats own occupancy, local seat pose, seat role, camera policy, look limits,
  and action routing
- vehicles own world motion, physics, seat registry, entry points, and
  role-specific control authority
- entry points are not the same thing as seats
- attachment orientation is attachment-authored or attachment-configured, not
  guessed from character sockets
- visual bob or sway may decorate a vehicle, but authority yaw, seat
  orientation, camera truth, and collision must resolve from one explicit
  runtime source
- remote presence must eventually replicate mounted occupancy explicitly, not
  infer it from loose world pose

## Hard Rules For This Plan

- Do not solve seat orientation with character-specific rescue offsets in
  `humanoid_v2`.
- Do not keep vehicle drive ownership keyed by
  `environmentAssetId === "metaverse-hub-skiff-v1"`.
- Do not keep using one generic `mounted` mode if driver, passenger, and
  turret seats need different camera and input rules.
- Do not let render-only motion become hidden authority truth for camera, seat
  alignment, or multiplayer sync.
- Do not keep always-on socket debug visuals in normal runtime output.
- Do not add more short-term booleans such as `isDriverSeat` or `isTurretSeat`
  in scattered JSX or render code; use typed seat roles and policies.
- Do not let `client/src/app/states/metaverse-asset-proof.ts` become the
  permanent home of seat and vehicle runtime contracts.

## Step 1 — Freeze Orientation Truth

Status: completed.

Fix the orientation problem first, because every later seat or camera decision
depends on it.

Work:

- audit the real local forward and up axes for:
  - `metaverse-hub-skiff`
  - the active full-body character render asset
  - the pistol attachment
- decide whether the correct fix is authored asset rotation, manifest metadata
  correction, or both
- stop treating `forwardModelYawRadians` as an eyeballed constant
- separate authority yaw from decorative render sway so camera, seat transform,
  and vehicle control all agree on one forward axis
- add explicit runtime tests for:
  - simulation yaw to render yaw conversion
  - render yaw to simulation yaw conversion
  - mounted seat facing versus vehicle forward
  - forward, backward, left, and right mapping for driver input

Likely owners:

- `client/src/assets/config/environment-prop-manifest.ts`
- `client/src/metaverse/traversal/presentation/mount-presentation.ts`
- `client/src/metaverse/vehicles/types` if orientation descriptors outgrow the
  current single-file shape
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `tests/runtime/client/metaverse-mount-presentation.test.mjs`
- `tests/runtime/client/metaverse-runtime.test.mjs`

Exit check:

- the skiff forward axis is visually and numerically correct
- seated forward agrees with vehicle forward
- driver camera yaw, vehicle yaw, and seated character yaw all agree on the
  same facing truth

## Step 2 — Split Seat Occupancy From Skiff Proof Logic

Status: completed.

Convert the current mounted path from "special skiff mode" into generic
occupied-seat ownership.

Work:

- replace `MountedSkiffRuntimeState` and `#mountedSkiff*` fields with generic
  mounted-seat or mounted-vehicle ownership
- remove the `"metaverse-hub-skiff-v1"` special case from traversal runtime
- keep `humanoid_v2` generic; seated animation should come from occupancy
  state, not from vehicle-specific character code
- make driver, passenger, and turret behavior explicit seat-role policy
  instead of hidden code branching

Likely owners:

- `client/src/metaverse/vehicles/types`
- `client/src/metaverse/vehicles/classes`
- `client/src/metaverse/traversal/types/traversal.ts`
- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
- `client/src/metaverse/traversal/presentation/character-presentation.ts`
- `client/src/metaverse/config/metaverse-locomotion-modes.ts`

Exit check:

- the same character asset can occupy any compatible seat role
- no mount locomotion path is keyed by one hardcoded vehicle id

## Step 3 — Replace The Single `seat_socket` Vehicle Contract With Seat Definitions

Status: completed.

The current environment mount descriptor is too small for durable vehicles.

Work:

- replace the single-seat environment contract with a seat-definition array
- each seat definition should carry at least:
  - stable seat id
  - authored seat node name
  - seat role
  - occupancy animation intent
  - seat-local camera policy id
  - look limit policy
  - control routing policy
  - direct-entry eligibility
  - dismount or exit anchor data
- use authored seat-node local rotation as primary facing truth
- keep `bow`, `stern`, `port`, and `starboard` only as higher-level vehicle
  semantics, not as the only way to orient occupants
- support multiple seats on one asset without inventing seat behavior in
  runtime code

Likely owners:

- `client/src/assets/types/environment-asset-manifest.ts`
- `client/src/assets/config/environment-prop-manifest.ts`
- `client/src/app/states/metaverse-asset-proof.ts`
- `client/src/metaverse/config` if proof assembly outgrows `app/states`
- `client/src/metaverse/vehicles/types`
- `client/src/metaverse/types/metaverse-runtime.ts`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `docs/localdev/metaverse-asset-pipeline.md`
- `docs/localdev/metaverse-asset-delivery-rules.md`

Exit check:

- one boat can expose a driver seat, one or more passenger benches, and a
  turret-like station through data
- a left-side bench seat can face right because the seat node says so, not
  because the runtime guessed a quarter turn

## Step 4 — Separate Boarding, Entry, And Seat Selection

Status: completed.

A vehicle should support more than one way to enter it.

Work:

- add entry definitions separate from seat definitions
- support direct seat entry when the player intentionally targets a seat
- support hull or deck boarding without forcing the nearest seat to become the
  driver seat
- allow empty driver seats to remain claimable after boarding from another
  entry point
- support cosmetic seats that look like seats but are not usable occupancy
  targets

Likely owners:

- `client/src/assets/types/environment-asset-manifest.ts`
- `client/src/app/states/metaverse-asset-proof.ts` until the proof assembly
  migrates into `client/src/metaverse/config`
- `client/src/metaverse/vehicles/types`
- `client/src/metaverse/vehicles/classes`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
- `client/src/metaverse/components/metaverse-stage-screen.tsx`

Exit check:

- boarding a boat and occupying a seat are distinct actions
- the player can swim to a passenger seat and sit there directly
- the player can board the vehicle without being forced into driver ownership

## Step 5 — Move Camera Policy Under Seat Role Ownership

Status: completed.

Camera behavior must come from seat role, not from the bare fact that the
player is mounted.

Work:

- give each seat role its own camera policy
- driver seat camera follows vehicle truth
- passenger seat camera follows seat or vehicle truth but preserves seat-local
  look limits
- turret or weapon pod camera may pivot within authored yaw and pitch arcs
- seated bodies remain locked to the seat while the camera performs limited
  head-look relative to seat local space
- do not allow seated occupants to rotate endlessly in place

Likely owners:

- `client/src/metaverse/vehicles/types`
- `client/src/metaverse/vehicles/policies` if multiple seat-camera policies
  land
- `client/src/metaverse/traversal/presentation/camera-presentation.ts`
- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
- `client/src/metaverse/types/metaverse-runtime.ts`

Exit check:

- driver control turns the vehicle
- seated characters stay seated and rotation-locked to the seat
- passengers can look around without body spin and without full 360-degree
  neck rotation

## Step 6 — Make Dynamic Vehicles First-Class Solid World Owners

Status: completed.

The current skiff is mountable but not physically solid in the way a durable
metaverse vehicle needs.

Work:

- stop ignoring dynamic mount collision in
  `MetaverseEnvironmentPhysicsRuntime`
- make the hull and seat supports collideable in physics
- preserve a clean distinction between:
  - solid hull or deck collision
  - seat occupancy
  - entry interaction volumes
- first prove static or gently moving solid-vehicle boarding
- then add moving-platform support for walking passengers on a moving vehicle
- use relative platform motion or equivalent explicit moving-platform
  ownership for cruise-ship style walking; do not fake it through camera-only
  motion

Likely owners:

- `client/src/metaverse/vehicles/classes`
- `client/src/metaverse/classes/metaverse-environment-physics-runtime.ts`
- `client/src/metaverse/states/metaverse-environment-collision.ts`
- `client/src/physics`
- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`

Exit check:

- the player cannot ghost through the skiff hull
- benches and seat supports are solid
- later moving-deck work has a clean platform handoff model instead of a
  one-off boat exception

## Step 7 — Add Attachment Grip And Orientation Contracts

Status: completed.

The current attachment system is intentionally minimal, but it is too small
for reliable held tools and weapons.

Work:

- add attachment-authored or manifest-owned grip orientation truth
- support explicit forward and up alignment for handhelds
- add optional secondary-hand or buttstock support points where needed
- keep character sockets canonical; do not fork socket ids per weapon or per
  humanoid
- keep debug markers optional and developer-only

Likely owners:

- `client/src/assets/types/attachment-asset-manifest.ts`
- `client/src/assets/config/attachment-model-manifest.ts`
- `client/src/app/states/metaverse-asset-proof.ts` until proof assembly
  migrates into `client/src/metaverse/config`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `docs/localdev/metaverse-canonical-rig.md`
- `docs/localdev/metaverse-asset-delivery-rules.md`

Exit check:

- the pistol is held right-side up
- the same attachment can mount cleanly across compatible humanoid skeletons
- socket debug spheres are hidden in normal runtime

## Step 8 — Extend Shared Contracts And Authority Only After Local Proof

Status: completed.

This step should happen only after the local client-side model proves the right
shape.

Work:

- add durable shared contract fields for:
  - mounted vehicle id
  - occupied seat id
  - seat role
  - optionally seat-relative pose or vehicle-relative pose reference
- keep server ownership explicit:
  - seat occupancy authority
  - driver control authority
  - vehicle motion authority
- make remote character presentation seat-aware instead of world-pose-only

Likely owners:

- `packages/shared/src/metaverse`
- `server/src/metaverse`
- `client/src/metaverse/classes/metaverse-presence-runtime.ts`

Exit check:

- remote players occupy the correct seat and role
- seated remote avatars do not drift or appear as free-standing characters near
  the vehicle
- future server-authoritative vehicles have an earned contract surface

## Step 9 — Tighten Tests, Validation, And Documentation

Status: completed.

This plan is not complete without durable validation.

Work:

- add runtime tests for:
  - vehicle-forward and seat orientation truth
  - seat-local facing for driver, passenger, and side-bench seats
  - direct seat entry versus hull boarding
  - seated camera yaw and pitch clamps
  - hidden versus visible socket debug output
  - attachment grip orientation
  - solid hull collision
  - moving-platform handoff once that slice lands
- update local docs once the new contracts are proven:
  - `docs/localdev/metaverse-canonical-rig.md`
  - `docs/localdev/metaverse-asset-pipeline.md`
  - `docs/localdev/metaverse-asset-delivery-rules.md`
  - `docs/localdev/metaverse-next-push-plan.md`
- keep `./tools/verify` as the stop-ship gate

Exit check:

- orientation and seat behavior are protected by tests instead of memory
- asset rules and runtime rules describe the same mounted system

## Fresh-Start Execution Sequence

If this plan is picked up in a new session, the recommended first pass is:

1. re-read the steering surfaces listed in `Read This First`
2. inspect the audited files listed in `Current Audited Files`
3. restate the `Target Runtime Model` and `Runtime Layering Laws` before
   editing anything
4. execute only Step 1 first and prove orientation truth with tests
5. after Step 1 passes, create the minimum `client/src/metaverse/vehicles/`
   structure needed for Step 2
6. do not start shared or server promotion until Step 2 through Step 5 are
   locally proven

If a new session cannot explain the target runtime graph in the same terms used
here, it should not start implementation yet.

## Recommended Rollout Order

1. Step 1 first. Do not add more seat or vehicle behavior on top of ambiguous
   vehicle-forward and seat axes.
2. Step 2 and Step 3 next. That is the minimum contract work needed to stop
   hardcoding the skiff and single `seat_socket` path.
3. Step 5 can land with the first driver and passenger seat pass.
4. Step 4 should land before broader content because boarding and seat
   selection change user-facing semantics.
5. Step 7 can land in parallel once seat ownership stops shifting.
6. Step 6 should be split:
   - first solid dynamic hull and boarding
   - then moving-platform walking
7. Step 8 only after the client-local model proves stable enough to promote.
8. Step 9 happens throughout, but the verification net must be in place before
   declaring the foundation complete.

## Foundation Completion Bar

Do not consider this foundation complete until all of these are true:

- driver input rotates the vehicle, not a free-spinning seated body
- seat local orientation determines occupant facing
- one vehicle can expose multiple usable seats with different roles
- boarding and seat occupancy are separate concepts
- the hull is solid and collideable
- passengers can look around within seat-local limits without spinning in
  place
- the pistol or other handheld tools hold the correct forward and up
  orientation
- socket debug markers are opt-in only
- the shared and server path for mounted occupancy is clear and testable

## Immediate First Slice After This Review

If this plan is executed incrementally, the first slice should be:

1. fix bow or seat orientation truth
2. hide socket debug markers behind a debug flag
3. remove the skiff-specific mounted state name and special case
4. introduce seat definitions for driver and one passenger seat
5. give the driver seat camera and control ownership over the vehicle

That slice is small enough to ship, but it still moves the system toward the
durable model instead of adding more glue.
