import type { MapEditorProjectSnapshot } from "@/engine-tool/project/map-editor-project-state";

const mapEditorProjectSessionHistoryLimit = 64;

export interface MapEditorProjectSessionSnapshot {
  readonly project: MapEditorProjectSnapshot;
  readonly redoHistory: readonly MapEditorProjectSnapshot[];
  readonly undoHistory: readonly MapEditorProjectSnapshot[];
}

function trimUndoHistory(
  undoHistory: readonly MapEditorProjectSnapshot[],
  nextProject: MapEditorProjectSnapshot
): readonly MapEditorProjectSnapshot[] {
  const nextUndoHistory =
    undoHistory.length >= mapEditorProjectSessionHistoryLimit
      ? [...undoHistory.slice(-(mapEditorProjectSessionHistoryLimit - 1)), nextProject]
      : [...undoHistory, nextProject];

  return Object.freeze(nextUndoHistory);
}

export function createMapEditorProjectSession(
  project: MapEditorProjectSnapshot
): MapEditorProjectSessionSnapshot {
  return Object.freeze({
    project,
    redoHistory: Object.freeze([]),
    undoHistory: Object.freeze([])
  });
}

export function replaceMapEditorProjectSessionProject(
  session: MapEditorProjectSessionSnapshot,
  project: MapEditorProjectSnapshot
): MapEditorProjectSessionSnapshot {
  if (
    session.project === project &&
    session.undoHistory.length === 0 &&
    session.redoHistory.length === 0
  ) {
    return session;
  }

  return Object.freeze({
    project,
    redoHistory: Object.freeze([]),
    undoHistory: Object.freeze([])
  });
}

export function updateMapEditorProjectSessionProject(
  session: MapEditorProjectSessionSnapshot,
  update: (
    project: MapEditorProjectSnapshot
  ) => MapEditorProjectSnapshot
): MapEditorProjectSessionSnapshot {
  const nextProject = update(session.project);

  if (nextProject === session.project) {
    return session;
  }

  return Object.freeze({
    ...session,
    project: nextProject
  });
}

export function applyMapEditorProjectSessionChange(
  session: MapEditorProjectSessionSnapshot,
  update: (
    project: MapEditorProjectSnapshot
  ) => MapEditorProjectSnapshot
): MapEditorProjectSessionSnapshot {
  const nextProject = update(session.project);

  if (nextProject === session.project) {
    return session;
  }

  return Object.freeze({
    project: nextProject,
    redoHistory: Object.freeze([]),
    undoHistory: trimUndoHistory(session.undoHistory, session.project)
  });
}

export function undoMapEditorProjectSessionChange(
  session: MapEditorProjectSessionSnapshot
): MapEditorProjectSessionSnapshot {
  const previousProject =
    session.undoHistory[session.undoHistory.length - 1] ?? null;

  if (previousProject === null) {
    return session;
  }

  return Object.freeze({
    project: previousProject,
    redoHistory: trimUndoHistory(session.redoHistory, session.project),
    undoHistory: Object.freeze(session.undoHistory.slice(0, -1))
  });
}
