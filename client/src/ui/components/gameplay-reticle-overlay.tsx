import { useEffect, useRef, useState } from "react";

import {
  gameplayRuntimeConfig,
  type GameplayReticleVisualState
} from "../../game";

interface GameplayReticleOverlayProps {
  readonly aimPoint: { readonly x: number; readonly y: number } | null;
  readonly visualState: GameplayReticleVisualState;
}

function formatRgbColor(
  color: readonly [number, number, number]
): string {
  return `rgb(${color.map((channel) => Math.round(channel * 255)).join(" ")})`;
}

function readOverlayHeight(overlayElement: HTMLDivElement | null): number {
  if (overlayElement === null) {
    return 1;
  }

  return Math.max(1, overlayElement.getBoundingClientRect().height);
}

export function GameplayReticleOverlay({
  aimPoint,
  visualState
}: GameplayReticleOverlayProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(1);

  useEffect(() => {
    const overlayElement = overlayRef.current;

    if (overlayElement === null) {
      return;
    }

    const syncOverlayHeight = () => {
      setOverlayHeight(readOverlayHeight(overlayElement));
    };

    syncOverlayHeight();

    if (typeof globalThis.ResizeObserver !== "function") {
      return;
    }

    const resizeObserver = new globalThis.ResizeObserver(() => {
      syncOverlayHeight();
    });

    resizeObserver.observe(overlayElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (aimPoint === null || visualState === "hidden") {
    return <div className="pointer-events-none absolute inset-0 z-20" ref={overlayRef} />;
  }

  const reticleConfig = gameplayRuntimeConfig.reticle;
  const fieldOfViewRadians =
    (Number(gameplayRuntimeConfig.camera.fieldOfViewDegrees) * Math.PI) / 180;
  const projectionHalfHeight =
    Math.tan(fieldOfViewRadians * 0.5) * reticleConfig.depth;
  const worldToPixels = overlayHeight / Math.max(0.001, projectionHalfHeight * 2);
  const projectedScale = projectionHalfHeight;
  const screenScale = projectedScale * worldToPixels;
  const style = reticleConfig.stateStyles[visualState];
  const spanWorldUnits = Math.max(
    reticleConfig.haloOuterRadius * 2,
    reticleConfig.horizontalBarSize.width,
    reticleConfig.verticalBarSize.height
  );
  const reticleSizePx = spanWorldUnits * screenScale * style.scale;
  const halfSpanWorldUnits = spanWorldUnits * 0.5;
  const strokeColor = formatRgbColor(style.strokeColor);

  return (
    <div className="pointer-events-none absolute inset-0 z-20" ref={overlayRef}>
      <div
        className="absolute animate-gameplay-reticle-drift"
        style={{
          left: `${aimPoint.x * 100}%`,
          top: `${aimPoint.y * 100}%`,
          transform: "translate(-50%, -50%)"
        }}
      >
        <svg
          aria-hidden="true"
          height={reticleSizePx}
          style={{
            overflow: "visible"
          }}
          viewBox={`${-halfSpanWorldUnits} ${-halfSpanWorldUnits} ${spanWorldUnits} ${spanWorldUnits}`}
          width={reticleSizePx}
        >
          <circle
            cx="0"
            cy="0"
            fill="none"
            opacity={style.haloOpacity}
            r={reticleConfig.haloInnerRadius +
              (reticleConfig.haloOuterRadius - reticleConfig.haloInnerRadius) * 0.5}
            stroke={strokeColor}
            strokeWidth={reticleConfig.haloOuterRadius - reticleConfig.haloInnerRadius}
          />
          <circle
            cx="0"
            cy="0"
            fill="none"
            opacity={style.strokeOpacity}
            r={reticleConfig.innerRadius +
              (reticleConfig.outerRadius - reticleConfig.innerRadius) * 0.5}
            stroke={strokeColor}
            strokeWidth={reticleConfig.outerRadius - reticleConfig.innerRadius}
          />
          <rect
            fill={strokeColor}
            height={reticleConfig.horizontalBarSize.height}
            opacity={style.strokeOpacity * 0.84}
            rx={reticleConfig.horizontalBarSize.height * 0.5}
            width={reticleConfig.horizontalBarSize.width}
            x={-reticleConfig.horizontalBarSize.width * 0.5}
            y={-reticleConfig.horizontalBarSize.height * 0.5}
          />
          <rect
            fill={strokeColor}
            height={reticleConfig.verticalBarSize.height}
            opacity={style.strokeOpacity * 0.84}
            rx={reticleConfig.verticalBarSize.width * 0.5}
            width={reticleConfig.verticalBarSize.width}
            x={-reticleConfig.verticalBarSize.width * 0.5}
            y={-reticleConfig.verticalBarSize.height * 0.5}
          />
        </svg>
      </div>
    </div>
  );
}
