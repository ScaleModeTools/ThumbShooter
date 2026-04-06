function createTrackedSnapshot(sequenceNumber, x, y, thumbDrop = 0) {
  return {
    trackingState: "tracked",
    sequenceNumber,
    timestampMs: sequenceNumber * 8,
    pose: {
      thumbTip: {
        x,
        y: y + thumbDrop
      },
      indexTip: {
        x,
        y
      }
    }
  };
}

export async function createBenchmarkSuites({ clientLoader }) {
  const {
    LocalArenaSimulation,
    WeaponRuntime,
    firstPlayableWeaponDefinition,
    localArenaSimulationConfig
  } = await clientLoader.load("/src/game/index.ts");
  const { createLatestHandTrackingSnapshot } = await clientLoader.load(
    "/src/game/types/hand-tracking.ts"
  );

  return [
    {
      id: "local-arena-simulation.advance",
      iterations: 20000,
      maxMeanNs: 50000,
      setup() {
        const simulation = new LocalArenaSimulation(
          {
            xCoefficients: [1, 0, 0],
            yCoefficients: [0, 1, 0]
          },
          localArenaSimulationConfig
        );
        const snapshots = [
          createTrackedSnapshot(1, 0.22, 0.3),
          createTrackedSnapshot(2, 0.27, 0.34, 0.08),
          createTrackedSnapshot(3, 0.5, 0.45),
          createTrackedSnapshot(4, 0.71, 0.28),
          createTrackedSnapshot(5, 0.65, 0.3, 0.08),
          createTrackedSnapshot(6, 0.43, 0.7)
        ];
        let sequenceIndex = 0;
        let nowMs = 0;

        return () => {
          const snapshot = snapshots[sequenceIndex % snapshots.length];

          sequenceIndex += 1;
          nowMs += 16;
          simulation.advance(snapshot, nowMs);
        };
      }
    },
    {
      id: "create-latest-hand-tracking-snapshot",
      iterations: 120000,
      maxMeanNs: 4500,
      setup() {
        let sequenceNumber = 0;

        return () => {
          sequenceNumber += 1;
          createLatestHandTrackingSnapshot({
            sequenceNumber,
            timestampMs: sequenceNumber * 8,
            pose: {
              thumbTip: {
                x: 0.34,
                y: 0.44
              },
              indexTip: {
                x: 0.31,
                y: 0.37
              }
            }
          });
        };
      }
    },
    {
      id: "weapon-runtime.advance-plus-hud",
      iterations: 120000,
      maxMeanNs: 9000,
      setup() {
        const weaponRuntime = new WeaponRuntime(firstPlayableWeaponDefinition);
        const frameInputs = [
          {
            hasTrackedHand: true,
            isReticleOffscreen: false,
            sessionActive: true,
            triggerPressed: false
          },
          {
            hasTrackedHand: true,
            isReticleOffscreen: false,
            sessionActive: true,
            triggerPressed: true
          },
          {
            hasTrackedHand: true,
            isReticleOffscreen: false,
            sessionActive: true,
            triggerPressed: false
          },
          {
            hasTrackedHand: true,
            isReticleOffscreen: false,
            sessionActive: true,
            triggerPressed: true
          },
          {
            hasTrackedHand: true,
            isReticleOffscreen: true,
            sessionActive: true,
            triggerPressed: false
          }
        ];
        let frameIndex = 0;
        let nowMs = 0;

        return () => {
          const frameInput = frameInputs[frameIndex % frameInputs.length];

          frameIndex += 1;
          nowMs += 160;
          weaponRuntime.advance({
            ...frameInput,
            nowMs
          });
          weaponRuntime.createHudSnapshot({
            ...frameInput,
            nowMs
          });
        };
      }
    }
  ];
}
