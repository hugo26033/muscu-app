import { useState } from 'react';
import { Link } from 'react-router';
import { clearDraft, draftPath, loadDrafts } from '../lib/draft';
import { formatRelativeTime, formatShortDate } from '../lib/format';

/** Saisies commencées mais pas enregistrées, à reprendre ou abandonner. */
export default function DraftBanners() {
  const [drafts, setDrafts] = useState(loadDrafts);

  const discard = (path: string) => {
    if (!confirm('Abandonner cette saisie non enregistrée ?')) return;
    clearDraft(path);
    setDrafts(loadDrafts());
  };

  return drafts.map((draft) => {
    const path = draftPath(draft);
    return (
      <div key={path} className="card banner banner-accent" role="status">
        <strong>{draft.sessionId !== undefined ? 'Modification non enregistrée' : 'Séance en cours non enregistrée'}</strong>
        <p className="muted small">
          {draft.templateName || 'Séance libre'} du {formatShortDate(draft.date)} · modifiée{' '}
          {formatRelativeTime(draft.updatedAt)}
        </p>
        <div className="row">
          <button type="button" className="btn" onClick={() => discard(path)}>
            Abandonner
          </button>
          <Link to={path} className="btn btn-primary">
            Reprendre
          </Link>
        </div>
      </div>
    );
  });
}
