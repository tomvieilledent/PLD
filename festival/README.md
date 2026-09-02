# HOLBIES FESTIVAL CONTROL

Bienvenue dans le PLD **Holbies Festival Control**.

Le festival ouvre bientôt. L'application existe déjà, mais plusieurs règles métier et contrats d'architecture ne sont pas respectés. Votre rôle : **observer, diagnostiquer, corriger, tester et documenter** sans casser le reste du système.

## 1. Votre territoire

- `working/` : **votre espace de travail**. Vous pouvez lire et modifier ce dossier.
- `private/` : moteur de validation et historique de campagne. **Hors zone de travail : ne le modifiez pas.**

Les règles métier, diagrammes Mermaid et contrats de référence se trouvent dans `working/docs/`.

## 2. Démarrer

Prérequis : **Node.js 20 ou supérieur**.

```bash
node -v
npm start
```

Aucune dépendance npm externe n'est nécessaire : **pas besoin de `npm install`**.

Puis ouvrez : `http://localhost:4177`

Si le port est occupé :

```bash
PORT=4180 npm start
```

Gardez le serveur ouvert et utilisez un second terminal pour le PLD :

```bash
npm test
npm run check -- FC-101
npm run hint -- FC-101 1
npm run validate
```

Pour remettre la campagne à zéro :

```bash
npm run reset
```

## 3. Field Lab

L'onglet **Field Lab** est le laboratoire central de diagnostic. Il contient cinq bancs d'essai :

- **Accès** : bracelet + zone ;
- **Scène** : transition de machine d'état ;
- **Capacité** : valeurs limites ;
- **Programmation** : tentative de création d'un concert et détection des conflits ;
- **Payload API** : validation d'un JSON de création de bracelet.

Les bancs utilisent la vraie logique de `working/app/` sur une **copie temporaire** des données (`DRY RUN`). Ils ne modifient ni le line-up, ni les compteurs, ni la campagne.

Le Lab sert à reproduire un symptôme. Pour `FC-108`, le conflit se reproduit dans le banc Programmation, mais le **vrai code HTTP de `POST /api/shows`** se vérifie au terminal.

Après une correction dans la logique serveur, redémarrez `npm start` avant de rejouer le même diagnostic.

## 4. Mode campagne

La progression suit **4 actes + un mode ENCORE**. Seul le checker valide réellement un incident.

Consultez :

- `working/docs/CAMPAIGN.md` pour la chronologie ;
- `working/docs/FIELD_LAB.md` pour le workflow de diagnostic ;
- `working/docs/incidents.md` pour les 15 fiches ;
- `Holbies_Festival_Control_PLD_Student.pdf` pour le guide complet.
