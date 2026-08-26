# X2 — Une PR publie en production

Les Pull Requests doivent pouvoir être testées, construites et scannées. Elles ne doivent en revanche **jamais publier** dans le registry de production.

**Votre mission :** vérifiez le chemin d'exécution du workflow et prouvez qu'une PR ne peut pas atteindre `publish`.

**Preuve attendue :** l'URL d'un run de Pull Request où les validations utiles s'exécutent sans publication production.

```text
npm run mission -- evidence X2 <pr-run-url>
npm run mission -- check X2
```
