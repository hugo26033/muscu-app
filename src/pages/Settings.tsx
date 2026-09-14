import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { db } from '../db';
import { BACKUP_REMINDER_DAYS, exportBackup, getLastBackupAt, importBackup } from '../lib/backup';
import { errorMessage } from '../lib/errors';
import { plural } from '../lib/format';
import { isIOS, isStandalone, useInstallPrompt } from '../lib/install';

const EXPORT_MESSAGES = {
  shared: 'Sauvegarde partagée.',
  downloaded: 'Sauvegarde téléchargée.',
} as const;

export default function Settings() {
  const counts = useLiveQuery(
    async () => ({
      sessions: await db.sessions.count(),
      exercises: await db.exercises.count(),
      templates: await db.templates.count(),
    }),
    [],
  );
  const { canInstall, install } = useInstallPrompt();
  const [lastBackup, setLastBackup] = useState(getLastBackupAt);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(false));
  }, []);

  const doExport = async () => {
    try {
      const result = await exportBackup();
      if (result === 'cancelled') return;
      setLastBackup(getLastBackupAt());
      setMessage({ kind: 'ok', text: EXPORT_MESSAGES[result] });
    } catch (e) {
      setMessage({ kind: 'error', text: errorMessage(e) });
    }
  };

  const doImport = async (file: File) => {
    if (!confirm('Importer cette sauvegarde remplacera toutes les données actuelles. Continuer ?')) return;
    try {
      const result = await importBackup(file);
      setMessage({
        kind: 'ok',
        text: `Import terminé : ${plural(result.sessions, 'séance')}, ${plural(result.exercises, 'exercice')}.`,
      });
    } catch (e) {
      setMessage({ kind: 'error', text: errorMessage(e) });
    }
  };

  const backupIsOld = lastBackup === null || Date.now() - lastBackup > BACKUP_REMINDER_DAYS * 86_400_000;

  return (
    <>
      <header className="page-header">
        <h1>Réglages</h1>
      </header>

      <h2>Sauvegarde</h2>
      <div className="card stack">
        <p className="small">
          Tes données sont stockées uniquement sur cet appareil. Exporte-les régulièrement pour ne rien perdre
          (changement de téléphone, données du navigateur effacées).
        </p>
        <p className={`small ${backupIsOld ? 'warning' : 'muted'}`}>
          {lastBackup
            ? `Dernière sauvegarde : ${new Date(lastBackup).toLocaleDateString('fr-FR', { dateStyle: 'long' })}`
            : 'Aucune sauvegarde effectuée depuis cet appareil.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={doExport}>
          Exporter mes données (JSON)
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          Importer une sauvegarde…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) doImport(file);
          }}
        />
        {message && <div className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</div>}
      </div>

      <h2>Application</h2>
      <div className="card stack small">
        {isStandalone() ? (
          <p>✓ Application installée : elle s'ouvre en plein écran et fonctionne hors ligne.</p>
        ) : canInstall ? (
          <>
            <p>Installe l'app sur ton écran d'accueil pour l'ouvrir en plein écran, même sans réseau.</p>
            <button type="button" className="btn btn-primary" onClick={install}>
              Installer l'application
            </button>
          </>
        ) : isIOS() ? (
          <p>
            Pour installer l'app : dans Safari, touche <strong>Partager</strong> puis{' '}
            <strong>Sur l'écran d'accueil</strong>.
          </p>
        ) : (
          <p className="muted">
            Pour installer l'app, ouvre son adresse HTTPS dans Chrome (Android) ou Safari (iPhone), puis choisis
            « Installer l'application » ou « Sur l'écran d'accueil ».
          </p>
        )}
      </div>

      <h2>Données</h2>
      <div className="card stack small">
        {counts && (
          <div>
            {plural(counts.sessions, 'séance')} · {plural(counts.exercises, 'exercice')} ·{' '}
            {plural(counts.templates, 'séance type')}
          </div>
        )}
        <div className="muted">
          Stockage protégé contre l'effacement automatique :{' '}
          {persisted === null ? '…' : persisted ? 'oui' : 'non (pense aux sauvegardes)'}
        </div>
      </div>
    </>
  );
}
