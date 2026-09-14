import { useReducer, useState } from 'react';
import { exportBackup, getLastBackupAt, shouldRemindBackup, snoozeBackupReminder } from '../lib/backup';
import { errorMessage } from '../lib/errors';
import { formatRelativeTime } from '../lib/format';

export default function BackupReminder({ sessionCount }: { sessionCount: number }) {
  // Les réglages du rappel vivent dans localStorage : on force un nouveau rendu après les avoir modifiés.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [error, setError] = useState('');

  if (!shouldRemindBackup(sessionCount)) return null;

  const lastBackup = getLastBackupAt();

  const save = async () => {
    try {
      await exportBackup();
      setError('');
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="card banner" role="status">
      <strong>Pense à sauvegarder tes données</strong>
      <p className="muted small">
        {lastBackup ? `Dernière sauvegarde ${formatRelativeTime(lastBackup)}.` : "Aucune sauvegarde pour l'instant."} Tes
        séances ne sont stockées que sur cet appareil.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            snoozeBackupReminder();
            refresh();
          }}
        >
          Plus tard
        </button>
        <button type="button" className="btn btn-primary" onClick={save}>
          Sauvegarder
        </button>
      </div>
    </div>
  );
}
