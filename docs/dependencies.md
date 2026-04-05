# ThumbShooter Dependency Baseline

This file is the dependency and reference handoff for future implementation
passes and LLM-assisted work.

## Pinned Runtime Direction

- Client runtime: Node.js + npm + TypeScript
- Renderer: `three@0.183.0`
- Input tracking: `@mediapipe/tasks-vision@0.10.33`
- Browser app tooling: `vite@8.0.3`
- WebGPU browser typings: `@webgpu/types@0.1.69`

## Tooling Baseline

- `typescript@6.0.2`
- `@types/node@25.5.2`
- `vite@8.0.3` stays because the browser client needs a dev server and bundler.

## Implementation Notes

- ThumbShooter should treat Three.js WebGPU as the production gameplay target.
- The supplied birds example is a useful flocking and interaction reference, but
  it is a WebGL/GPGPU example rather than the final runtime shape.
- We intentionally removed `concurrently` from the tracked workflow. Multi-
  process local launch is handled through gitignored personal helper files under
  `.local-dev/`.
- We also removed the `tsx` package. At this stage, `.tsx` files are not needed
  because the scaffold does not use JSX, and server development can rely on
  TypeScript build/watch plus Node's own runtime/watch features.
- Inference from the official Three references: new game rendering code should
  prefer WebGPU-oriented patterns and TSL/WebGPU renderer guidance when
  translating the birds behavior into project code.
- MediaPipe Hand Landmarker stays on the web tasks package and will own the
  thumb-tip / index-fingertip calibration and trigger pipeline.

## Official References

- Three.js r183 package:
  `https://www.npmjs.com/package/three/v/0.183.0`
- Three.js LLM reference:
  `https://threejs.org/docs/llms-full.txt`
- Three.js WebGPU compute birds example:
  `https://threejs.org/examples/webgpu_compute_birds.html`
- MediaPipe release line requested for this repo:
  `https://github.com/google-ai-edge/mediapipe/releases/tag/v0.10.33`
- MediaPipe tasks-vision package:
  `https://www.npmjs.com/package/@mediapipe/tasks-vision/v/0.10.33`

## Usage Rules

- Pin new runtime dependencies exactly unless there is a clear reason not to.
- Document why a dependency exists before adding more than one package in the
  same concern area.
- Prefer native platform APIs and built-in Node modules until extra libraries
  are justified by the spec.
