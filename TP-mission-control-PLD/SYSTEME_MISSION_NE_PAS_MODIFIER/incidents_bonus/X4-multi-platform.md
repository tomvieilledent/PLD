# X4 — Couverture multi-plateforme

Orbiter-7 doit maintenant être disponible pour `linux/amd64` **et** `linux/arm64` sous une même référence de release.

**Votre mission :** étendez la publication sans créer deux releases indépendantes impossibles à tracer ensemble.

**Preuve attendue :** un manifest / package publié qui expose les deux plateformes.

```text
npm run mission -- evidence X4 <manifest-url>
npm run mission -- check X4
```
