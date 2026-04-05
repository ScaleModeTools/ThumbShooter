# Game Agents

The `game` domain owns Three.js gameplay systems.

## Rules

- Build new gameplay rendering against Three.js WebGPU-oriented APIs.
- Treat the supplied birds reference as a behavior source, not as the final
  engine shape.
- Keep renderer objects and pure game state in separate modules.
- Store gameplay constants and configuration in typed `config` modules.
- Keep trigger, aiming, calibration, and enemy state legible through precise
  types.

## ThumbShooter-Specific Direction

- The game is built in Three.js and should target WebGPU for production code.
- The first enemy prototype is birds with readable movement, larger silhouettes,
  and a scatter-capable state machine.
- Calibration and shooting logic must be screen-space accurate after mapping
  from MediaPipe hand data.
