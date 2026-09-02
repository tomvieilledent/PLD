# WORKING - Zone étudiante

Tout votre travail se fait ici.

- `app/` : application Holbies Festival Control et logique métier à diagnostiquer/corriger.
- `docs/` : sources de vérité (règles, OpenAPI, diagrammes Mermaid, incidents).
- `tests/` : smoke tests visibles.

Le dossier `../private/` est hors zone de travail.

## Boucle conseillée

1. Reproduire le symptôme dans **Le site**, le **Field Lab** ou le terminal.
2. Consulter la bonne source de vérité dans `docs/`.
3. Corriger uniquement dans `working/`.
4. Redémarrer `npm start` si la logique serveur a changé.
5. Rejouer le même diagnostic.
6. Lancer `npm run check -- <INCIDENT>` depuis la racine du projet.
7. Compléter `docs/INCIDENT_LOG.md`.

## Field Lab

Les cinq bancs sont en **DRY RUN** : Accès, Scène, Capacité, Programmation et Payload API. Ils exécutent la vraie logique métier sur une copie temporaire et ne modifient pas l'état live.

Pour `FC-108`, le banc Programmation permet de reproduire le conflit métier ; le statut HTTP réel du endpoint `POST /api/shows` se contrôle ensuite au terminal.
