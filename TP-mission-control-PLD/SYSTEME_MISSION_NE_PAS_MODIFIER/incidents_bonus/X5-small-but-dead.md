# X5 — Petite… mais morte

Une image très minimale peut casser sa propre sonde de santé si le runtime ne contient plus l'outil qu'elle utilise.

**Votre mission :** gardez une image raisonnablement légère tout en garantissant un healthcheck réellement exécutable dans l'image finale.

**Preuve attendue :** Mission Control lance lui-même l'image et attend le statut `healthy`.

```text
npm run mission -- check X5
```
