# ThumbShooter Spec

## 1. Product Summary

ThumbShooter is a browser FPS prototype where the player aims with a webcam-
tracked hand pose and fires by lowering the thumb relative to the index finger.
The initial playable target is a full-viewport arena with larger flocking bird
enemies that can dodge, scatter, and be shot with a calibrated hand-based
reticle.

## 2. Build Principles

- TypeScript is the primary design language. Types must describe domain intent
  clearly enough that a human or LLM can infer system boundaries quickly.
- The repository stays organized by product domains first, then technical
  subfolders as complexity grows.
- New gameplay rendering is Three.js WebGPU-first. Older WebGL examples may
  inform behavior, but not final architecture.
- The first persistence layer is local browser storage for username, profile
  preferences, and calibration data.
- The app uses a single viewport that fills the browser window cleanly across
  supported desktop layouts.

## 3. Player Experience Flow

### 3.1 Entry

1. Player opens the domain.
2. Player enters a username.
3. Username and local profile shell are stored locally.
4. Player grants webcam permission.
5. Player is routed into calibration.

### 3.2 Calibration

The calibration flow maps camera-observed hand pose data to on-screen aiming.
The shooter is calibrated to the screen, not to the webcam.

Calibration shot order:

1. Center
2. Top-left
3. Top-right
4. Bottom-left
5. Bottom-right
6. Top-center
7. Mid-right
8. Mid-left
9. Bottom-center

Calibration rules:

- The player points at a visible on-screen target.
- The player performs the trigger action by dropping the thumb relative to the
  index finger.
- Each successful shot captures hand landmark data plus the intended screen
  target.
- The system computes a transform from observed hand pose to screen-space
  reticle placement.
- Calibration data is stored locally and can be reused across sessions.

### 3.3 Gameplay

- The player enters a full-screen arena.
- A hollow reticle remains visible and centered on the derived aim point.
- Enemies begin as larger bird/flocking targets inspired by the supplied birds
  reference.
- Birds should feel readable, shootable, and only mildly evasive in the first
  prototype.
- Scatter behavior is an enemy state we want to preserve early because it is a
  strong visual identity candidate.

### 3.4 Weapon Behavior

- Input gesture:
  - Ready pose: thumb roughly vertical relative to the index finger.
  - Trigger pose: thumb moves lower to indicate a shot.
- Weapons support:
  - Single-shot fire requiring trigger reset
  - Automatic fire while trigger remains held
- Reload:
  - Triggered when the reticle moves off-screen
  - Initial implementation can be simple and deterministic

## 4. Input Model

## 4.1 Hand Tracking

- Provider: MediaPipe Hand Landmarker
- Required landmarks:
  - Thumb tip
  - Index fingertip
- Future tracking can expand to more landmarks if necessary, but the prototype
  should stay minimal.

## 4.2 Trigger Detection

The first trigger classifier should be simple, typed, and inspectable:

- Capture a "ready" geometric relationship between thumb tip and index tip.
- Detect a "pressed" trigger state when the thumb drops below a calibrated
  threshold relative to the index finger and pointing axis.
- Keep the threshold data per player profile.

## 4.3 Aim Mapping

- Use calibration samples to derive screen-space aim from observed hand pose.
- The system must tolerate different webcam angles and player positioning.
- Reticle position should be expressed in normalized viewport coordinates
  before converting to pixel-space for display and hit logic.

## 5. Rendering and Runtime Architecture

- Engine: Three.js `r183`
- Runtime direction: WebGPU for production gameplay systems
- Browser app: Node.js + npm + TypeScript
- Repo layout:
  - `client`
  - `server`
  - `packages`

### 5.1 Client Source Layout

`client/src` is organized by primary domains:

- `game`
- `navigation`
- `network`
- `assets`
- `ui`

Technical folders spawn under each domain only when needed:

- `config`
- `types`
- `states`
- `components`
- `systems`
- `services`
- `adapters`

### 5.2 Data and Type Design

- Shared vocabulary belongs in typed contracts, not scattered comments.
- Branded IDs should be used for domain identifiers when ambiguity is likely.
- Boundary objects should be readonly unless mutation is necessary for runtime
  performance.
- Runtime state should separate pure game data from rendering objects.
- External API outputs should be narrowed at the boundary and converted into
  internal types.

## 6. Initial Systems

### 6.1 Profile System

- Username entry
- Local profile record
- Calibration persistence
- Reticle preference persistence

### 6.2 Navigation System

Initial route flow:

1. `login`
2. `permissions`
3. `calibration`
4. `gameplay`

### 6.3 UI System

- Single-viewport shell
- Centered calibration targets
- Top-left guided instructions during onboarding
- Reticle overlay
- Session/debug overlays for prototype visibility

### 6.4 Enemy Prototype System

- Larger flocking birds
- Slow dodge response to player aim or shots
- Scatter state
- Shoot feedback and removal/reaction state

## 7. Assets

- Asset style is intentionally unresolved during the scaffold phase.
- We still need a clean asset manifest for:
  - Reticles
  - UI icons
  - Future sound cues
  - Future 3D models or procedural enemy visuals
- The first reticle should be a hollow shooter-style reticle with strong
  visibility.

## 8. Examples Strategy

- Store reference examples under `examples/`.
- Keep the supplied birds code as a direct reference snapshot.
- Extract behavior patterns from examples, not folder architecture.
- For Three.js gameplay implementation, prefer WebGPU-compatible patterns when
  translating example logic into production code.

## 9. Roadmap

### Phase 0: Foundation

1. Create monorepo scaffold.
2. Pin core dependencies.
3. Write `spec.md`, `progress.md`, `AGENTS.md`, and domain `AGENTS.md`.
4. Add example references and dependency notes.

### Phase 1: Domain Contracts

1. Define shared profile, calibration, aiming, reticle, and weapon types.
2. Define client-side navigation contracts.
3. Define asset manifest contracts.
4. Define gameplay state contracts separate from renderer state.

### Phase 2: Browser Shell

1. Stand up the full-viewport client shell.
2. Add login screen and username persistence.
3. Add webcam permission and session flow handling.
4. Add UI overlay regions and reticle anchoring rules.

### Phase 3: Hand Tracking Prototype

1. Initialize MediaPipe Hand Landmarker.
2. Stream webcam frames into typed tracking adapters.
3. Convert raw landmarks into internal hand pose types.
4. Visualize or inspect the pose pipeline for debugging.

### Phase 4: Calibration

1. Implement the nine-point calibration flow.
2. Capture trigger samples at each target.
3. Compute a screen mapping from hand pose to viewport coordinates.
4. Persist calibration locally.
5. Rehydrate calibration on session restore.

### Phase 5: Game Arena

1. Stand up the Three.js WebGPU scene shell.
2. Add camera, renderer, viewport sizing, and lifecycle management.
3. Adapt birds/flocking behavior into larger targetable enemies.
4. Add reticle-to-hit detection path.
5. Add mild dodge and scatter state logic.

### Phase 6: Combat Loop

1. Add weapon fire modes.
2. Add trigger reset logic for single-shot weapons.
3. Add held-fire cadence for automatic weapons.
4. Add reload by off-screen reticle behavior.
5. Add hit reactions and score/session feedback.

### Phase 7: Polish and Hardening

1. Improve calibration robustness.
2. Improve reticle readability and asset style consistency.
3. Add debug toggles and telemetry for tuning.
4. Reduce ambiguity in types and module boundaries.
5. Prepare the repo for the full build prompt.

## 10. Open Questions

- Which exact weapon set belongs in the first playable version?
- Should calibration fit a simple affine transform first, or do we need a more
  flexible mapping from the start?
- What is the minimum viable fallback for browsers without stable WebGPU
  support?
- Which asset style should define the visual identity after the birds prototype?
