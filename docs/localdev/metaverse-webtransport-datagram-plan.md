# Metaverse WebTransport Datagram Plan

Role: plan. Durable code-grounded plan for adding latest-wins WebTransport
datagrams and explicit stale-update rejection to the metaverse shell and Duck
Hunt without weakening authoritative server ownership.

Status: proposed.

## Goal

Build one reusable datagram phase that:

- keeps authoritative world snapshots and reliable commands intact
- adds WebTransport datagrams only for high-rate latest-wins intent where loss
  is acceptable
- makes stale, duplicate, and out-of-order datagram rejection explicit and
  testable
- keeps metaverse shell and Duck Hunt aligned on the same sequence and timing
  laws without collapsing them into one generic gameplay blob
- preserves transport-neutral domain clients and keeps transport details inside
  `client/src/network` and server adapters
- keeps HTTP and reliable WebTransport paths available for bootstrap, resync,
  and fallback
- does not create a second authority path beside the existing server-ticked
  metaverse world and Duck Hunt room runtimes

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

- `reliable request channel`: the current WebTransport path built on one
  bidirectional stream carrying newline-delimited JSON request or response
  frames
- `datagram channel`: one lossy latest-wins message lane where dropped packets
  are acceptable but stale packets must not mutate authoritative state
- `channel sequence`: monotonic sequence counter scoped to one player and one
  datagram channel, not a global repo-wide number
- `sequence waterline`: the newest accepted sequence for one player on one
  datagram channel
- `stale datagram`: a datagram whose sequence is less than or equal to the
  current accepted waterline for that player and channel
- `transport fallback`: degrading from a preferred datagram or reliable
  WebTransport path back to the already-supported reliable command path, which
  may itself use HTTP fallback
- `latest-wins intent`: high-rate client intent where only the newest message
  matters, for example driver steering axes or Duck Hunt player presence
- `authoritative snapshot`: the server-ticked world or room snapshot that
  clients interpolate for presentation

## Product Context

The product shape during this slice remains:

1. the player launches the metaverse shell through Start Metaverse
2. the shell runs the authoritative hub world and portal interaction
3. the first in-world experience is Duck Hunt
4. exiting the experience returns the player to the metaverse shell without a
   full reload

This plan only changes how high-rate client intent is transported. It does not
change the shell or experience flow.

## Current Audited Files

The current reliable WebTransport and latest-wins slice was reviewed in these
files:

- `client/src/network/AGENTS.md`
- `client/src/network/adapters/reliable-webtransport-json-request-channel.ts`
- `client/src/network/adapters/webtransport-http-fallback.ts`
- `client/src/network/adapters/metaverse-world-webtransport-transport.ts`
- `client/src/network/adapters/metaverse-presence-webtransport-transport.ts`
- `client/src/network/adapters/coop-room-webtransport-transport.ts`
- `client/src/network/classes/metaverse-world-client.ts`
- `client/src/network/classes/metaverse-presence-client.ts`
- `client/src/network/classes/coop-room-client.ts`
- `client/src/network/types/metaverse-world-transport.ts`
- `client/src/network/types/metaverse-presence-transport.ts`
- `client/src/network/types/coop-room-transport.ts`
- `client/src/metaverse/config/metaverse-world-network.ts`
- `client/src/metaverse/config/metaverse-presence-network.ts`
- `client/src/metaverse/classes/metaverse-presence-runtime.ts`
- `client/src/experiences/duck-hunt/network/duck-hunt-coop-network.ts`
- `client/src/experiences/duck-hunt/runtime/duck-hunt-coop-arena-simulation.ts`
- `packages/shared/src/metaverse/metaverse-realtime-world-contract.ts`
- `packages/shared/src/metaverse/metaverse-realtime-world-webtransport-contract.ts`
- `packages/shared/src/metaverse/metaverse-presence-webtransport-contract.ts`
- `packages/shared/src/experiences/duck-hunt/duck-hunt-room-contract.ts`
- `packages/shared/src/experiences/duck-hunt/duck-hunt-room-webtransport-contract.ts`
- `server/src/metaverse/classes/metaverse-authoritative-world-runtime.ts`
- `server/src/metaverse/adapters/metaverse-world-webtransport-adapter.ts`
- `server/src/metaverse/adapters/metaverse-presence-webtransport-adapter.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-runtime.ts`
- `server/src/experiences/duck-hunt/adapters/duck-hunt-coop-room-webtransport-adapter.ts`
- `tests/runtime/client/reliable-webtransport-json-request-channel.runtime.test.mjs`
- `tests/runtime/client/webtransport-http-fallback.runtime.test.mjs`
- `tests/runtime/client/metaverse-world-client.runtime.test.mjs`
- `tests/runtime/client/metaverse-world-webtransport-transport.runtime.test.mjs`
- `tests/runtime/client/coop-room-webtransport-transport.runtime.test.mjs`
- `tests/runtime/server/metaverse-authoritative-world-runtime.test.mjs`
- `tests/runtime/server/metaverse-world-webtransport-adapter.test.mjs`
- `tests/runtime/server/coop-room-runtime.test.mjs`
- `tests/runtime/server/duck-hunt-coop-room-webtransport-adapter.test.mjs`
- `tests/runtime/shared/metaverse.contract.test.mjs`

## Repo Review Summary

- Current WebTransport support is reliable-only today.
  Evidence:
  - `ReliableWebTransportJsonRequestChannel` only opens one bidirectional
    stream and frames JSON with newline delimiters
  - its `WebTransportLike` shape has no datagram APIs
- Current client transport interfaces are request-oriented, not datagram-aware.
  Evidence:
  - `MetaverseWorldTransport` exposes `pollWorldSnapshot()` and `sendCommand()`
  - `MetaversePresenceTransport` exposes `pollRosterSnapshot()` and
    `sendCommand()`
  - `CoopRoomTransport` exposes `pollRoomSnapshot()` and `sendCommand()`
- The repo already has true latest-wins message seams that are still sent
  reliably:
  - metaverse presence pose sync increments `stateSequence` in
    `MetaversePresenceClient.syncPresence()`
  - metaverse driver vehicle control increments `controlSequence` in
    `MetaverseWorldClient.syncDriverVehicleControl()`
  - Duck Hunt player presence increments `stateSequence` in
    `CoopRoomClient.syncPlayerPresence()`
- The server already enforces stale-update rejection on some of those reliable
  command seams:
  - `MetaverseAuthoritativeWorldRuntime` rejects older
    `sync-driver-vehicle-control` updates by `controlSequence`
  - `CoopRoomRuntime` rejects older `sync-player-presence` updates by
    `stateSequence`
- Metaverse presence is now compatibility projection, not primary remote world
  authority.
  Evidence:
  - `MetaverseAuthoritativeWorldRuntime` is the authoritative metaverse world
    owner
  - `MetaversePresenceRuntime` still adapts roster snapshots, but authoritative
    remote world interpolation now flows through the world path
- Current fallback only covers reliable transport failure.
  Evidence:
  - `createWebTransportHttpFallbackInvoker()` switches from reliable
    WebTransport to HTTP when the reliable JSON request channel fails
  - there is no equivalent datagram fallback owner because HTTP has no
    datagram transport shape
- Current server WebTransport support is headless session logic, not a live
  QUIC host.
  Evidence:
  - `MetaverseWorldWebTransportSession.receiveClientMessage()` and
    `DuckHuntCoopRoomWebTransportSession.receiveClientMessage()` are synchronous
    session wrappers around domain runtimes

## Current Reliable-Only Model From Code

### Metaverse Shell Today

1. `WebGpuMetaverseRuntime` advances local traversal and metaverse runtimes
2. `MetaversePresenceRuntime.syncPresencePose()` emits latest-wins local pose
   changes into `MetaversePresenceClient`
3. `MetaverseWorldClient.syncDriverVehicleControl()` emits latest-wins driver
   steering into the authoritative world transport
4. both flows currently use reliable command transport, over HTTP or reliable
   WebTransport
5. `MetaverseAuthoritativeWorldRuntime` advances authoritative ticks and emits
   authoritative world snapshots
6. client interpolation renders from authoritative world snapshots and
   `serverTimeMs`, not from raw client messages

### Duck Hunt Today

1. `DuckHuntCoopArenaSimulation` advances local aim and firing state
2. `CoopRoomClient.syncPlayerPresence()` emits latest-wins player presence
   updates with `stateSequence`
3. `CoopRoomClient.fireShot()` emits reliable `fire-shot` commands with
   `clientShotSequence`
4. `CoopRoomRuntime` rejects stale player presence and separately processes
   reliable shots
5. client simulation projects enemies and players from authoritative room
   snapshots with tick and server-time metadata

### Consequences

- the repo already distinguishes reliable commands from latest-wins intent at
  the domain level, even though both still ride reliable transport
- datagram migration should start with client-to-server latest-wins intent, not
  with authoritative snapshots
- snapshot interpolation already has the correct authority seam, so datagrams
  should feed server authority rather than client render code directly
- metaverse presence is not the correct first datagram target because it is no
  longer the primary remote-world authority path

## Scope And Non-Goals

This plan is for the first datagram slice only.

In scope:

- latest-wins datagrams for metaverse driver vehicle control
- latest-wins datagrams for Duck Hunt player presence
- explicit channel sequencing and stale rejection rules
- datagram-aware client and server transport seams
- reliable fallback rules when datagrams are unavailable

Out of scope for this plan:

- moving authoritative world or room snapshots onto datagrams first
- moving `fire-shot`, seat entry, room join, leave, ready, or launch commands
  off reliable transport
- replacing the compatibility metaverse presence path with datagrams
- building the live server QUIC host if the repo still lacks the runtime owner
  for it
- inventing client-side authority repair from datagram arrival order

## Target Runtime Model

- shared contracts define:
  - named datagram message shapes for explicit latest-wins channels
  - per-channel sequence fields
  - reliable command and authoritative snapshot contracts that stay intact
- client network adapters own:
  - datagram send or receive mechanics
  - adapter-level feature detection
  - adapter-level fallback to existing reliable command paths when datagrams are
    unsupported
- domain clients own:
  - current local latest-wins state publication
  - per-channel sequence incrementing
  - choosing datagram or reliable send based on transport capability
  - no authority repair
- server authoritative runtimes own:
  - per-player per-channel sequence waterlines
  - per-player per-channel latest accepted input state
  - tick-time coalescing so only the newest accepted input for one player and
    one channel is consumed during an authoritative tick
  - stale datagram rejection before gameplay mutation
  - authoritative simulation from the newest accepted intent only
- render and presentation code own:
  - interpolation from authoritative snapshots only
  - no direct datagram interpretation
- local owning runtimes may keep immediate local input response and reconcile
  against authoritative snapshots, but that prediction boundary is local-player
  only

## Datagram Layering Laws

- datagrams are for latest-wins intent only in the first slice
- authoritative snapshots remain the only render and interpolation truth
- reliable commands remain reliable even after a datagram lane exists
- stale or duplicate datagrams must be rejected before gameplay state mutates
- channel sequencing is scoped by player and by channel; do not create one
  global sequence for unrelated domains
- each datagram channel must keep independent sequencing, waterlines, and
  latest accepted state; do not infer cross-channel ordering
- datagram arrival may update accepted latest-wins input state only; it must
  not directly advance authoritative simulation state outside the tick loop
- within one authoritative tick, only the newest accepted datagram state for
  one player and one channel may be consumed by simulation
- datagram support must degrade to the existing reliable command path when the
  transport or session does not support datagrams
- metaverse presence compatibility paths must not quietly become a second
  authority surface during datagram rollout
- domain transport interfaces should expose named datagram capabilities, not a
  vague catch-all gameplay blob
- clients must not render or simulate remote entities directly from datagram
  messages; remote presentation must still derive from authoritative snapshots
- local prediction may remain allowed for the local player only; remote-player
  prediction from datagrams is not allowed

## Target Datagram Channel Matrix

Recommended first channels:

- metaverse world driver vehicle control
  - current reliable owner:
    `MetaverseWorldClient.syncDriverVehicleControl()`
  - server authority owner:
    `MetaverseAuthoritativeWorldRuntime`
  - candidate datagram purpose:
    driver steering axes and boost state while mounted in a driver seat
  - sequence field:
    `controlSequence`
  - stale rejection:
    reject any control update with sequence less than or equal to the accepted
    driver-control waterline for that player

- Duck Hunt player presence
  - current reliable owner:
    `CoopRoomClient.syncPlayerPresence()`
  - server authority owner:
    `CoopRoomRuntime`
  - candidate datagram purpose:
    aim direction, pitch, yaw, position, and weapon id for remote co-op
    presentation and shot origin context
  - sequence field:
    `stateSequence`
  - stale rejection:
    reject any presence update with sequence less than or equal to the accepted
    Duck Hunt presence waterline for that player

Explicit non-candidates for the first datagram slice:

- metaverse authoritative world snapshots
- Duck Hunt room snapshots
- `fire-shot`
- room join or leave
- metaverse join or leave
- seat occupancy or entry commands
- start-session or ready commands
- metaverse compatibility presence roster sync

## Target Sequence And Rejection Rules

Every datagram channel should obey the same minimum law:

1. the sending domain client owns one monotonic sequence counter per player and
   per channel
2. every sent datagram carries that channel sequence explicitly
3. the server runtime stores one accepted waterline per player and per channel
4. the server rejects any datagram whose sequence is less than or equal to the
   stored waterline
5. accepting a newer datagram updates the waterline and the current latest-wins
   input state for that channel
6. authoritative simulation consumes only the newest accepted input state for
   that channel during tick advancement
7. later authoritative snapshots derive from tick-advanced simulation state,
   not directly from datagram arrival order

Implementation law:

- do not let stale rejection live only inside low-level transport adapters
- the runtime owner must still validate sequence order because datagrams are
  domain state, not only transport state
- do not mix `stateSequence` and `controlSequence` semantics across unrelated
  channels just because both are integers
- do not silently introduce bounded wraparound semantics at the transport layer
  without first defining the comparison rule in shared contract space

Sequence comparison law:

- the first datagram slice should use session-scoped monotonically increasing
  non-negative integer sequences, matching the repo's current reliable command
  sequence model
- if a later transport encoding introduces bounded integer sequences, explicit
  wraparound comparison semantics must be added to shared contracts before that
  encoding becomes authoritative

Arrival versus tick law:

- datagram arrival updates accepted latest-wins input state only
- simulation state must advance exclusively inside authoritative ticks using
  that accepted input state
- datagram arrival order must never become an implicit simulation timeline

## Fallback And Recovery Rules

HTTP remains the fallback for bootstrap and reliable commands.

Datagram fallback law:

- if datagrams are unsupported or fail to initialize, the domain client must
  fall back to the existing reliable command path for that same latest-wins
  message
- that fallback must preserve current sequence semantics and stale rejection
- fallback must not silently drop the latest-wins update channel
- resync and authoritative snapshot recovery remain reliable-only

Implementation law:

- do not try to emulate datagrams directly over HTTP as a special transport
  mode
- instead, prefer:
  - datagram path when available
  - existing reliable WebTransport or HTTP command path when unavailable

Client consumption law:

- remote entity presentation must continue to consume authoritative snapshots
  only
- datagram messages may update local-player transport state and server input
  state, but they must not become a client-side fast path for remote player or
  remote vehicle rendering

## Naming And Ownership Rules For This Slice

Naming is a real concern here because the repo now has reliable and datagram
transport shapes side by side.

Rules:

- use `datagram` in names when a seam is truly lossy and latest-wins
- keep reliable request or response owners named `reliable` or
  `webtransport-request` when they still use the current framed stream model
- domain-facing transport interfaces should expose named capabilities such as
  driver control or Duck Hunt player presence; do not add one generic
  `sendLatestWinsMessage()` method that obscures the domain
- metaverse authoritative world datagram names should stay under
  `MetaverseRealtimeWorld*`
- Duck Hunt datagram names should stay under `DuckHuntCoopRoom*`
- do not introduce new mutable metaverse authority under `MetaversePresence*`
  names during this slice

Local prediction boundary:

- the repo may keep local-player immediate response for its owning runtime, for
  example metaverse traversal or Duck Hunt local weapon and aim handling
- that local response must still reconcile against authoritative world or room
  snapshots
- no remote player or remote vehicle prediction may consume datagram traffic
  directly

## Repo Placement Map

- `client/src/network/types`
  - transport interfaces and datagram capability types
- `client/src/network/adapters`
  - low-level WebTransport datagram send or receive owners and adapter-level
    fallback wiring
- `client/src/network/classes`
  - domain clients choose datagram or reliable send paths and own channel
    sequence incrementing
- `client/src/metaverse`
  - adaptation of authoritative metaverse snapshots remains here, but datagram
    transport policy should not be re-owned here
- `client/src/experiences/duck-hunt`
  - Duck Hunt runtime continues to emit player presence and fire-shot intent
- `packages/shared/src/metaverse`
  - metaverse datagram contracts
- `packages/shared/src/experiences/duck-hunt`
  - Duck Hunt datagram contracts
- `server/src/metaverse/adapters`
  - metaverse datagram session adapters only
- `server/src/metaverse/classes`
  - authoritative stale-rejection and latest-wins state ownership
- `server/src/experiences/duck-hunt/adapters`
  - Duck Hunt datagram session adapters only
- `server/src/experiences/duck-hunt/classes`
  - authoritative stale-rejection and latest-wins state ownership

## Step 1 — Freeze Datagram Naming And Transport Seams

Status: pending.

Work:

- define explicit datagram-capable transport shapes beside the existing
  reliable request transports
- keep domain-facing transport naming specific to the actual channel capability
- do not overload existing `sendCommand()` with hidden unreliable flags
- keep current reliable behavior unchanged in this step

Exit check:

- the repo can talk about reliable request transport and datagram transport as
  distinct named seams without ambiguity

## Step 2 — Add Shared Datagram Contracts

Status: pending.

Work:

- add explicit metaverse realtime world datagram contracts for driver vehicle
  control
- add explicit Duck Hunt co-op datagram contracts for player presence
- keep sequence fields explicit in those contracts
- do not add metaverse presence datagram contracts in this step unless the
  compatibility path earns them later

Likely owners:

- `packages/shared/src/metaverse`
- `packages/shared/src/experiences/duck-hunt`
- `tests/runtime/shared`
- `tests/typecheck`

Exit check:

- shared contracts can describe the first datagram channels without weakening
  existing reliable or snapshot contracts

## Step 3 — Add Low-Level WebTransport Datagram Owners

Status: pending.

Work:

- add a low-level browser datagram owner under `client/src/network/adapters`
- keep it transport-only
- support send-only or send-and-receive datagram mechanics as the current slice
  actually needs
- keep reliable request channels unchanged

Likely owners:

- `client/src/network/adapters`
- `tests/runtime/client`

Exit check:

- datagram send mechanics exist as a transport owner without leaking gameplay
  rules into the adapter

## Step 4 — Add Datagram Session Adapters On The Server

Status: pending.

Work:

- add metaverse authoritative world datagram session adapters
- add Duck Hunt co-op room datagram session adapters
- keep them thin and transport-shaped only
- do not move stale rejection out of the authoritative runtimes

Likely owners:

- `server/src/metaverse/adapters`
- `server/src/experiences/duck-hunt/adapters`
- `tests/runtime/server`

Exit check:

- server transport seams can receive typed datagram messages and hand them into
  the current authoritative owners without redefining domain rules

## Step 5 — Move Metaverse Driver Vehicle Control To Datagrams

Status: pending.

Work:

- let `MetaverseWorldClient` prefer the driver-control datagram path when
  available
- preserve fallback to the current reliable command path when unavailable
- keep stale control rejection in `MetaverseAuthoritativeWorldRuntime`
- keep authoritative world snapshots as the only remote presentation input

Likely owners:

- `client/src/network/classes/metaverse-world-client.ts`
- `client/src/network/types/metaverse-world-transport.ts`
- `server/src/metaverse/classes/metaverse-authoritative-world-runtime.ts`
- `tests/runtime/client`
- `tests/runtime/server`

Exit check:

- driver vehicle control can travel over datagrams
- stale driver datagrams do not mutate server vehicle state
- clients still render from authoritative world snapshots only

## Step 6 — Move Duck Hunt Player Presence To Datagrams

Status: pending.

Work:

- let `CoopRoomClient` prefer the player-presence datagram path when available
- preserve reliable `fire-shot`, join, leave, ready, and start-session command
  paths
- keep stale presence rejection in `CoopRoomRuntime`
- keep client combat presentation derived from authoritative room snapshots

Likely owners:

- `client/src/network/classes/coop-room-client.ts`
- `client/src/network/types/coop-room-transport.ts`
- `server/src/experiences/duck-hunt/classes/coop-room-runtime.ts`
- `tests/runtime/client`
- `tests/runtime/server`

Exit check:

- Duck Hunt player presence can travel over datagrams
- stale presence datagrams do not mutate authoritative room state
- reliable gameplay commands remain reliable

## Step 7 — Tighten Failure Recovery And Stale-Rejection Tests

Status: pending.

Work:

- add tests for:
  - out-of-order datagram rejection
  - duplicate datagram rejection
  - per-tick coalescing so only the newest accepted datagram state is consumed
    during an authoritative tick
  - dropped-datagram tolerance
  - reliable fallback when datagrams are unavailable
  - metaverse driver-control stale rejection
  - Duck Hunt player-presence stale rejection
  - remote presentation continuing to derive from authoritative snapshots
    rather than raw datagram traffic
  - snapshot interpolation continuing from authoritative snapshots after mixed
    datagram loss
- keep sequence waterlines directly covered

Exit check:

- datagram behavior is protected by direct tests instead of packet-timing luck

## Recommended Rollout Order

1. freeze naming and transport seams first
2. add shared datagram contracts next
3. add low-level datagram transport owners before changing domain clients
4. move metaverse driver vehicle control first because the server already owns
   authoritative vehicle simulation and stale control rejection
5. move Duck Hunt player presence second because it already has explicit
   `stateSequence` rejection and a clear reliable split for `fire-shot`
6. tighten failure recovery and stale-rejection coverage before widening the
   channel set

## Immediate First Slice After This Review

If this plan is executed incrementally, the first slice should be:

1. add shared metaverse driver-control datagram contract
2. add named datagram capability to the metaverse world transport seam
3. add a browser datagram adapter owner
4. add server metaverse datagram session adapter
5. route `MetaverseWorldClient.syncDriverVehicleControl()` through datagrams
   when supported, otherwise keep the existing reliable path

That slice is small enough to validate stale-update rejection with one real
channel before widening the system.

## Completion Bar

Do not consider this datagram phase complete until all of these are true:

- metaverse driver vehicle control can use an explicit datagram channel
- Duck Hunt player presence can use an explicit datagram channel
- stale and duplicate datagrams are rejected by authoritative runtime owners
- authoritative simulation consumes only the newest accepted datagram state per
  player and channel within a tick
- dropped datagrams degrade into temporary staleness rather than authority
  corruption
- authoritative world and room snapshots remain the only render and
  interpolation truth
- remote entities are never rendered directly from datagram traffic
- reliable commands such as `fire-shot`, seat entry, join, leave, ready, and
  resync remain on reliable transport
- datagram fallback degrades cleanly to the current reliable command path
- metaverse presence compatibility surfaces do not become a second authority
  path during migration
