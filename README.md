# Muscu

Application web personnelle pour noter ses séances de musculation en fin d'entraînement.
Les données restent sur l'appareil (IndexedDB) ; aucun serveur, aucun compte.

## Lancer

Node.js est installé localement dans `~/.local/node` :

```bash
export PATH=~/.local/node/bin:$PATH
npm install
npm run dev        # http://localhost:5173 (et l'adresse réseau pour tester sur le téléphone)
npm run build      # vérification des types + build de production dans dist/
npm run preview    # sert dist/
```

## Fonctionnalités

- **Programme** : séances types (ex. Push / Pull / Legs) dans l'ordre du cycle, avec séries et récupération par défaut.
- **Nouvelle séance** : la séance suivante du cycle est suggérée ; le formulaire reprend les valeurs de la dernière
  séance du même modèle. À côté de chaque série : « Dernière fois » et une tendance ▲ / = / ▼.
- **Exercices** : types charge (kg), haltères (kg par haltère), poids du corps (lest, négatif = assistance) ;
  historique complet par exercice.
- **Progression** (fiche exercice) : courbe par séance de la charge max, du 1RM estimé (Epley) et du volume ;
  pour le poids du corps, réps max, réps totales et lest max. Filtre de période, dernière valeur avec écart,
  record, bulle au toucher et tableau des valeurs.
- **Réglages** : export / import JSON (partage du fichier sur téléphone), installation de l'app.
- **PWA** : installable, fonctionne hors ligne ; une bannière propose la mise à jour après un nouveau déploiement.
- **Brouillon automatique** : une saisie non enregistrée est conservée (localStorage) et proposée à la reprise
  depuis l'accueil.
- **Rappel de sauvegarde** : bandeau sur l'accueil si la dernière sauvegarde date de plus de 30 jours
  (à partir de 3 séances), reportable d'une semaine.

## Mettre en ligne

Le service worker exige HTTPS (sauf sur `localhost`). `npm run build` produit un site statique dans `dist/`,
hébergeable n'importe où (chemins relatifs). Les données étant liées à l'adresse du site, changer d'hébergement
revient à repartir d'une base vide : exporter puis importer la sauvegarde.

## Structure

```
src/
  db.ts              schéma Dexie et types
  lib/sessions.ts    pré-remplissage, validation et enregistrement des séances
  lib/exercises.ts   création / renommage des exercices
  lib/backup.ts      export / import JSON
  lib/format.ts      formatage (dates, charges, récupération, tendances)
  pages/             un fichier par écran
  components/        sélecteurs réutilisés (exercice, type, récupération)
```
