import { reticleManifest } from "../assets";
import { gameFoundationConfig } from "../game";
import { profileStoragePlan } from "../network";
import { navigationFlow } from "../navigation";
import { viewportOverlayPlan } from "../ui";

function renderList(items: readonly string[]): string {
  return items.map((item) => `<li>${item}</li>`).join("");
}

export function mountThumbShooterScaffold(rootElement: HTMLDivElement): void {
  const calibrationAnchors = gameFoundationConfig.calibration.anchors.map(
    (anchor) => `${anchor.id}: ${anchor.label}`
  );
  const navigationSteps = navigationFlow.steps.map(
    (step) => `${step.id}: ${step.label}`
  );
  const reticleChoices = reticleManifest.reticles.map(
    (reticle) => `${reticle.id}: ${reticle.label}`
  );

  rootElement.innerHTML = `
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">ThumbShooter scaffold</p>
        <h1>Type-first FPS foundation</h1>
        <p class="lede">
          The repo is prepared for a WebGPU-first Three.js build with MediaPipe
          hand tracking, local profile persistence, and a calibration-driven
          thumb trigger pipeline.
        </p>
      </section>

      <section class="grid">
        <article class="panel">
          <h2>Renderer</h2>
          <ul>${renderList([
            `Target: ${gameFoundationConfig.renderer.target}`,
            `Viewport: ${gameFoundationConfig.renderer.viewportMode}`,
            `Primary prototype: ${gameFoundationConfig.prototype.enemyPrototype}`
          ])}</ul>
        </article>

        <article class="panel">
          <h2>Calibration</h2>
          <ul>${renderList(calibrationAnchors)}</ul>
        </article>

        <article class="panel">
          <h2>Flow</h2>
          <ul>${renderList(navigationSteps)}</ul>
        </article>

        <article class="panel">
          <h2>Persistence</h2>
          <ul>${renderList([
            `Storage key: ${profileStoragePlan.profileStorageKey}`,
            `Calibration key: ${profileStoragePlan.calibrationStorageKey}`,
            `Username key: ${profileStoragePlan.usernameStorageKey}`
          ])}</ul>
        </article>

        <article class="panel">
          <h2>Reticles</h2>
          <ul>${renderList(reticleChoices)}</ul>
        </article>

        <article class="panel">
          <h2>UI Overlay</h2>
          <ul>${renderList([
            `Instructions: ${viewportOverlayPlan.instructionsPlacement}`,
            `HUD: ${viewportOverlayPlan.hudPlacement}`,
            `Reticle mode: ${viewportOverlayPlan.reticleMode}`
          ])}</ul>
        </article>
      </section>
    </main>
  `;
}
