# FIELD LAB - laboratoire central de diagnostic

Le Field Lab sert à **reproduire un symptôme avant d'ouvrir le code au hasard**.

## Boucle de travail

1. Reproduire le problème dans le Lab.
2. Lire le résultat brut (HTTP + JSON).
3. Confronter ce résultat aux sources de vérité (`festival-rules.md`, Mermaid, OpenAPI).
4. Corriger uniquement dans `working/`.
5. Redémarrer le serveur Node si la logique serveur a changé.
6. Rejouer le même diagnostic.
7. Valider avec `npm run check -- <INCIDENT>`.

## Les 5 bancs d'essai

### A - Accès
Teste un bracelet contre une zone. Utile pour les statuts de billets, niveaux d'accès et dates de validité.

### S - Scène
Simule une transition d'état sans modifier la scène live. À confronter à `diagrams/05_stage_state.mmd`.

### C - Capacité
Force une occupation temporaire et simule une entrée. Les presets permettent de tester `limite - 1`, `limite exacte` et `limite + 1`.

### P - Programmation
Tente de programmer un concert fictif et montre les shows présents sur la même fenêtre côté scène et artiste. La tentative n'est jamais ajoutée au vrai line-up.

### API - Payload
Teste un JSON de création de bracelet sur une copie des données. Les presets permettent de comparer un payload valide, un niveau inconnu et une propriété supplémentaire au contrat OpenAPI.

## Important : DRY RUN

Le Lab appelle la **vraie logique métier** mais sur un clone en mémoire du festival. Un test ne change ni les scènes, ni les zones, ni les shows, ni les bracelets du dashboard.

Le Lab n'est pas le checker : une observation dans l'interface reste un **symptôme**. Seul `npm run check -- <INCIDENT>` valide réellement une correction.
