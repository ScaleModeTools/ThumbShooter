# Metaverse Multiplayer Battle Readiness Plan

Role: plan. Durable code-grounded implementation plan for the push phase that
replaces the current polling-based realtime path with a battle-ready
multiplayer foundation.

Status: implemented.

Scope: escalated durable-truth implementation plan for this push only. This
document does not amend repo-wide `AGENTS.md` law; where conflict appears,
`AGENTS.md` wins.

## Implementation Status

Current phase state:

- Phase 0 is implemented
- Phase 1 is implemented
- Phase 2 is implemented
- Phase 3 is implemented
- Phase 4 is implemented
- Phase 5 is implemented
- Phase 6 is implemented
- Phase 7 is implemented
- Phase 8 is implemented

Implemented in Phase 0:

- metaverse-side developer telemetry now exposes authoritative world snapshot
  buffer depth, accepted snapshot update rate, latest simulation age,
  emitted-time clock offset estimate, current extrapolation time, and the
  percentage of sampled frames rendered from extrapolated data
- metaverse transport telemetry now exposes active snapshot path, snapshot
  stream liveness, reconnect count, last snapshot-stream transport error, and
  a snapshot-stream lane surface that is separate from the reliable command
  lane surface
- metaverse datagram telemetry now counts driver-control datagram send
  failures and surfaces that count directly in the developer HUD
- metaverse traversal telemetry now exposes cumulative local reconciliation
  correction count in the frozen HUD snapshot and developer overlay before
  authoritative player movement lands
- Duck Hunt co-op gameplay telemetry now exposes room snapshot buffer depth,
  projected simulation lag, room projection source, emitted-time clock offset
  estimate, accepted room snapshot update rate, snapshot-stream path and
  liveness, reconnect count, and player-presence datagram fallback/error truth
  in the developer HUD
- bench-owned cadence suites now compare one-second steady-state processing
  windows for metaverse remote-world sampling and Duck Hunt co-op room
  projection at `50 ms`, `40 ms`, `33 ms`, and `25 ms` tick intervals with
  config-owned suite budgets and bounded snapshot buffers
- runtime coverage now locks metaverse telemetry snapshot shaping, active-path
  and lane-health reporting, stream-liveness reporting, and emitted-time clock
  offset visibility, local reconciliation correction counting, plus the
  equivalent Duck Hunt room projection and transport telemetry surface

Implemented in Phase 1:

- metaverse world and Duck Hunt room tick contracts now carry split
  `simulationTimeMs` and `emittedAtServerTimeMs` metadata
- authoritative tick owners were moved into server composition so metaverse and
  Duck Hunt advancement can continue without poll cadence driving the tick
- metaverse and Duck Hunt client projection now align clocks from emitted time
  and sample against authoritative simulation time
- server reads no longer act as hidden tick owners for metaverse world or Duck
  Hunt room state
- runtime and typecheck coverage now locks the new tick shape, repeated-read
  simulation-time stability, and read-without-advance behavior

Implemented in Phase 2:

- shared reliable subscription contracts now exist for metaverse world and Duck
  Hunt room snapshot streams
- client snapshot streaming now uses persistent reliable WebTransport
  subscriptions with reconnect and HTTP fallback kept alive for rollback
- server WebTransport adapters now own subscriber registries, session-bound
  identity checks, disconnect cleanup, and latest-wins publish behavior for
  slow subscribers
- localdev WebTransport now supports persistent reliable stream takeover after
  the initial subscription frame
- Duck Hunt room projection now samples from a buffered authoritative room
  timeline instead of only one latest snapshot
- direct runtime coverage now locks stream connect, reconnect, fallback,
  duplicate snapshot rejection, session binding, persistent stream takeover,
  and latest-wins publish behavior

Implemented in Phase 3 so far:

- `WebGpuMetaverseRuntime` no longer uses
  `MetaversePresenceRuntime.remoteCharacterPresentations` as the remote render
  fallback; remote metaverse characters now wait for authoritative world
  snapshots while presence remains for join state and HUD truth
- authoritative metaverse player snapshots now carry explicit turn-rate data;
  the server derives that value into world snapshots and the client uses it to
  extrapolate remote yaw during snapshot gaps
- `MetaverseRemoteWorldRuntime.sampleRemoteWorld()` now uses reusable keyed
  lookup owners for next-player, next-vehicle, and previous-vehicle
  presentation matching instead of repeated per-frame linear `.find()` scans
- `MetaverseRemoteWorldRuntime` now reuses remote character and vehicle
  presentation owners across repeated samples and caches latest authoritative
  player and vehicle lookups for local reconciliation reads instead of
  rebuilding those render-path collections every sample
- runtime coverage now locks the authoritative-only remote render gate in the
  metaverse runtime, player turn-rate emission and yaw extrapolation,
  reusable presentation-owner behavior, latest-authority lookup refresh, and
  remote entity add/remove behavior in world-snapshot sampling
- the duplicate vehicle-smoothing audit is now closed: remote vehicles flow
  from authoritative world sampling into scene and physics once, while the
  local mounted vehicle still reconciles from fresh authoritative vehicle
  snapshots instead of from delayed remote presentation samples

Implemented in Phase 4:

- shared metaverse world contracts now include explicit `sync-player-pose`
  world commands and `world-player-pose-datagram` latest-wins datagrams, and
  the reliable world WebTransport request contract now normalizes both world
  command variants instead of only driver control
- `MetaverseWorldClient` now owns one latest-wins metaverse world datagram
  lane for both driver vehicle control and local player pose updates, with
  pose-command coalescing, per-lane failure telemetry, and reliable fallback
  kept alive for rollback
- the metaverse world latest-wins lane now uses a bounded recoverable fallback
  window instead of permanent sticky degradation; after a datagram failure the
  client temporarily routes through reliable commands, then re-enables
  datagram sends and clears the surfaced transport error after the next
  successful retry
- `MetaverseRemoteWorldRuntime` and `WebGpuMetaverseRuntime` now publish
  steady-state local player pose through the authoritative world client seam
  instead of routing it through `MetaversePresenceClient.syncPresence()`;
  presence remains for join state, membership recovery, and HUD truth
- Duck Hunt co-op now mirrors that transport split: player presence and aim
  stay on latest-wins datagrams while ready, start, kick, leave, and
  fire-shot remain on reliable room commands with HTTP fallback kept alive for
  rollback
- Duck Hunt co-op player-presence datagrams now use the same bounded
  recoverable fallback window as the metaverse world lane instead of degrading
  permanently after the first datagram failure
- the authoritative metaverse world runtime, HTTP command adapter, localdev
  WebTransport datagram parser, and datagram adapter now accept player-pose
  world commands; the datagram session binds to the first in-session player
  identity it sees and rejects later identity changes
- Duck Hunt reliable room-command sessions and latest-wins player-presence
  datagram sessions now bind to the first in-session player identity they see
  and reject later identity changes instead of trusting raw payload identity
- direct runtime coverage now locks world-command normalization, latest-wins
  player-pose datagram transport behavior, client pose-datagram send/fallback
  behavior, recoverable datagram fallback transitions and localdev transport
  status recovery, authoritative server pose-command acceptance, HTTP and
  datagram adapter parsing, Duck Hunt room command transport envelopes,
  Duck Hunt recoverable datagram fallback behavior, and metaverse or Duck Hunt
  datagram session identity binding

Implemented in Phase 5:

- mounted occupancy transitions now resolve through explicit reliable world
  commands instead of being authored only inside steady-state pose sync
- the metaverse client now tracks its latest issued traversal input sequence
  and only reconciles local authoritative movement once the world snapshot ack
  catches up to that processed input sequence
- shared metaverse world contracts now define traversal-intent commands and
  latest-wins traversal-intent datagrams for grounded and swim movement input
- `MetaverseRemoteWorldRuntime` and `WebGpuMetaverseRuntime` now publish local
  grounded and swim traversal intent through the authoritative world seam
  instead of publishing steady-state final pose
- `MetaverseAuthoritativeWorldRuntime` now advances unmounted grounded and swim
  players on the authoritative tick owner from traversal intent, emitting
  authoritative position, yaw, velocity, locomotion mode, animation
  vocabulary, and processed-input ack data for client reconciliation
- authoritative grounded jump ascent, descent, landing, and airborne animation
  vocabulary now resolve on the server tick owner, and client-side
  reconciliation preserves acked airborne grounded corrections instead of
  flattening them back onto local support during midair correction
- the metaverse server now owns an explicit authoritative surface and blocker
  model for dock support, crate blockers, and dynamic boat or skiff support so
  unmounted traversal and dismount recovery resolve against server-owned world
  geometry instead of client-local scene assumptions
- grounded versus swim routing, blocker constraint, support-height resolution,
  autostep handling, and post-dismount surface recovery now resolve from that
  authoritative surface state instead of from client locomotion hints across
  reliable world commands, HTTP fallback, and latest-wins datagram paths
- the temporary `sync-player-pose` world-command and datagram compatibility
  path has now been removed from shared contracts, client transport owners,
  localdev WebTransport parsing, and metaverse server adapters, so the world
  movement seam no longer accepts client-authored final pose as authoritative
  truth
- runtime and typecheck coverage now locks traversal-intent command
  normalization, latest-wins traversal-intent transport behavior, server-side
  authoritative unmounted traversal simulation, ack-gated local
  reconciliation, reliable occupancy transitions, authoritative surface and
  locomotion routing parity on server command and adapter paths, and the
  absence of the old player-pose world seam

Implemented in Phase 6:

- shared Duck Hunt fire-shot contracts now carry client shot sequence,
  client-estimated simulation time, and weapon context so combat commands have
  the timing and firing metadata needed for rewind resolution
- Duck Hunt co-op gameplay now emits projected authoritative room time and the
  active weapon id with each reliable fire-shot command instead of only a raw
  ray payload
- `CoopRoomRuntime` now owns a bounded authoritative combat-history buffer for
  combat-relevant bird and player state keyed by authoritative tick and
  simulation time, behind an explicit `combatRewind` rollout switch in room
  config
- Duck Hunt fire-shot resolution now rewinds against authoritative historical
  player presence and bird state on the server instead of resolving only
  against the present frame when latency intervenes, while duplicate-shot
  suppression and authoritative outcome acknowledgement continue through the
  player activity snapshot
- reliable Duck Hunt fire-shot commands are now explicitly covered on the
  server-bound room session identity path before rewind resolution, and HTTP
  fallback accepts the same rewind metadata contract instead of using a
  second-class command shape
- runtime and typecheck coverage now locks rewind-enabled versus present-frame
  behavior, scatter resolution under authoritative combat history, client
  fire-shot emission of estimated simulation time and weapon context, HTTP
  fallback acceptance of rewind metadata, and reliable or latest-wins Duck
  Hunt session identity binding for combat-relevant lanes

Implemented in Phase 7:

- metaverse battle cadence is now locked through explicit client and server
  config owners at `33 ms` authoritative tick plus fallback command or poll
  cadence, `66 ms` interpolation, `66 ms` max extrapolation, `66 ms` local
  freshness, and `6` buffered world snapshots
- Duck Hunt co-op cadence is now locked through explicit client and server
  config owners at `33 ms` authoritative room tick plus fallback poll cadence,
  `6` buffered room snapshots, `0 ms` projection interpolation, and `66 ms`
  capped extrapolation for room projection
- Duck Hunt co-op room projection now clamps projected room time against the
  locked extrapolation budget instead of allowing that cap to stay implicit in
  tick-sized runtime math
- local authority freshness for metaverse player, vehicle, and occupancy
  reconciliation now lives in a dedicated config owner while the existing
  skiff correction thresholds remain explicit in metaverse runtime config
- the Phase 0 cadence benchmark harness was rerun on April 13, 2026 across
  `50 ms`, `40 ms`, `33 ms`, and `25 ms`; `33 ms` is now the locked final
  cadence because it remained under the metaverse and Duck Hunt suite budgets
  while raising authority frequency over the older `50 ms` slice
- runtime coverage now locks the new metaverse cadence telemetry values and
  Duck Hunt co-op projection extrapolation cap

Implemented in Phase 8:

- runtime coverage now locks the final ship-gate surface for shared contract
  shape, metaverse and Duck Hunt transport bootstrap or stream fallback or
  reconnect behavior, sequence rejection, emitted-time clock alignment,
  interpolation and extrapolation correctness, ack-gated local prediction and
  reconciliation, and authoritative combat rewind validation
- validation scenarios now cover HTTP bootstrap, steady-state WebTransport
  success, WebTransport fallback and recovery, sustained mounted movement,
  sustained remote humanoid motion, and Duck Hunt co-op room streaming with a
  buffered authoritative room timeline
- rollout-switch rollback paths and runtime telemetry remain explicit for the
  metaverse world snapshot stream, Duck Hunt room snapshot stream,
  authoritative player movement, and combat rewind migration surfaces
- `./tools/verify` passed on April 13, 2026, including workspace build,
  typecheck, `351` runtime tests, cadence bench suites, and repo verification
  checks

## Goal

Make the current engine ready for multiplayer FPS combat by fixing the audited
realtime faults in this exact order:

- correct authoritative tick and time semantics
- remove RTT-gated steady-state snapshot polling
- move remote humanoid, vehicle, and world presentation onto one authoritative
  world-snapshot path
- eliminate avoidable hot-path allocation and duplicate smoothing
- move high-rate client updates onto latest-wins transport lanes
- replace client-authored metaverse pose replication with server-authoritative
  player movement
- add the history and validation required for authoritative combat resolution

This plan is not a brainstorm. It is the tracked implementation order for the
next engine push.

This push assumes WebTransport and WebGPU remain the chosen foundations.
Neither one proves smooth multiplayer by itself. Smoothness here will be
decided by authoritative timing, buffer policy, transport health, prediction,
reconciliation, and hot-path render behavior under load.

## What This Push Must Deliver

- smooth 60 FPS client rendering fed by buffered authoritative snapshots rather
  than request timing
- one explicit server-owned realtime timeline for players, vehicles, and combat
- one explicit server-owned tick and snapshot-emission owner for metaverse and
  Duck Hunt that keeps advancing even when no client polls
- one explicit transport split:
  - HTTP for bootstrap and fallback
  - reliable WebTransport subscription streams for steady-state snapshot
    delivery
  - reliable WebTransport command lanes for discrete commands and session
    actions
  - datagrams for latest-wins state or input
- one explicit subscriber-liveness owner that replaces poll-driven keepalive
  after streaming lands
- one explicit session-bound identity path for reliable and datagram lanes
- one explicit remote-presentation owner for metaverse world entities
- one shared realtime foundation usable by both the metaverse shell and Duck
  Hunt co-op
- one explicit stop-ship line: no multiplayer FPS battle experience ships on
  client-authored movement or present-time-only hit validation

## Non-Goals For This Push

- do not change the locked shell flow of profile/controller setup ->
  metaverse world -> in-world experience launch -> return to metaverse
- do not replace the locked `three/webgpu` + `three/tsl` + NodeMaterial render
  stack
- do not split the server into new workspaces, repos, or domain servers
- do not move transport sequencing, reconnect logic, or lane health policy into
  metaverse render/runtime owners
- do not generalize future battle systems beyond the shared authoritative
  foundation needed for metaverse traversal, Duck Hunt co-op, and FPS combat

## Read This First

This document is intended to run from fresh context.

Code is the primary source of truth for this plan.

Before implementation:

1. re-read the required `AGENTS.md` surfaces for repo law and domain
   boundaries
2. inspect the current runtime code paths listed below
3. treat docs as planning memory only; the repo must back every claim in code

Required steering surfaces:

- `AGENTS.md`
- `client/AGENTS.md`
- `client/src/AGENTS.md`
- `client/src/network/AGENTS.md`
- `client/src/metaverse/AGENTS.md`
- `client/src/experiences/AGENTS.md`
- `client/src/experiences/duck-hunt/AGENTS.md`
- `packages/AGENTS.md`
- `packages/shared/src/metaverse/AGENTS.md`
- `server/AGENTS.md`
- `server/src/metaverse/AGENTS.md`

Do not assume chat context not restated here.

This list is the minimum starting set. If implementation widens into another
touched subdomain, re-read the nearest `AGENTS.md` for that path before
editing.

## Current Audited Files

The current transport, authority, interpolation, and rendering path was
reviewed in these files:

- `client/src/network/classes/metaverse-world-client.ts`
- `client/src/network/classes/metaverse-presence-client.ts`
- `client/src/network/classes/coop-room-client.ts`
- `client/src/network/classes/authoritative-server-clock.ts`
- `client/src/network/types/realtime-transport-status.ts`
- `client/src/network/adapters/reliable-webtransport-json-request-channel.ts`
- `client/src/network/adapters/latest-wins-webtransport-json-datagram-channel.ts`
- `client/src/network/adapters/webtransport-http-fallback.ts`
- `client/src/network/adapters/metaverse-world-webtransport-transport.ts`
- `client/src/network/adapters/metaverse-presence-webtransport-transport.ts`
- `client/src/network/adapters/coop-room-webtransport-transport.ts`
- `client/src/network/adapters/metaverse-realtime-world-driver-vehicle-control-webtransport-datagram-transport.ts`
- `client/src/metaverse/config/metaverse-world-network.ts`
- `client/src/metaverse/config/metaverse-presence-network.ts`
- `client/src/metaverse/config/metaverse-runtime.ts`
- `client/src/metaverse/classes/metaverse-remote-world-runtime.ts`
- `client/src/metaverse/classes/metaverse-presence-runtime.ts`
- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
- `client/src/metaverse/vehicles/classes/metaverse-vehicle-runtime.ts`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `client/src/experiences/duck-hunt/network/duck-hunt-coop-network.ts`
- `client/src/experiences/duck-hunt/runtime/duck-hunt-coop-arena-simulation.ts`
- `packages/shared/src/metaverse/metaverse-realtime-world-contract.ts`
- `packages/shared/src/metaverse/metaverse-realtime-world-webtransport-contract.ts`
- `packages/shared/src/metaverse/metaverse-realtime-world-webtransport-datagram-contract.ts`
- `packages/shared/src/experiences/duck-hunt/duck-hunt-room-contract.ts`
- `server/src/index.ts`
- `server/src/adapters/localdev-webtransport-server.ts`
- `server/src/metaverse/classes/metaverse-session-runtime.ts`
- `server/src/metaverse/classes/metaverse-authoritative-world-runtime.ts`
- `server/src/metaverse/adapters/metaverse-world-webtransport-adapter.ts`
- `server/src/metaverse/adapters/metaverse-realtime-world-webtransport-datagram-adapter.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-directory.ts`
- `server/src/experiences/duck-hunt/adapters/duck-hunt-coop-room-webtransport-adapter.ts`
- `server/src/experiences/duck-hunt/adapters/duck-hunt-coop-room-webtransport-datagram-adapter.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-runtime.ts`

## Confirmed Current Problems

These are confirmed by the current code and must be treated as real defects,
not tuning opinions.

1. metaverse world snapshots are still arrival-driven on the client
   - `MetaverseWorldClient` polls snapshots on a timer
   - WebTransport only changes the request transport, not the steady-state
     snapshot model
2. snapshot timestamps are not authoritative simulation timestamps
   - `MetaverseAuthoritativeWorldRuntime.readWorldSnapshot()` stamps the
     current request time into the snapshot
   - `CoopRoomRuntime.advanceTo()` does the same for Duck Hunt room snapshots
3. remote metaverse humanoids still depend on reliable pose traffic
   - `MetaversePresenceClient` coalesces and serializes pose updates through
     one in-flight reliable request path
   - `WebGpuMetaverseRuntime` still falls back to presence-driven remote
     character presentation before world snapshots exist
4. the hot render path still allocates and scans too much
   - `MetaverseRemoteWorldRuntime.sampleRemoteWorld()` allocates new arrays and
     frozen objects every frame
   - it also repeatedly uses linear `.find()` lookups while sampling players
     and vehicles
5. vehicle presentation is smoothed in more than one owner
   - remote vehicle poses are time-sampled in `MetaverseRemoteWorldRuntime`
   - local mounted authority correction blends again in
     `MetaverseVehicleRuntime.syncAuthoritativePose()`
6. datagram fallback is sticky
   - one datagram failure permanently downgrades the lane to reliable fallback
     for the lifetime of the client
7. metaverse movement is still not battle-ready
   - the server accepts client-authored player pose through presence sync
   - there is no server-owned player movement timeline
   - there is no authoritative rewind/history path for FPS hit validation
8. authoritative progression is still demand-driven on the server
   - metaverse world advancement still happens inside snapshot reads and command
     handling
   - Duck Hunt room advancement still happens on read or command cadence rather
     than from one independent tick owner
9. removing polling today would also remove accidental liveness updates
   - metaverse world reads currently refresh observer heartbeat
   - Duck Hunt room reads currently refresh player-seen state before room
     advancement
10. reliable transport is still serialized and sticky in the wrong places
    - one reliable request queue still serializes snapshot reads and commands
    - once reliable fallback is entered, the client does not quickly recover to
      the primary path
11. reliable and datagram lanes still trust payload identity too much
    - reliable world requests accept claimed observer or player identity from
      the message payload
    - datagram commands still arrive without one server-bound gameplay identity
      check on the lane
12. the pushed-stream server shape needed for steady-state snapshots does not
    exist yet
    - the current WebTransport server handles request-response streams, not one
      subscriber registry with per-subscriber writer ownership
    - there is no explicit slow-subscriber backlog or latest-wins publish
      policy for server-pushed snapshot streams
13. Duck Hunt client projection still lacks a real snapshot buffer owner
    - room networking keeps one latest room snapshot
    - arena projection still derives motion from the current snapshot rather
      than sampling from a buffered authoritative room timeline

## Push-Phase Decisions

This push locks the following implementation decisions.

1. authoritative realtime snapshots must carry both simulation time and
   emission time
   - simulation time is the time of the world state being rendered
   - emission time is the server wall-clock time used for client clock
     alignment
2. steady-state remote motion must come from server-pushed snapshots, not from
   client polling cadence
3. metaverse presence is not allowed to remain the steady-state motion channel
   for remote characters
4. one entity gets one smoothing owner
   - no duplicate low-pass filtering in runtime and scene for the same data
5. latest-wins state or input and reliable commands keep separate lanes and
   separate sequencing rules
6. the repo is not multiplayer FPS battle-ready until server-authoritative
   player movement and rewind-based hit validation are in place
7. authoritative progression must continue without snapshot reads, HTTP polls,
   or command cadence driving the tick owner
8. removing snapshot polling must not remove player or room liveness; stream
   subscription lifetime or explicit heartbeat replaces read-driven keepalive
9. reliable snapshot subscription traffic and reliable command traffic must not
   share one serialized request queue or one sticky fallback owner
10. client prediction and reconciliation require an authoritative input-ack
    field in server snapshots
11. mount, dismount, and seat transitions must become explicit reliable world
    actions before client-authored pose replication is considered removed
12. reliable and datagram lanes must bind to a server-owned session identity
    instead of trusting raw payload `playerId` alone

## Push-Scoped Owner Boundaries

These boundaries apply to this push so rollout work does not leak across
domains or turn `WebGpuMetaverseRuntime` into a dumping ground.

- `client/src/network` owns stream/datagram transport, lane health,
  reconnect/fallback policy, sequencing, codecs, and transport status
- metaverse and Duck Hunt runtimes own snapshot consumption, interpolation,
  extrapolation, local prediction, reconciliation, and presentation shaping
- `MetaverseTraversalRuntime` remains the metaverse-local owner of locomotion
  and client-side movement prediction inputs
- `WebGpuMetaverseRuntime` may orchestrate runtime wiring, scene sync, and HUD
  publication, but it must not become the owner of reusable transport or
  locomotion policy
- server adapters remain transport-only bridges exposing shared contracts
- server runtimes own authoritative tick progression, player simulation,
  vehicle occupancy, history buffers, and combat validation
- server composition owns the tick/broadcast scheduling owner when that owner
  must outlive one request or one transport stream

## Migration And Cutover Rules

- every phase that changes transport, authority, or snapshot shape must land
  behind explicit config-owned rollout switches until its exit check and tests
  pass
- preferred rollout switches for this push:
  - `metaverseWorldSnapshotStreamEnabled`
  - `duckHuntRoomSnapshotStreamEnabled`
  - `metaverseWorldDatagramInputEnabled`
  - `metaverseAuthoritativePlayerMovementEnabled`
  - `metaverseAuthoritativeCombatRewindEnabled`
- dual-path operation is allowed only as a migration bridge and must declare
  source-of-truth precedence in code and telemetry
- authoritative world snapshots outrank presence-driven motion whenever both
  paths are present
- HTTP bootstrap and HTTP fallback may remain during rollout, but they become
  rollback paths once persistent streaming is healthy
- every bridge phase must expose:
  - enable state for the new path
  - rollback state for the legacy path
  - explicit removal condition for the legacy path in the next phase
- one lane failure must not permanently degrade unrelated lanes for the rest of
  the session unless the runtime has explicitly entered fallback mode and
  surfaced that state in telemetry
- presence may remain for roster or session compatibility during migration, but
  once Phase 3 exits it must not silently resume as steady-state remote motion
  truth
- Phase 6 must stay independently switchable from Phase 5 so authoritative
  movement can stabilize before combat rewind becomes mandatory
- when polling is removed, the replacement liveness owner must be explicit in
  code: subscription lease, transport-close handling, or heartbeat
- reliable snapshot subscription lanes and reliable command lanes may share
  WebTransport as a technology, but they must not share one in-flight request
  queue or one sticky fallback decision
- datagram and reliable command acceptance must reject payloads whose claimed
  player identity does not match the server-bound session identity for that
  lane

## Provisional Measurement Matrix

These are starting evaluation targets for the push. Final tuned values lock in
Phase 7.

- compare authoritative tick candidates at `20 Hz` (current baseline), `30 Hz`,
  and `60 Hz`
- compare interpolation-delay candidates as whole-tick buffers of `2`, `3`,
  and `4` ticks
- compare max-extrapolation caps of `1` tick and `2` ticks before hold or decay
  policy applies
- reconnect from a dropped steady-state snapshot stream without browser reload;
  target the first healthy replacement snapshot inside `2 s`
- count large reconciliation events explicitly:
  - translation correction magnitude
  - yaw correction magnitude
  - correction frequency during sustained play
- treat steady-state reliable fallback on latest-wins lanes as exceptional; each
  fallback and recovery event must be visible in transport telemetry

## Runtime Constraints For This Push

These are push-scoped implementation constraints, not repo-wide law.

- authoritative progression advances on explicit tick boundaries, never on
  request timing
- authoritative progression and snapshot emission must not depend on snapshot
  reads, HTTP polls, or command cadence
- interpolation targets authoritative simulation time, never packet arrival
  time
- clock offset estimation uses emitted server time, not inferred snapshot age
- players, vehicles, occupancy, and combat history must resolve from the same
  authoritative timeline
- HTTP may remain for bootstrap and fallback, but it must not remain the
  steady-state remote motion path when WebTransport is active
- the hot 60 FPS render path must not build new entity collections every frame
  when reusable owners can hold that state
- transport diagnostics must stay transport-owned in `client/src/network`
- metaverse render code must not infer transport state from env config
- do not add more realtime motion fields to the presence contract during this
  push; motion authority is moving into the world path
- pushed snapshot streams must own subscriber lifecycle, disconnect cleanup, and
  bounded backlog or latest-wins publish policy for slow consumers
- player or room liveness after stream migration must be owned by subscription
  lifetime or explicit heartbeats, not by accidental polling side effects
- authoritative movement snapshots must echo the last processed client input
  sequence or equivalent reconciliation ack
- mount, dismount, and seat changes must not remain encoded only as high-rate
  pose fields once movement authority moves into the world path
- Duck Hunt room projection must not depend on one latest snapshot once room
  streaming lands

## Delivery Order

Phases must land in order. Do not parallelize phases that change the same
runtime truth surfaces.

### Phase 0 - Freeze The Measurement Surface

Purpose:

- stop guessing on cadence, interpolation delay, extrapolation budget, and
  buffer depth

Work:

- extend the metaverse developer telemetry to expose:
  - authoritative tick interval
  - snapshot stream update rate
  - snapshot buffer depth
  - latest snapshot simulation age
  - emitted-time clock offset estimate
  - extrapolation time used on the current frame
  - percentage of frames rendered from extrapolated data
  - stream reconnect count
  - active snapshot path per domain:
    - HTTP polling
    - reliable snapshot stream
    - rollback/fallback path
  - reliable snapshot subscription lane health separate from reliable command
    lane health
  - stream liveness or heartbeat status per subscribed domain
  - datagram send failure count
  - reliable fallback state per lane
- add equivalent room-side telemetry for Duck Hunt co-op where the same timing
  questions matter
- expose Duck Hunt room snapshot buffer depth, projected simulation lag, and
  whether room rendering is projecting from a buffer or one latest snapshot
- add a repeatable runtime or bench harness that can compare the current 50 ms
  tick against candidate battle rates without changing public contracts twice
- keep all new budgets config-owned so final tuning is a config lock, not a
  contract rewrite
- count reconciliation corrections even if the baseline remains zero until the
  authoritative movement phase lands, so the telemetry surface is already
  stable before the authority migration
- extend transport telemetry shapes if needed rather than inferring stream path
  health from the current coarse transport status snapshot alone

Likely owners:

- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
- `client/src/metaverse/components/metaverse-developer-overlay.tsx`
- `client/src/metaverse/types/metaverse-runtime.ts`
- `client/src/network/types/realtime-transport-status.ts`
- `client/src/experiences/duck-hunt/runtime/duck-hunt-webgpu-gameplay-runtime.ts`
- `bench`

Tests:

- runtime tests for telemetry snapshot shaping
- runtime tests for active-path, lane-health, and stream-liveness telemetry
- bench or runtime harness for candidate tick-rate comparison

Exit check:

- the repo can capture a baseline for the current implementation without
  guessing why a frame is extrapolated or stale

### Phase 1 - Correct Authoritative Time Semantics

Purpose:

- make the snapshot timeline trustworthy before any transport rewrite

Work:

- extend metaverse world tick metadata in
  `packages/shared/src/metaverse/metaverse-realtime-world-contract.ts`
  to carry:
  - `currentTick`
  - `tickIntervalMs`
  - `simulationTimeMs`
  - `emittedAtServerTimeMs`
- extend Duck Hunt room tick metadata in
  `packages/shared/src/experiences/duck-hunt/duck-hunt-room-contract.ts`
  with the same split
- introduce explicit server-owned advancement owners for metaverse world and
  Duck Hunt room progression so ticks continue even when no client reads or
  commands arrive
- keep compatibility only as long as needed for migration; remove ambiguous
  single-field time semantics after all consumers switch
- stamp `simulationTimeMs` from authoritative tick ownership in:
  - `MetaverseAuthoritativeWorldRuntime`
  - `CoopRoomRuntime`
- stamp `emittedAtServerTimeMs` from actual server wall clock at snapshot
  emission time
- update `AuthoritativeServerClock` so offset estimation uses emitted time
- update metaverse and Duck Hunt client-side projection to target simulation
  time rather than request timing

Likely owners:

- `packages/shared/src/metaverse/metaverse-realtime-world-contract.ts`
- `packages/shared/src/experiences/duck-hunt/duck-hunt-room-contract.ts`
- `client/src/network/classes/authoritative-server-clock.ts`
- `client/src/metaverse/classes/metaverse-remote-world-runtime.ts`
- `client/src/experiences/duck-hunt/runtime/duck-hunt-coop-arena-simulation.ts`
- `server/src/index.ts`
- `server/src/metaverse/classes/metaverse-authoritative-world-runtime.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-directory.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-runtime.ts`

Tests:

- shared runtime and typecheck coverage for the new tick shape
- client clock tests for emitted-time alignment
- server runtime tests proving ticks continue advancing without snapshot reads
- server runtime tests proving repeated reads between ticks keep the same
  `simulationTimeMs`

Exit check:

- identical simulation state read twice between ticks no longer looks like two
  different simulation times

### Phase 2 - Add Server-Pushed Snapshot Streams

Purpose:

- remove RTT-gated steady-state snapshot polling from the happy path

Work:

- add a dedicated metaverse world subscription stream contract in
  `packages/shared`
- implement a long-lived reliable WebTransport stream for world snapshots
  instead of opening one request stream per snapshot read
- bind subscription setup and reliable command handling to a server-owned
  session identity so steady-state streams and discrete actions stop trusting
  raw payload player identity alone
- use the current WebTransport server shape in
  `server/src/adapters/localdev-webtransport-server.ts` by having the client
  open a persistent bidirectional stream and send one subscription frame at
  session start
- add explicit subscription lifecycle, liveness, and replacement keepalive
  rules so player or room membership does not depend on poll traffic
- add a server-owned subscriber registry with per-subscriber writer ownership,
  disconnect cleanup, and bounded backlog or latest-wins publish policy for
  slow consumers
- separate reliable snapshot subscription handling from reliable command
  handling so snapshot delivery does not serialize behind one request queue or
  share one sticky fallback state with commands
- keep HTTP snapshot bootstrap and HTTP fallback alive during rollout
- keep the current reliable request-response channel only for bootstrap and
  reliable commands until the steady-state stream is proven
- add an equivalent room snapshot stream for Duck Hunt after the metaverse
  world path is stable
- add a Duck Hunt room snapshot buffer owner or equivalent projection buffer on
  the client so room rendering stops projecting from one latest snapshot only
- expose stream health in transport status snapshots; do not infer it from env
  state alone
- ship stream enablement behind `metaverseWorldSnapshotStreamEnabled` first and
  keep a fast rollback to HTTP/request-response snapshot reads until Phase 3
  exits cleanly

Likely owners:

- `packages/shared/src/metaverse`
- `packages/shared/src/experiences/duck-hunt`
- `client/src/network/adapters/reliable-webtransport-json-request-channel.ts`
- `client/src/network/adapters/metaverse-world-webtransport-transport.ts`
- `client/src/network/adapters/coop-room-webtransport-transport.ts`
- `client/src/network/types/realtime-transport-status.ts`
- `client/src/network/classes/metaverse-world-client.ts`
- `client/src/network/classes/coop-room-client.ts`
- `client/src/experiences/duck-hunt/runtime/duck-hunt-coop-arena-simulation.ts`
- `server/src/adapters/localdev-webtransport-server.ts`
- `server/src/metaverse/classes/metaverse-session-runtime.ts`
- `server/src/metaverse/adapters/metaverse-world-webtransport-adapter.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-directory.ts`
- `server/src/experiences/duck-hunt/adapters/duck-hunt-coop-room-webtransport-adapter.ts`

Tests:

- client runtime tests for stream connect, reconnect, fallback, and duplicate
  snapshot rejection
- client and server tests for reliable-lane session binding and mismatched
  identity rejection
- client runtime tests for room-buffer projection after room streaming lands
- server adapter tests for subscribe, push, disconnect, cleanup, slow-subscriber
  policy, and liveness expiry or heartbeat handling

Exit check:

- when WebTransport is active, remote snapshots continue arriving without the
  client scheduling one poll per snapshot, and subscribed players stay live
  without read-driven keepalive

### Phase 3 - Make The World Snapshot Path The Only Remote Presentation Source

Purpose:

- remove split remote-character truth and duplicate smoothing

Work:

- make `MetaverseRemoteWorldRuntime` the only owner of remote metaverse player
  and vehicle presentation once world streaming lands
- stop using `MetaversePresenceRuntime.remoteCharacterPresentations` as a
  steady-state render source in `WebGpuMetaverseRuntime`
- keep presence only for join, membership recovery, and HUD truth until the
  later movement migration finishes
- add explicit player turn-rate data to authoritative world snapshots so remote
  yaw can interpolate or extrapolate correctly during gaps
- replace repeated per-frame `.find()` scans with keyed lookup owners
- replace per-frame array and object rebuilding in
  `MetaverseRemoteWorldRuntime.sampleRemoteWorld()` with reusable state owners
  or ring-buffer-backed scratch structures
- remove duplicate vehicle smoothing so authoritative sampling and local
  reconciliation do not both low-pass the same remote truth

Likely owners:

- `packages/shared/src/metaverse/metaverse-realtime-world-contract.ts`
- `client/src/metaverse/classes/metaverse-remote-world-runtime.ts`
- `client/src/metaverse/classes/metaverse-presence-runtime.ts`
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `client/src/metaverse/vehicles/classes/metaverse-vehicle-runtime.ts`

Tests:

- runtime tests proving remote characters still render correctly without the
  presence fallback path when world snapshots are active
- tests for sequence rejection and entity add/remove behavior
- bench or profiling checks for reduced per-frame allocation pressure

Exit check:

- remote humanoids and remote vehicles are rendered from one authoritative
  snapshot path, with one smoothing owner per entity

### Phase 4 - Move High-Rate Updates Onto Latest-Wins World Lanes

Status: implemented.

Purpose:

- remove RTT-serialized movement traffic from the realtime path

Work:

- add latest-wins metaverse world datagram contracts for high-rate local player
  updates
- bridge stage:
  - move local player world updates off `MetaversePresenceClient.syncPresence()`
    and into world-owned latest-wins transport
  - make the server world runtime, not the presence roster, the source that
    accepts high-rate movement-facing updates
- bind latest-wins lanes to server-owned session identity so the server does
  not trust raw payload `playerId` alone
- keep reliable join, leave, room/session actions, and other discrete commands
  on reliable transport
- keep driver vehicle control on datagrams, but replace permanent sticky
  degradation with a recoverable health policy
- mirror the same separation in Duck Hunt:
  - player presence and aim remain latest-wins
  - ready, start, kick, leave, and fire-shot remain reliable

Likely owners:

- `packages/shared/src/metaverse`
- `packages/shared/src/experiences/duck-hunt`
- `client/src/network/adapters/latest-wins-webtransport-json-datagram-channel.ts`
- `client/src/network/classes/metaverse-world-client.ts`
- `client/src/network/classes/metaverse-presence-client.ts`
- `client/src/network/classes/coop-room-client.ts`
- `client/src/metaverse/classes/metaverse-presence-runtime.ts`
- `server/src/metaverse/classes/metaverse-session-runtime.ts`
- `server/src/metaverse/adapters/metaverse-realtime-world-webtransport-datagram-adapter.ts`
- `server/src/experiences/duck-hunt/adapters/duck-hunt-coop-room-webtransport-datagram-adapter.ts`

Tests:

- client datagram send and recovery tests
- server datagram acceptance, identity-binding rejection, and sequence-drop
  tests
- transport status tests proving fallback can recover instead of degrading for
  the entire session

Exit check:

- no steady-state humanoid or vehicle motion path is serialized behind one
  reliable in-flight request

### Phase 5 - Replace Client-Authored Metaverse Pose Replication With Server-Authoritative Movement

Status: implemented.

Purpose:

- cross the line from smooth replication into actual multiplayer FPS movement
  authority

Work:

- move metaverse player movement ownership into
  `MetaverseAuthoritativeWorldRuntime`
- stop accepting client-authored world-space player pose as authoritative truth
- introduce world input snapshots or commands that describe player intent
  instead of final position
- extend authoritative player snapshots with `lastProcessedInputSequence` or an
  equivalent server ack used by client reconciliation
- advance players and vehicles on the same authoritative tick owner
- emit player position, yaw, velocity, locomotion mode, and mounted occupancy
  from that server-owned simulation
- keep local client prediction and reconciliation on the client side
- move mount, dismount, and seat transitions onto explicit reliable world
  commands instead of encoding them only inside pose replication
- keep presence as session or roster compatibility only, or retire it once the
  world path fully owns membership truth
- keep client prediction and authoritative movement enablement switchable so
  prediction tuning can be stabilized without reverting the whole transport
  foundation

Likely owners:

- `packages/shared/src/metaverse`
- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
- `client/src/metaverse/classes/metaverse-remote-world-runtime.ts`
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
- `server/src/metaverse/classes/metaverse-authoritative-world-runtime.ts`
- `server/src/metaverse/adapters`

Tests:

- server runtime tests for player simulation and input sequencing
- client runtime tests for local prediction and reconciliation
- integration tests for occupancy coherence between players and vehicles
- integration tests proving authoritative movement snapshots echo the processed
  input ack consumed by client reconciliation
- integration tests proving mount, dismount, and seat changes resolve through
  reliable commands rather than pose-authored occupancy

Exit check:

- the authoritative server, not the client, decides metaverse player movement,
  and the client can reconcile against authoritative input acks

Stop-ship note:

- the repo is not battle-ready for FPS combat until this phase is complete

### Phase 6 - Add Combat History And Rewind Validation

Status: implemented.

Purpose:

- make combat authority correct under latency, not only movement authority

Work:

- add bounded authoritative history buffers keyed by tick or simulation time
  for combat-relevant player and world state
- make reliable fire commands carry:
  - client shot sequence
  - client-estimated fire tick or simulation time
  - weapon or firing context identifiers as required by the experience
- validate combat commands against the server-bound session identity for the
  issuing lane before rewind resolution
- resolve shots against authoritative rewind history on the server
- keep local muzzle flash, recoil, and fire animation prediction client-side
  only
- add duplicate-shot suppression and explicit authoritative outcome acks
- reuse the same sequencing model across metaverse combat and Duck Hunt where
  possible
- keep combat rewind behind its own rollout switch so movement authority can
  remain on while combat validation tuning is still being hardened

Likely owners:

- `packages/shared/src/metaverse`
- `packages/shared/src/experiences/duck-hunt`
- `server/src/metaverse`
- `server/src/experiences/duck-hunt`
- `client/src/network`
- future battle experience runtimes under `client/src/experiences`

Tests:

- server runtime tests for rewind window validation
- command dedupe tests
- integration tests proving hit results are decided from authoritative history,
  not present-frame pose

Exit check:

- reliable combat outcomes are validated against historical authoritative state
  rather than only the server's present frame

Stop-ship note:

- no multiplayer FPS battle experience may ship before this phase lands

### Phase 7 - Retune Cadence, Buffers, And Reconciliation From Measured Data

Status: implemented.

Purpose:

- lock final battle budgets only after the transport and authority model is
  correct

Work:

- promote the following values to explicit config owners wherever they are
  still implicit or stale:
  - authoritative tick interval
  - interpolation delay
  - max extrapolation
  - snapshot buffer depth
  - local freshness budget
  - vehicle reconciliation thresholds
- compare the battle candidate tick rates using the Phase 0 measurement harness
- lock the final chosen values only after measured validation across metaverse
  traversal and Duck Hunt co-op
- update `docs/localdev/metaverse-smooth-motion-validation.md` with the final
  validated numbers once they are locked

Likely owners:

- `client/src/metaverse/config/metaverse-world-network.ts`
- `client/src/metaverse/config/metaverse-runtime.ts`
- `client/src/experiences/duck-hunt/network/duck-hunt-coop-network.ts`
- `server/src/metaverse/config/metaverse-authoritative-world-runtime.ts`
- `server/src/experiences/duck-hunt/config/coop-room-runtime.ts`
- `docs/localdev/metaverse-smooth-motion-validation.md`

Tests:

- bench or soak runs for each candidate rate
- runtime validation of final chosen budgets

Exit check:

- final cadence and buffer values are measured, justified, and visible in code

### Phase 8 - Final Verification And Handoff Gate

Status: implemented.

Purpose:

- turn this push from a code rewrite into a ship gate

Work:

- update runtime tests for:
  - contract shape
  - transport bootstrap, stream, fallback, and reconnect behavior
  - sequence rejection
  - clock alignment
  - interpolation and extrapolation correctness
  - local prediction and reconciliation
  - combat rewind validation
- add validation scenarios for:
  - HTTP bootstrap
  - WebTransport steady-state success
  - WebTransport fallback and recovery
  - sustained mounted movement
  - sustained remote humanoid motion
  - Duck Hunt co-op room streaming
- verify that each rollout switch still exposes a safe rollback path and that
  telemetry clearly shows which path is active
- run `./tools/verify`

Stop-ship conditions:

- any steady-state remote motion path still depends on per-snapshot client
  polling when WebTransport is active
- authoritative tick progression still depends on snapshot reads, HTTP polls,
  or command cadence
- any authoritative snapshot still uses request arrival time as simulation time
- subscribed players or rooms can be pruned because polling was removed without
  a replacement liveness owner
- presence still drives steady-state remote humanoid rendering after the world
  path migration
- the hot 60 FPS path still rebuilds entity presentation collections every
  frame
- reliable snapshot subscription and reliable command traffic still share one
  serialized request queue or one sticky fallback owner
- reliable or datagram lanes still trust raw payload `playerId` without
  server-bound session validation
- metaverse movement remains client-authored
- authoritative movement snapshots still lack a processed-input ack for client
  reconciliation
- mount, dismount, or seat changes remain pose-authored during authoritative
  movement
- combat validation remains present-time only
- Duck Hunt room rendering still projects from one latest snapshot without a
  buffer after room streaming lands
- transport fallback state is not visible to the runtime telemetry surface

Exit check:

- `./tools/verify` passes and the repo has one coherent multiplayer foundation
  for metaverse traversal, Duck Hunt co-op, and future FPS battle experiences

## Definition Of Done

This push is done only when all of the following are true:

- metaverse world snapshots are authoritative-time-correct
- authoritative metaverse and Duck Hunt progression no longer depends on reads
  or commands to advance
- metaverse and Duck Hunt both have steady-state server-pushed snapshot paths
- remote humanoids, vehicles, and world objects are rendered from buffered
  authoritative snapshots instead of request timing
- active subscribers stay live without poll-driven keepalive
- reliable snapshot subscriptions and reliable commands no longer share one
  serialized request queue or one sticky fallback owner
- high-rate client updates use latest-wins transport rather than reliable
  request serialization
- reliable and datagram lanes are bound to server-owned session identity
- metaverse player movement is server-authoritative
- authoritative movement snapshots echo a processed-input ack consumed by
  client reconciliation
- mount, dismount, and seat changes are explicit reliable world actions
- combat validation uses rewind history
- Duck Hunt room rendering uses buffered room snapshots or an equivalent room
  projection owner
- the 60 FPS render path no longer burns avoidable allocation budget on remote
  presentation churn

Anything short of that is an intermediate slice, not battle readiness.
