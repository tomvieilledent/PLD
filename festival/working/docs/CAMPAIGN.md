# Holbies Festival Control - Mode Campagne

Le PLD se joue comme une journée de festival qui se dégrade progressivement. Les incidents sont toujours techniquement indépendants, mais l'interface les présente en actes pour donner un fil narratif.

## Acte 1 - 10:00 - Soundcheck impossible

**Canal radio : Régie programmation**  
Incidents : `FC-101`, `FC-102`

Le soundcheck commence et le planning affiche deux impossibilités physiques : une scène réservée deux fois et un artiste engagé simultanément sur deux scènes. Stabilisez le line-up avant les balances.

## Acte 2 - 11:05 - Les portes s'entrouvrent

**Canal radio : Sécurité / Accréditations**  
Incidents : `FC-103`, `FC-104`

Les premiers prestataires entrent. Un bracelet lié à un billet annulé passe encore et un VIP franchit le Backstage. Rétablissez la chaîne Ticket -> Bracelet -> Zone.

## Acte 3 - 12:10 - La foule monte

**Canal radio : Stage Manager**  
Incidents : `FC-105`, `FC-106`

Une scène évacuée peut repartir trop vite et une zone pleine accepte encore une entrée. À moins d'une heure de l'ouverture, les invariants de sécurité doivent être stricts.

## Acte 4 - 12:42 - Le système ment

**Canal radio : API / Intégration**  
Incidents : `FC-107`, `FC-108`

Les terminaux partenaires reçoivent des réponses incohérentes : des payloads non prévus passent et les codes HTTP ne décrivent plus la réalité. Restaurez le contrat.

## Mode ENCORE - après GATES CLEARED

Incidents : `FC-X01` à `FC-X07`.

Les portes sont ouvertes. Les sept bonus deviennent disponibles : ils ne bloquent pas l'ouverture mais permettent de viser le **Perfect Run 15/15**.

## Progression

- Incident obligatoire CLEARED : **+100 XP**
- Incident bonus CLEARED : **+150 XP**
- 8/8 obligatoires : badge **GATES CLEARED**
- 15/15 : badge **PERFECT RUN 15/15**

Les XP ne remplacent jamais la preuve : seul le checker comportemental peut passer un incident à `CLEARED`. Les indices ne retirent aucun point.

## Journal de régie

`npm run check`, `npm run hint` et `npm run validate` alimentent automatiquement `private/runtime/story-history.json`. Le dashboard affiche cette chronologie : succès, échecs de checker, indices demandés et validations globales.

## Field Lab par acte

Le Field Lab est disponible pendant toute la campagne. Le banc le plus utile dépend de l'acte :

- **Acte 1** : Programmation - reproduire les collisions de scène ou d'artiste.
- **Acte 2** : Accès - tester billets, bracelets et zones.
- **Acte 3** : Scène + Capacité - transitions FSM et valeurs limites.
- **Acte 4** : Payload API + Programmation - contrat JSON et reproduction du conflit ; le code HTTP réel de `POST /api/shows` se vérifie au terminal.
- **ENCORE** : réutilisez les bancs comme outils de diagnostic, puis complétez au terminal lorsque l'incident porte sur une opération non simulée.

Les bancs sont en **DRY RUN** : ils exécutent la logique de `working/app/` sur une copie temporaire et n'altèrent pas l'état live.
