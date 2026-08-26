# X6 — Une combinaison échoue

Une seule combinaison supportée de la matrix devient rouge. Le piège serait de supprimer cette combinaison juste pour retrouver du vert.

**Votre mission :** isolez l'erreur, classez la cause (CI/configuration ou application/runtime), corrigez-la puis rétablissez les cinq environnements supportés.

**Preuves attendues :** un run rouge qui montre l'anomalie ciblée, puis un run vert 5/5 après correction.

```text
npm run mission -- evidence X6 <red-run-url> <green-run-url>
npm run mission -- check X6
```
