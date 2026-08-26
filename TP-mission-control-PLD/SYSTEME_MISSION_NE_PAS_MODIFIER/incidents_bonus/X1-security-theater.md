# X1 — Sécurité de façade

Le workflow affiche bien une étape de scan, mais Mission Control veut vérifier qu'elle a **un vrai pouvoir de décision**.

**Votre mission :** prouvez qu'une finding CRITICAL rend le run rouge et empêche `publish` de démarrer. Ne masquez pas la vulnérabilité juste pour obtenir du vert.

**Preuve attendue :** l'URL d'un run volontairement bloqué.

```text
npm run mission -- evidence X1 <blocked-run-url>
npm run mission -- check X1
```
