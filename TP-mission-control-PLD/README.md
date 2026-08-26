# Mission Control - Orbiter-7

Vous avez 3 heures pour qualifier la release d'Orbiter-7. L'application fonctionne déjà : votre mission consiste à rendre sa chaîne de livraison mesurable, fiable, sécurisée et traçable.

## Démarrage rapide - macOS, Windows et Linux

Les commandes ci-dessous sont les mêmes dans **Terminal**, **PowerShell**, **Windows Terminal** ou un terminal Linux.

### 1. Ouvrez un terminal dans le dossier du projet

```text
mission-control-student/
```

### 2. Préparez et vérifiez votre environnement

```bash
npm install
npm run doctor
npm run check
```

Vous devez obtenir un environnement prêt et **5 tests sur 5** avant de modifier quoi que ce soit.

### 3. Lancez Mission Control

```bash
npm start
```

Ouvrez ensuite :

```text
http://localhost:3000
```

Gardez la console ouverte pendant tout le PLD.

### 4. Ouvrez un deuxième terminal dans le même dossier

État de départ :

```bash
npm run mission -- status
```

Première mesure :

```bash
npm run measure -- baseline
```

> Toutes les commandes du projet passent par Node/npm afin d'avoir le même fonctionnement sur macOS, Windows et Linux. Aucun `chmod`, script Bash ou WSL n'est nécessaire.

---

## Où travailler ?

```text
.
├── TRAVAIL_ETUDIANT/                      <- VOTRE ZONE DE TRAVAIL
│   ├── Dockerfile
│   ├── Dockerfile.dockerignore            <- à créer pendant la mission
│   ├── release-manifest.json              <- fichier de test du cache
│   ├── FLIGHT_LOG.md
│   └── PREUVES/                           <- alimenté automatiquement
│
├── .github/
│   └── workflows/                         <- VOTRE CI
│
├── SYSTEME_MISSION_NE_PAS_MODIFIER/       <- FOURNI / NE PAS MODIFIER
│   ├── app/
│   ├── scripts/
│   ├── indices/
│   ├── incidents/
│   └── incidents_bonus/
│
├── package.json
└── README.md
```

**Règle simple :** vous modifiez `TRAVAIL_ETUDIANT/` et `.github/workflows/`. Le dossier `SYSTEME_MISSION_NE_PAS_MODIFIER/` peut être consulté pour comprendre le produit, mais ne doit pas être modifié.

### Noms de fichiers exacts attendus

Ces chemins sont utilisés par les outils automatiques du PLD : respectez-les exactement.

```text
TRAVAIL_ETUDIANT/Dockerfile
TRAVAIL_ETUDIANT/Dockerfile.dockerignore
TRAVAIL_ETUDIANT/release-manifest.json
TRAVAIL_ETUDIANT/FLIGHT_LOG.md
.github/workflows/mission.yml
```

**Important :** pour ce TP, ne créez pas un simple `.dockerignore` à la racine. Le fichier attendu est `TRAVAIL_ETUDIANT/Dockerfile.dockerignore`. Le fichier `TRAVAIL_ETUDIANT/release-gate.test.js` est créé automatiquement par l'incident PR : ne le créez pas à l'avance.

## Commandes Mission Control

```bash
npm run mission -- status
npm run mission -- check mass
npm run mission -- check safety
npm run mission -- check control
npm run mission -- check compat
npm run mission -- check security
npm run mission -- check release
```

Mesures Docker :

```bash
npm run measure -- baseline
npm run measure -- final
npm run measure -- rebuild
npm run compare
```

Pour l'expérience de cache, modifiez uniquement une valeur dans :

```text
TRAVAIL_ETUDIANT/release-manifest.json
```

puis relancez :

```bash
npm run measure -- rebuild
```

Les indices sont progressifs et accessibles directement depuis la console avec **DEMANDER UN INDICE**.

## Preuves GitHub

Certaines gates ont besoin de vraies preuves GitHub Actions / GHCR :

```bash
npm run mission -- evidence control <run-pr-rouge> <run-pr-vert>
npm run mission -- evidence compat <run-matrix-vert>
npm run mission -- evidence security <run-bloque-par-securite>
npm run mission -- evidence release <url-package-ghcr> <tag-sha>
```

## Incidents

Incident de pull request :

```bash
npm run incident -- pr
npm run incident -- reset
```

## Deep Space Mode - bonus intégrés à la console

Les 6 bonus ne sont disponibles **qu'après Flight Readiness 6/6**. Dès que la gate Release passe au vert, Mission Control affiche **DEEP SPACE MODE - UNLOCKED** et rend X1 disponible.

Le parcours est séquentiel :

```text
X1 AVAILABLE -> ACTIVE -> CLEARED
                         |
                         +-> X2 AVAILABLE -> ... -> X6
```

Pour chaque bonus :

```bash
npm run incident -- X1
# lisez le brief et travaillez
npm run mission -- check X1
```

Quand X1 est `CLEARED`, X2 se déverrouille automatiquement, puis X3, X4, X5 et X6. Les cartes, les statuts et les indices sont directement visibles dans la plateforme.

Certaines missions demandent une preuve distante :

```bash
npm run mission -- evidence X1 <blocked-run-url>
npm run mission -- evidence X2 <pr-run-url>
npm run mission -- evidence X3 <cache-hit-url> <cache-miss-url>
npm run mission -- evidence X4 <manifest-url>
npm run mission -- evidence X6 <red-run-url> <green-run-url>
```

X5 est vérifié localement par Mission Control avec Docker et ne demande pas d'URL.

Les briefs détaillés restent disponibles dans `SYSTEME_MISSION_NE_PAS_MODIFIER/incidents_bonus/`.
