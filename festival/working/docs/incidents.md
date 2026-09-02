# Mode campagne - ordre narratif conseillé

- **Acte 1 / Soundcheck impossible** : FC-101, FC-102
- **Acte 2 / Les portes s’entrouvrent** : FC-103, FC-104
- **Acte 3 / La foule monte** : FC-105, FC-106
- **Acte 4 / Le système ment** : FC-107, FC-108
- **Mode ENCORE** : FC-X01 à FC-X07

> Les fiches ci-dessous restent la documentation complète. L'application gère le déblocage narratif et le journal de régie.

---

# Incidents

Chaque fiche part de ce que vous pouvez observer sur Festival Control ou reproduire via son API. La documentation de référence décrit ensuite ce que le système devrait garantir.

## FC-101 — Collision de scène [OBLIGATOIRE]

### À observer sur Festival Control

Dans Festival Control, commencez par la zone <b>LINE-UP - Créneaux sensibles</b>. Sur <b>Main Stage</b>, Neon Fox est programmé de 18:00 à 19:00 et Syntax Error de 18:30 à 19:30. Pendant 30 minutes, la même scène est donc réservée à deux concerts différents.

### Voici le problème

La régie ne doit jamais découvrir ce genre de collision quelques minutes avant l'ouverture. Le planning peut déjà contenir des données incohérentes, mais surtout le système ne doit pas permettre d'en créer de nouvelles. Votre objectif est de retrouver pourquoi la règle de disponibilité de la scène n'est pas protégée au moment où un show est ajouté.

### Ce que le système doit garantir

Créer un nouveau show qui chevauche un show existant sur la même scène doit être refusé sans modifier le planning.

**Référence utile :** Diagramme de séquence Schedule + règles métier.

Validation : `npm run check -- FC-101`

## FC-102 — Artiste ubiquitaire [OBLIGATOIRE]

### À observer sur Festival Control

Toujours dans le <b>LINE-UP</b>, suivez cette fois l'artiste <b>Neon Fox</b>. Il joue sur Main Stage de 18:00 à 19:00, puis apparaît aussi sur Pulse Stage à partir de 18:45. Les deux scènes sont différentes, mais l'artiste est le même.

### Voici le problème

Le planning vérifie peut-être les ressources matérielles, mais il oublie une ressource essentielle : l'artiste lui-même. Un festival peut avoir plusieurs scènes en parallèle, pas cloner un groupe. Cherchez quel invariant métier manque lors de la programmation d'un show.

### Ce que le système doit garantir

Un artiste ne peut pas être engagé sur deux shows simultanés.

**Référence utile :** Modèle de données + règles métier.

Validation : `npm run check -- FC-102`

## FC-103 — Bracelet fantôme [OBLIGATOIRE]

### À observer sur Festival Control

Ouvrez le <b>FIELD LAB - Contrôle d'accès</b>. Sélectionnez le bracelet <b>WB-002 - VIP</b>, associé au billet de Bob, puis tentez un accès au <b>VIP Deck</b>. Festival Control accorde actuellement l'accès alors que le billet <b>TK-002</b> est CANCELLED.

### Voici le problème

Le bracelet semble être traité comme une autorisation autonome. Pourtant, il n'est qu'un support lié à un billet. Si le billet n'est plus valide, ses droits doivent disparaître immédiatement. Retrouvez à quel moment la chaîne bracelet -> ticket cesse d'être vérifiée.

### Ce que le système doit garantir

Tout accès lié à un billet non ACTIVE doit être refusé.

**Référence utile :** Séquence Access + machine d’état Ticket.

Validation : `npm run check -- FC-103`

## FC-104 — Backstage breach [OBLIGATOIRE]

### À observer sur Festival Control

Dans le <b>FIELD LAB - Contrôle d'accès</b>, prenez cette fois <b>WB-003 - VIP</b>, le bracelet valide de Chloé, et choisissez la zone <b>Backstage</b>. La plateforme laisse actuellement passer ce profil.

### Voici le problème

VIP donne des avantages, mais pas tous les droits du festival. Le Backstage est réservé aux personnes qui travaillent ou se produisent sur l'événement. Le bug ne vient donc pas de la validité du billet : il vient de la manière dont le niveau d'accès est interprété.

### Ce que le système doit garantir

VIP garde ses avantages mais ne franchit pas Backstage.

**Référence utile :** Règles de zones + séquence Access.

Validation : `npm run check -- FC-104`

## FC-105 — Scène morte [OBLIGATOIRE]

### À observer sur Festival Control

Regardez d'abord <b>STAGE OPS</b> : <b>Club 42</b> est en état EVACUATED. Puis ouvrez le <b>FIELD LAB - Machine d'état</b>, sélectionnez Club 42 et tentez directement le nouvel état <b>LIVE</b>. La plateforme accepte aujourd'hui cette transition.

### Voici le problème

Une évacuation signifie qu'un incident de sécurité est en cours ou vient d'avoir lieu. Relancer un concert sans étape de remise en sécurité contourne totalement le processus opérationnel. La machine d'état fournie indique précisément le chemin autorisé : votre implémentation doit s'y conformer.

### Ce que le système doit garantir

La transition doit respecter strictement la FSM fournie.

**Référence utile :** Machine d’état Stage.

Validation : `npm run check -- FC-105`

## FC-106 — Une personne de trop [OBLIGATOIRE]

### À observer sur Festival Control

Dans le <b>FIELD LAB - banc Capacité</b>, choisissez <b>Main Pit</b> et utilisez les raccourcis <b>limite - 1</b>, <b>limite exacte</b> et <b>limite + 1</b>. Le Lab simule l'entrée d'une personne sur une copie des données et affiche l'occupation avant/après.

### Voici le problème

C'est un bug classique de valeur limite : le système sait refuser quand on dépasse la capacité, mais pas forcément quand elle est déjà atteinte. Une seule erreur de comparaison suffit à faire entrer une personne de trop. La correction doit préserver le cas juste avant la limite.

### Ce que le système doit garantir

La frontière de capacité doit être exacte, sans casser la dernière place disponible.

**Référence utile :** Règle de capacité / valeurs limites.

Validation : `npm run check -- FC-106`

## FC-107 — Payload sauvage [OBLIGATOIRE]

### À observer sur Festival Control

Ouvrez le <b>FIELD LAB - banc Payload API</b>. Utilisez les presets <b>niveau inconnu</b> et <b>champ surprise</b>, puis confrontez la réponse au contrat <b>working/docs/api-contract.yaml</b>. Vous pouvez aussi modifier librement le JSON.

### Voici le problème

Le système accepte aujourd'hui des données qui n'appartiennent pas au contrat public. Cela ouvre la porte à des niveaux d'autorisation inconnus et à des propriétés que le métier n'a jamais validées. Ici, la documentation OpenAPI est la source de vérité : le code doit être aussi strict qu'elle.

### Ce que le système doit garantir

Le payload doit respecter le JSON Schema de référence.

**Référence utile :** OpenAPI / JSON Schema.

Validation : `npm run check -- FC-107`

## FC-108 — Mauvais signal HTTP [OBLIGATOIRE]

### À observer sur Festival Control

Ouvrez le <b>FIELD LAB - banc Programmation</b> et tentez d'ajouter un concert sur une fenêtre déjà occupée. Le Lab affiche les shows de la même scène et du même artiste qui croisent la fenêtre : il sert ici à reproduire le conflit métier. Ensuite, utilisez le terminal sur le vrai endpoint `POST /api/shows` pour observer les codes HTTP d'une création valide, d'un payload incomplet et d'un conflit, puis comparez-les au contrat OpenAPI.

### Voici le problème

Le corps JSON peut être correct et pourtant l'API ment à son client si le code HTTP est faux. Une création n'est pas un simple 200, une erreur de validation n'est pas un conflit métier, et un conflit de planning n'est pas une panne serveur. Il faut restaurer la sémantique du protocole sans changer les règles métier.

### Ce que le système doit garantir

Rétablir la sémantique 201 / 400 / 409 sans modifier les règles métier.

**Référence utile :** OpenAPI + REST.

Validation : `npm run check -- FC-108`

## FC-X01 — Pass expiré [BONUS]

### À observer sur Festival Control

Dans le <b>FIELD LAB - Contrôle d'accès</b>, testez le bracelet <b>WB-004 - STANDARD</b> de Diego vers la zone General. Son billet <b>TK-004</b> porte encore le statut ACTIVE, mais sa date <b>validUntil</b> est déjà dépassée par rapport à la date du festival.

### Voici le problème

Le statut administratif et la validité temporelle sont deux choses différentes. Un billet peut ne jamais avoir été annulé tout en étant devenu inutilisable. Le contrôle doit combiner ces deux informations avant d'accorder l'accès.

### Ce que le système doit garantir

L’état et la validité temporelle doivent tous deux être vrais.

**Référence utile :** Ticket state + séquence Access.

Validation : `npm run check -- FC-X01`

## FC-X02 — Zone qui ne se vide jamais [BONUS]

### À observer sur Festival Control

Observez les compteurs de zone dans le <b>FIELD LAB</b>, puis utilisez les endpoints d'entrée et de sortie depuis le terminal. Faites entrer un bracelet dans General, notez l'occupation, puis faites-le sortir. Le compteur final doit revenir à sa valeur de départ.

### Voici le problème

Si les sorties ne libèrent pas réellement une place, Festival Control finit par considérer toutes les zones comme pleines alors que le public les a quittées. À l'inverse, une succession de sorties ne doit jamais produire une occupation négative. Les deux invariants doivent être vrais en même temps.

### Ce que le système doit garantir

Une sortie doit libérer une place et ne jamais produire une occupation négative.

**Référence utile :** Événements d’accès / invariants.

Validation : `npm run check -- FC-X02`

## FC-X03 — Concert annulé toujours visible [BONUS]

### À observer sur Festival Control

Revenez à la zone <b>LINE-UP - Créneaux sensibles</b>. Le show des <b>Holbies</b> sur Lab Stage est marqué CANCELLED, mais il est encore présenté comme un élément du programme public.

### Voici le problème

L'annulation existe bien dans les données, mais la vue envoyée au public ne la respecte pas. Le problème n'est donc pas de supprimer l'historique du show : il faut distinguer les données internes de la projection réellement exposée aux festivaliers.

### Ce que le système doit garantir

La vue publique ne doit exposer aucun show CANCELLED.

**Référence utile :** Machine d’état Show implicite / vue.

Validation : `npm run check -- FC-X03`

## FC-X04 — Reschedule non atomique [BONUS]

### À observer sur Festival Control

Depuis le terminal, tentez de déplacer un show existant vers un créneau déjà occupé sur Main Stage. Le système détecte le conflit, mais vérifiez ensuite les données du show d'origine : elles ne doivent avoir changé ni de scène, ni d'heure.

### Voici le problème

Un refus métier doit laisser le système dans l'état exact où il se trouvait avant la tentative. Si l'application modifie d'abord le show puis vérifie les conflits, elle peut retourner une erreur tout en ayant corrompu le planning. C'est précisément ce que l'atomicité doit empêcher.

### Ce que le système doit garantir

Le reschedule doit valider les conflits et laisser le show intact en cas d’échec.

**Référence utile :** Séquence Schedule + notion d’atomicité.

Validation : `npm run check -- FC-X04`

## FC-X05 — Double bracelet [BONUS]

### À observer sur Festival Control

Depuis le terminal, essayez d'émettre un second bracelet pour le billet <b>TK-001</b>, qui possède déjà <b>WB-001</b> actif. Puis répétez le test après avoir désactivé l'ancien bracelet.

### Voici le problème

Deux bracelets actifs pour un seul billet permettent de partager un droit d'entrée qui devrait être unique. Mais bloquer toute nouvelle émission serait également faux : un bracelet perdu doit pouvoir être remplacé après désactivation de l'ancien. La cardinalité métier doit donc porter sur les bracelets <i>actifs</i>.

### Ce que le système doit garantir

Un seul bracelet actif par ticket ; un remplacement n’est possible qu’après désactivation.

**Référence utile :** Cardinalités + règle d’unicité.

Validation : `npm run check -- FC-X05`

## FC-X06 — Dérive sémantique API [BONUS]

### À observer sur Festival Control

Interrogez <b>GET /api/artists/AR-001</b> depuis le terminal et comparez exactement les clés JSON obtenues avec le schéma Artist de <b>api-contract.yaml</b>. Le front attend <b>artistId</b>, <b>name</b> et <b>genre</b>.

### Voici le problème

Le modèle interne peut employer ses propres conventions, mais l'API publique est un contrat stable. Renommer silencieusement artistId en artist_id ou name en display_name casse tous les consommateurs sans que la donnée elle-même soit fausse. Il faut restaurer le mapping public, pas réécrire tout le domaine.

### Ce que le système doit garantir

Restaurer le contrat public exact sans renommer le modèle interne.

**Référence utile :** OpenAPI + cohérence inter-modèles.

Validation : `npm run check -- FC-X06`

## FC-X07 — Artiste orphelin [BONUS]

### À observer sur Festival Control

Depuis le terminal, tentez de supprimer <b>AR-001 - Neon Fox</b>, puis inspectez le line-up et les données. Comparez ensuite avec la suppression de <b>AR-999 - Unused Artist</b>, qui n'est référencé par aucun show.

### Voici le problème

Une suppression ne doit jamais casser l'intégrité du planning. Si un artiste est encore utilisé, son identifiant doit rester disponible pour les shows qui le référencent. En revanche, un artiste réellement inutilisé doit pouvoir être supprimé : le comportement attendu ressemble à une contrainte RESTRICT.

### Ce que le système doit garantir

Appliquer un comportement de type RESTRICT sur un artiste encore utilisé.

**Référence utile :** Intégrité référentielle / modèle de données.

Validation : `npm run check -- FC-X07`
