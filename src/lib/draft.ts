import type { DraftExercise } from './sessions';

/** Saisie de séance non enregistrée, conservée localement pour survivre à une fermeture de l'app. */
export interface SessionDraft {
  sessionId?: number;
  templateId: number | null;
  templateName: string;
  date: string;
  note: string;
  exercises: DraftExercise[];
  updatedAt: number;
}

const KEY = 'muscu-app:session-drafts';

export const newSessionPath = (templateId: number | null | string) => `/seance/nouvelle/${templateId ?? 'libre'}`;
export const editSessionPath = (sessionId: number) => `/seance/${sessionId}/modifier`;

/** Un brouillon par écran de saisie : l'écran qui l'a créé est aussi celui qui le reprend. */
export const draftPath = (draft: SessionDraft) =>
  draft.sessionId !== undefined ? editSessionPath(draft.sessionId) : newSessionPath(draft.templateId);

function readAll(): Record<string, SessionDraft> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, SessionDraft>) : {};
  } catch {
    return {};
  }
}

function writeAll(drafts: Record<string, SessionDraft>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(drafts));
  } catch {
    // Stockage indisponible (navigation privée) : la saisie reste seulement en mémoire.
  }
}

export function loadDraft(path: string): SessionDraft | null {
  const draft = readAll()[path];
  return draft && Array.isArray(draft.exercises) ? draft : null;
}

/** Brouillons du plus récent au plus ancien. */
export function loadDrafts(): SessionDraft[] {
  return Object.values(readAll())
    .filter((d) => Array.isArray(d?.exercises))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveDraft(draft: SessionDraft) {
  writeAll({ ...readAll(), [draftPath(draft)]: draft });
}

export function clearDraft(path: string) {
  const drafts = readAll();
  if (!(path in drafts)) return;
  delete drafts[path];
  writeAll(drafts);
}
