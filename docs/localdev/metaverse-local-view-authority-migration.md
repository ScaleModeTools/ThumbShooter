# Metaverse Local View Authority Migration

Purpose: remove server-driven local camera jitter by separating local view
ownership from authoritative world traversal, then migrate the metaverse stack
toward a durable body/look authority split that scales to combat, mounts, and
future experiences.

## Step Plan

- [x] Step 1: Make unmounted local camera yaw client-owned inside traversal so
  authoritative body corrections no longer rewrite the local camera.
- [ ] Step 2: Reconcile local traversal from raw acked authoritative body
  snapshots only. Sampled and extrapolated world frames remain presentation-only
  for remote players.
- [ ] Step 3: Add a dedicated metaverse world look contract for absolute look
  yaw and pitch instead of overloading traversal yaw.
- [ ] Step 4: Teach server authority to consume explicit look state and keep
  body-facing, mount-facing, and look constraints as separate policies.
- [ ] Step 5: Extract shared traversal simulation into `packages/shared` so
  client prediction and server authority advance the same movement model.
- [ ] Step 6: Extend the body/look split through mounts, combat rewind, and
  future metaverse gameplay systems.

## Step 1 Scope

- Add a client-owned unmounted look-yaw runtime owner.
- Build grounded and swim camera presentation from local look yaw instead of
  authoritative body yaw.
- Preserve that local look yaw through authoritative grounded and swim body
  corrections.
- Keep mounted occupancy behavior unchanged for this slice.
- Add a regression test proving authoritative correction can move the body
  without taking over the local camera.

## Step 1 Exit Criteria

- Local camera yaw does not change when `syncAuthoritativeLocalPlayerPose()`
  runs for unmounted grounded or swim correction.
- Grounded and swim local look input still turns the camera smoothly.
- Character/world authority remains server-owned for traversal body state.

## Step 1 Completion Notes

- Added a client-owned unmounted look-yaw owner in
  `MetaverseTraversalRuntime`.
- Grounded and swim camera presentation now preserve local look yaw through
  authoritative body correction.
- Added a regression test proving authoritative correction can move local body
  yaw without taking over local camera yaw.
