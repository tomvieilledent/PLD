# Incidents Deep Space

Ces scénarios sont **optionnels** et commencent uniquement après les six gates obligatoires.

Quand Flight Readiness atteint **6/6**, Mission Control déverrouille automatiquement **Deep Space Mode** :

- X1 devient `AVAILABLE` ;
- lancez-le avec `npm run incident -- X1` ;
- il passe `ACTIVE` dans la console ;
- corrigez / prouvez ce qui est demandé ;
- validez avec `npm run mission -- check X1` ;
- s'il passe `CLEARED`, X2 se déverrouille, puis X3, etc.

Les indices X1 à X6 sont accessibles depuis la console exactement comme pour les gates principales.

Utilisez `npm run mission -- status` à tout moment pour voir la progression complète.
