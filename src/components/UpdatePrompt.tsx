import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Propose de charger la nouvelle version quand un déploiement est détecté. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Une app installée peut rester ouverte des jours : on vérifie régulièrement s'il existe une mise à jour.
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update(), UPDATE_CHECK_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="toast" role="status">
      <span>Nouvelle version disponible. Ta saisie en cours sera conservée.</span>
      <button type="button" className="btn" onClick={() => setNeedRefresh(false)}>
        Plus tard
      </button>
      <button type="button" className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
        Mettre à jour
      </button>
    </div>
  );
}
