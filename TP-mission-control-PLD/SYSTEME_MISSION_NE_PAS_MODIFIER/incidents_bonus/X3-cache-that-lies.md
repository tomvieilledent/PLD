# X3 — Le cache qui ment

Un cache rapide mais faux peut réutiliser des dépendances qui ne correspondent plus au lockfile.

**Votre mission :** prouvez les deux comportements : cache réutilisé quand les dépendances sont identiques, puis cache invalidé après un changement du lockfile.

**Preuves attendues :** un run montrant le cache hit puis un run montrant l'invalidation / nouvelle installation.

```text
npm run mission -- evidence X3 <cache-hit-url> <cache-miss-url>
npm run mission -- check X3
```
