# Client Agents

The client is the browser runtime for ThumbShooter.

## Rules

- Keep the client full-viewport and single-scene by default.
- Use TypeScript types to make screen flow, calibration, reticle, and gameplay
  state explicit before building UI behavior around them.
- Prefer tuple-derived unions, typed registries, and readonly snapshots for
  client configuration state.
- Keep `src/main.ts` thin. Composition belongs there; rules belong in domain
  modules.
- Default to browser-native APIs plus pinned dependencies before adding helper
  libraries.
- Prepare the client for Three.js WebGPU gameplay code even if an interim
  example originated in WebGL.
- Default to `.ts`. Introduce `.tsx` only when a file contains JSX.
