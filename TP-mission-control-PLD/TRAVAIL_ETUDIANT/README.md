# Zone de travail étudiant

Tout ce que vous êtes autorisés à modifier pour le parcours principal est regroupé ici.

- `Dockerfile` : volontairement fonctionnel mais non optimisé au départ.
- `Dockerfile.dockerignore` : **à créer avec ce nom exact** lorsque votre investigation vous amène à réduire le contexte de build. Ne créez pas `.dockerignore` à la racine pour ce TP.
- `release-manifest.json` : petit fichier runtime prévu pour tester un **code-only rebuild** sans toucher au système fourni.
- `FLIGHT_LOG.md` : vos mesures, décisions et preuves.
- `PREUVES/` : alimenté automatiquement par `npm run measure -- ...`.
- `release-gate.test.js` : apparaît uniquement pendant l'incident PR.

Vous travaillerez aussi dans `.github/workflows/` pour la CI.

Le dossier `SYSTEME_MISSION_NE_PAS_MODIFIER/` peut être **lu**, mais ne doit pas être modifié.


Le workflow GitHub attendu par les checks locaux doit être créé exactement ici : `.github/workflows/mission.yml`.
