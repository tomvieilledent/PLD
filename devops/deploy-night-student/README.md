# Deploy Night - Game Night

17h00. Vous prenez la garde chez PixelForge. A 20h00, **Game Night** ouvre ses portes.
L'application est deja codee : votre equipe de 3 doit la containeriser, lancer la stack fournie,
puis la maintenir disponible pendant une simulation de release.

Le support complet est dans `Deploy_Night_Game_Night_PLD.pdf`.

## Ce qui est fourni

- le code du frontend et de l'API ;
- PostgreSQL, Redis et le gateway Nginx ;
- un `compose.yaml` starter volontairement lisible ;
- les images de base imposees pour que tous les groupes aient le meme environnement ;
- les scripts de validation ;
- 3 incidents obligatoires + 3 incidents bonus.

## Demarrage

1. Completez `ops/TEAM.md`.
2. Initialisez Git et travaillez avec de petits commits conventionnels.
3. Suivez les checkpoints du PDF dans l'ordre.
4. Avant le premier `docker compose up`, lancez `./tools/prepare-runtime.sh`.
5. Les incidents obligatoires se declenchent avec `./incident 1`, `./incident 2`, `./incident 3`.
6. Si votre equipe avance vite : `./incident 4`, `./incident 5`, `./incident 6`.

## Compatibilite du runner d'incidents

Le launcher `./incident` choisit automatiquement le binaire correspondant a Linux ou macOS.
Sur macOS, il retire automatiquement l'attribut de quarantaine du **binaire local du kit** si le ZIP telecharge l'a transmis.
Vous ne devriez donc pas avoir a lancer `xattr` manuellement.

Sous Windows, utilisez `incident.cmd 1`, `incident.cmd 2`, etc.

Les injecteurs d'incident sont compiles et leur scenario est chiffre dans le binaire afin d'eviter le spoil.
Le but n'est pas de les reverse-engineer : observez le comportement du systeme, lisez les logs,
formulez une hypothese et testez-la.
## Console d'incident

La console Game Night affiche automatiquement le **numéro et l'impact utilisateur** de l'incident actuellement injecté.
Elle se met à jour toute seule et le bandeau disparaît uniquement après réussite du script de validation correspondant.
Ce bandeau ne donne ni la cause technique ni la correction : utilisez toujours `ps`, `logs`, `curl` et vos hypothèses pour diagnostiquer.

