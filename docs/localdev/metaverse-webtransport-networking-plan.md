# Metaverse WebTransport Networking Plan

Role: plan. Durable code-grounded plan for evolving the current polling-based
metaverse and co-op networking into a fixed-tick, WebTransport-ready realtime
stack.

Status: proposed.

## Goal

Build one reusable realtime networking foundation that:

- keeps transport concerns inside `client/src/network` and server adapters
- keeps shared realtime contracts in `@webgpu-metaverse/shared`
- preserves headless authority on the server
- supports smooth client-side interpolation for on-foot, swim, mounted, and
  future vehicle-heavy metaverse play
- keeps mounted occupancy, vehicle motion, and player animation coherent at
  the same authoritative tick
- allows HTTP bootstrap and fallback while earning WebTransport for live
  realtime traffic
- does not block a later move from replicated state toward server-authoritative
  vehicle input handling

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
- `client/src/experiences/duck-hunt/AGENTS.md`
- `packages/AGENTS.md`
- `packages/shared/src/metaverse/AGENTS.md`
- `server/AGENTS.md`
- `server/src/metaverse/AGENTS.md`
- `server/src/experiences/duck-hunt/AGENTS.md`

Do not assume chat context not restated here.

## Definitions

- `authoritative tick`: one server-owned simulation step for a realtime world
- `snapshot sequence`: monotonic identifier for ordered full-snapshot
  acceptance
- `state sequence`: monotonic identifier for latest-wins client state or input
  updates
- `server time`: server-owned wall-clock timestamp used only for client clock
  alignment and interpolation targeting
- `clock offset`: client estimate of `serverTimeMs - localNowMs`
- `interpolation target time`: `estimatedServerTimeMs - interpolationDelayMs`
- `latest-wins message`: a state or input packet where older sequences must be
  dropped without retry
- `reliable command`: a command that must be processed or rejected exactly once
  at the contract boundary
- `occupancy coherence`: seat or entry occupancy and vehicle pose resolve from
  the same authoritative tick, not from unrelated updates

## Current Audited Files

The current networking, authority, and interpolation slice was reviewed in
these files:

- `client/src/network/AGENTS.md`
- `client/src/network/classes/metaverse-presence-client.ts`
- `client/src/network/classes/coop-room-client.ts`
- `client/src/network/codecs/metaverse-presence-client-http.ts`
- `client/src/network/codecs/coop-room-client-http.ts`
- `client/src/network/types/metaverse-presence-client.ts`
- `client/src/network/types/coop-room-client.ts`
- `client/src/metaverse/config/metaverse-presence-network.ts`
- `client/src/metaverse/classes/metaverse-presence-runtime.ts`
- `client/src/metaverse/classes/webgpu-metaverse-runtime.ts`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`
- `client/src/experiences/duck-hunt/network/duck-hunt-coop-network.ts`
- `client/src/experiences/duck-hunt/runtime/duck-hunt-coop-arena-simulation.ts`
- `client/src/experiences/duck-hunt/types/duck-hunt-coop-arena-simulation.ts`
- `packages/shared/src/metaverse/metaverse-presence-contract.ts`
- `packages/shared/src/metaverse/metaverse-realtime-world-contract.ts`
- `server/src/index.ts`
- `server/src/metaverse/classes/metaverse-authoritative-world-runtime.ts`
- `server/src/metaverse/adapters/metaverse-presence-http-adapter.ts`
- `server/src/metaverse/adapters/metaverse-world-http-adapter.ts`
- `server/src/metaverse/classes/metaverse-session-runtime.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-runtime.ts`
- `server/src/experiences/duck-hunt/adapters/duck-hunt-coop-room-http-adapter.ts`
- `tests/runtime/client/metaverse-presence-client.runtime.test.mjs`
- `tests/runtime/client/metaverse-runtime.test.mjs`
- `tests/runtime/client/coop-room-client.runtime.test.mjs`
- `tests/runtime/server/metaverse-authoritative-world-runtime.test.mjs`
- `tests/runtime/server/metaverse-presence-http-adapter.test.mjs`
- `tests/runtime/server/metaverse-world-http-adapter.test.mjs`
- `tests/runtime/shared/metaverse.contract.test.mjs`

## Repo Review Summary

- The current client networking pattern is `join -> poll snapshot -> throttle
  latest-wins sync`.
  Evidence:
  - `MetaversePresenceClient` in
    `client/src/network/classes/metaverse-presence-client.ts`
  - `CoopRoomClient` in
    `client/src/network/classes/coop-room-client.ts`
- Network clients already own the correct local responsibilities:
  transport, status snapshots, pending-update coalescing, membership loss
  handling, and acceptance of newer server snapshots.
- The current metaverse shared contract is presence-oriented, not world-state
  oriented.
  It includes:
  - player pose
  - animation vocabulary
  - locomotion mode
  - mounted occupancy reference
  - `stateSequence`
  - roster `snapshotSequence`
  - `tickIntervalMs`
  It does not include:
  - server time
  - authoritative vehicle snapshots
  - vehicle velocities
  - world tick identity shared across players and vehicles
- The current metaverse remote-presentation path is arrival-driven smoothing,
  not tick-targeted interpolation.
  Evidence:
  - `webgpu-metaverse-scene.ts` uses
    `remoteCharacterInterpolationRatePerSecond = 12`
  - `remoteCharacterTeleportSnapDistanceMeters = 3.5`
  - smoothing is based on `deltaSeconds`, not authoritative server time
- Mounted remote avatars are seat-anchored from occupancy reference, which is
  structurally correct, but smooth mounted presentation still depends on having
  authoritative vehicle snapshots to interpolate.
- Duck Hunt already contains the stronger authoritative model this plan should
  reuse:
  - fixed server tick in
    `server/src/experiences/duck-hunt/classes/coop-room-runtime.ts`
  - `currentTick` plus `tickIntervalMs` in shared room snapshots
  - client-side projection against authoritative tick timing in
    `client/src/experiences/duck-hunt/runtime/duck-hunt-coop-arena-simulation.ts`
- The server is already structurally ready for transport growth:
  - `server/src/index.ts` is a thin composition root
  - metaverse and Duck Hunt authority remain headless
  - HTTP handlers are adapters around domain runtimes

## Current Networking Model From Code

### Metaverse Today

1. `WebGpuMetaverseRuntime.#syncFrame()` advances local traversal and then
   calls `MetaversePresenceRuntime.syncPresencePose()`
2. `MetaversePresenceRuntime` converts local character presentation into a
   shared pose snapshot and forwards it into `MetaversePresenceClient`
3. `MetaversePresenceClient` coalesces those updates, posts `sync-presence`
   commands, and polls `/metaverse/presence`
4. remote players arrive as roster snapshots
5. `MetaversePresenceRuntime` turns those roster snapshots into
   `MetaverseRemoteCharacterPresentationSnapshot`
6. `webgpu-metaverse-scene.ts` interpolates unmounted remote characters from
   the latest accepted snapshot

### Duck Hunt Co-op Today

1. `CoopRoomClient` joins, polls room snapshots, and latest-wins syncs player
   presence
2. `CoopRoomRuntime` advances authoritative room state on fixed server ticks
3. shared room snapshots carry `currentTick` and `tickIntervalMs`
4. `duck-hunt-coop-arena-simulation.ts` projects birds locally from the last
   authoritative tick timing

### Consequences

- Duck Hunt has a real authoritative tick model already
- metaverse presence does not
- transport replacement alone will not produce smooth mounted multiplayer until
  the metaverse has authoritative world snapshots with tick and vehicle data

## Target Runtime Model

- shared contracts define:
  - authoritative realtime world snapshots
  - reliable commands
  - latest-wins state or input messages
  - explicit tick and server-time metadata
- server metaverse world runtime owns:
  - authoritative tick progression
  - player world state
  - vehicle world state
  - seat occupancy state
  - admission and disconnect cleanup
- client network clients own:
  - connection state
  - join/bootstrap
  - snapshot buffering
  - snapshot acceptance and sequence rejection
  - transport recovery
- metaverse runtime owns:
  - local input collection
  - local simulation and presentation
  - adaptation of authoritative remote snapshots into scene-facing remote
    presentation
- render code owns:
  - interpolation and late-frame projection derived from finalized
    authoritative snapshots
  - no authority repair
- transport adapters own:
  - HTTP vs WebTransport differences only
  - no domain rules

Migration naming law during this rollout:

- `MetaverseAuthoritativeWorld*` names are source-of-truth server world
  ownership
- `MetaversePresence*` names remain compatibility roster projection and
  transport surfaces until the client world-snapshot path replaces them
- do not add a second mutable server authority under `MetaversePresence*`
  naming once `MetaverseAuthoritativeWorld*` exists

## Runtime And Transport Laws

- authoritative progression advances on explicit tick boundaries, not on ad hoc
  request timing
- every realtime world snapshot must carry explicit tick identity and server
  time
- interpolation targets authoritative server time, never packet arrival time
- vehicle and occupancy state for the same frame must come from the same
  authoritative tick
- mounted remote presentation must interpolate vehicle truth first and resolve
  seat anchoring second
- render smoothing must never become authoritative world truth
- reliable commands and latest-wins updates must use separate sequencing rules
- HTTP bootstrap and fallback may coexist with WebTransport, but transport must
  not redefine domain contracts
- domain clients must not depend on `RequestInit` or other transport-native
  option types
- transport option seams must stay transport-neutral, with adapters mapping
  them into HTTP or WebTransport specifics

## Target Tick And Time Contract

The plan now requires explicit time and tick metadata.

Minimum bar:

- `currentTick: number`
- `tickIntervalMs: number`
- `serverTimeMs: number`

Client requirements:

- keep a smoothed local estimate of clock offset from authoritative
  `serverTimeMs`
- resolve render target time as:
  - `estimatedServerTimeMs - interpolationDelayMs`
- clamp and smooth offset corrections so a single delayed packet does not
  jerk remote motion

Implementation law:

- do not base interpolation on `Date.now()` at packet arrival alone
- do not let client frame time become the implied authoritative timeline

## Target Snapshot Shape

The exact names may change, but the data bar should not.

Recommended top-level authoritative shape:

- one world snapshot per authoritative metaverse tick
- that snapshot includes:
  - tick metadata
  - player snapshots
  - vehicle snapshots

Minimum player snapshot bar:

- `playerId`
- `characterId`
- `position`
- `yawRadians`
- `linearVelocity`
- `animationVocabulary`
- `locomotionMode`
- `mountedOccupancy | null`
- `stateSequence`

Minimum vehicle snapshot bar:

- `vehicleId`
- `environmentAssetId`
- `position`
- `yawRadians`
- `linearVelocity`
- `angularVelocityRadiansPerSecond`
- `seats`

Minimum seat occupancy bar inside vehicle snapshots:

- `seatId`
- `occupantPlayerId | null`
- `occupantRole`

Occupancy coherence rule:

- vehicle seat occupancy is the canonical authoritative owner
- any repeated player-side `mountedOccupancy` reference must be derived from
  that same tick’s vehicle seat state for convenience only
- do not author player occupancy and vehicle occupancy independently on
  separate sequencing paths

## Interpolation Model

### On-foot Avatars

- keep a short interpolation buffer
- render between two authoritative snapshots around the target server time
- extrapolate only briefly when a new snapshot is late
- preserve a teleport snap threshold for gross correction

### Mounted Avatars

- interpolate the authoritative vehicle snapshot first
- resolve seat or entry anchor from local authored seat definitions
- then mount the remote avatar to that interpolated vehicle anchor
- do not separately smooth the mounted avatar away from the seat anchor

### Vehicle Motion

- velocity is required on the authoritative vehicle snapshot
- without velocity, interpolation quality degrades and short extrapolation
  becomes much weaker

## Input And Authority Progression

The current repo mostly replicates state.

That is acceptable for the first metaverse realtime slice, but the long-term
authority path must stay open:

1. first prove authoritative state snapshots plus client interpolation
2. then promote driver and station control into explicit client input commands
3. server simulates vehicle motion from input
4. server broadcasts authoritative vehicle and occupancy state back to clients

Implementation law:

- do not let the first snapshot design block later server-authoritative driver
  input
- reliable command shapes should be able to carry input intent later without
  replacing the whole transport seam

## WebTransport Split

WebTransport is the target live transport, but it should be staged.

Phase 1 WebTransport:

- reliable framed messages only
- use this for:
  - bootstrap
  - join or leave
  - seat or entry occupancy commands
  - gameplay commands such as fire or ready
  - resync or snapshot recovery

Phase 2 WebTransport:

- add latest-wins datagrams only after the snapshot model proves stable
- valid datagram candidates:
  - client movement intent
  - client aim or look intent
  - low-stakes high-rate state hints

Datagram law:

- every latest-wins datagram channel must carry sequence numbers
- receiver must reject stale or out-of-order updates
- lossy delivery must degrade into temporary staleness, not jitter spikes or
  authority corruption

## Repo Placement Map

- `client/src/network`
  - transport-neutral client ownership, buffering, sequencing, and transport
    adapters
- `client/src/metaverse`
  - adaptation of realtime metaverse snapshots into traversal or scene-facing
    presentation
- `client/src/experiences/duck-hunt`
  - experience-local adaptation of authoritative room snapshots
- `packages/shared/src/metaverse`
  - metaverse realtime contracts only after the public shape is earned
- `server/src/metaverse`
  - authoritative metaverse tick runtime and transport adapters
- `server/src/experiences/duck-hunt`
  - authoritative Duck Hunt room tick runtime and transport adapters

## Step 1 — Freeze Transport Ownership Seams

Status: completed.

Work:

- keep `MetaversePresenceClient` and `CoopRoomClient` as owners of:
  - status snapshots
  - pending-update coalescing
  - snapshot acceptance
  - membership recovery
- move HTTP specifics behind explicit transport dependencies so transport
  parsing and posting are no longer fused to those owners
- replace raw `RequestInit` passthrough with transport-neutral command options
  so adapter hints stay adapter-owned instead of fetch-shaped
- keep behavior unchanged in this step

Exit check:

- HTTP behavior is unchanged
- transport-specific code is no longer the same concern as client snapshot
  ownership

## Step 2 — Add Shared Realtime World Contracts

Status: completed.

Work:

- add explicit metaverse realtime tick and server-time contract fields
- add authoritative vehicle snapshot shapes with velocity
- add canonical seat occupancy on the vehicle side
- keep shared snapshots readonly and boundary-normalized

Likely owners:

- `packages/shared/src/metaverse`
- `tests/runtime/shared`
- `tests/typecheck`

Exit check:

- shared contracts can describe one authoritative metaverse tick with players,
  vehicles, and occupancy coherence

## Step 3 — Add Metaverse Server Tick Authority

Status: completed.

Work:

- add a headless metaverse world runtime that advances on fixed ticks
- keep presence, vehicle state, and occupancy state in one authoritative owner
- emit authoritative world snapshots from that runtime
- keep `server/src/index.ts` thin and transport-agnostic

Likely owners:

- `server/src/metaverse/classes`
- `server/src/metaverse/types`
- `server/src/index.ts`

Exit check:

- metaverse server owns authoritative player and vehicle snapshots on explicit
  tick boundaries

## Step 4 — Add Client Snapshot Buffering And Interpolation

Status: completed.

Work:

- add client-side clock offset estimation from `serverTimeMs`
- add interpolation buffers keyed to authoritative tick and time
- interpolate remote on-foot avatars from buffered snapshots
- interpolate vehicles first, then resolve mounted seat anchoring
- preserve snap thresholds for gross divergence

Likely owners:

- `client/src/network`
- `client/src/metaverse/classes/metaverse-remote-world-runtime.ts`
- `client/src/metaverse/classes/metaverse-traversal-runtime.ts`
- `client/src/metaverse/render/webgpu-metaverse-scene.ts`

Exit check:

- remote avatars and vehicles interpolate from authoritative server time rather
  than packet arrival timing

## Step 5 — Add WebTransport Adapters

Status: completed.

Work:

- keep HTTP bootstrap and fallback path alive
- add WebTransport transport adapters without moving domain rules into them
- start with reliable framed messaging
- keep snapshot recovery explicit
- land headless server WebTransport session adapters now; bind a live QUIC host
  only when the repo has a real server transport runtime for it

Likely owners:

- `client/src/network`
- `server/src/metaverse/adapters`
- `server/src/experiences/duck-hunt/adapters`

Exit check:

- the same domain client and server owners can run over HTTP or WebTransport
  without changing domain behavior

## Step 6 — Promote Driver And Station Input To Commands

Status: completed.

Work:

- keep early realtime state replication stable first
- then add explicit client input commands for driver and station control
- server simulates vehicle motion from authoritative input handling
- clients consume authoritative vehicle snapshots back from the server

Exit check:

- vehicle authority is server-owned without needing a second transport rewrite

## Step 7 — Unify Metaverse And Duck Hunt Realtime Patterns

Status: completed.

Work:

- reuse the same tick, buffering, and transport seam patterns where possible
- keep experience-specific authority rules in Duck Hunt and hub-world rules in
  metaverse
- do not collapse both domains into one generic gameplay networking blob

Exit check:

- metaverse and Duck Hunt share infrastructure shape without losing domain
  clarity

## Step 8 — Tighten Tests And Failure Recovery

Status: completed.

Work:

- add runtime tests for:
  - clock offset estimation
  - interpolation target-time calculation
  - stale snapshot rejection
  - stale datagram rejection
  - mounted occupancy coherence with vehicle snapshots
  - reconnect and resync recovery
  - fallback from WebTransport to HTTP where supported by the slice
- keep sequence-handling logic directly covered

Exit check:

- realtime transport behavior is protected by tests instead of timing luck

## Recommended Rollout Order

1. separate transport seams first without changing behavior
2. define shared realtime contracts next
3. add metaverse server tick authority before transport optimization
4. add interpolation buffers before expecting smooth multiplayer feel
5. add WebTransport after the authoritative snapshot shape is proven
6. promote driver input only after authoritative state sync is stable

## Completion Bar

Do not consider this networking foundation complete until all of these are
true:

- metaverse remote interpolation is tick-targeted, not arrival-timed
- authoritative vehicle snapshots include velocity
- mounted occupancy is coherent with the same vehicle tick
- server-owned tick and server-time metadata are explicit
- network clients remain transport-neutral owners of status and snapshot
  acceptance
- WebTransport can replace live polling without redefining domain rules
- future server-authoritative vehicle input is not blocked by the chosen
  snapshot shape
