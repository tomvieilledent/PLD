# Règles métier - Source de vérité

1. Une scène ne peut accueillir qu'un seul show sur un même créneau temporel.
2. Un artiste ne peut pas être programmé simultanément sur deux scènes.
3. Un accès nécessite un bracelet actif **et** un billet `ACTIVE` encore valide à l'instant du contrôle.
4. Le niveau `VIP` ne donne pas accès au `BACKSTAGE`. Seuls `CREW` et `ARTIST` y accèdent.
5. Une zone pleine refuse l'entrée dès que `occupancy >= capacity`.
6. Une scène `EVACUATED` doit repasser par `READY` après `safety_clear` avant tout nouveau `LIVE`.
7. Le payload d'émission d'un bracelet accepte uniquement `id`, `ticketId`, `level`. Les niveaux autorisés sont `STANDARD`, `VIP`, `CREW`, `ARTIST`.
8. `POST /api/shows` répond `201` à la création, `400` si le payload est invalide, `409` pour un conflit métier.
9. Une sortie de zone diminue l'occupation sans jamais passer sous zéro.
10. Un concert `CANCELLED` n'apparait jamais dans le line-up public.
11. Un reschedule doit valider les mêmes conflits qu'une création et être atomique : en cas d'échec, le show original reste inchangé.
12. Un billet ne peut posséder qu'un seul bracelet actif à la fois.
13. L'API artiste expose `artistId`, `name`, `genre`.
14. La suppression d'un artiste encore référencé par un show est interdite (`RESTRICT`).
