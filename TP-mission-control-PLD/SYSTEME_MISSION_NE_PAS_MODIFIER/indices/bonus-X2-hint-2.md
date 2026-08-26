# X2 — Séparez validation et publication
Une Pull Request peut très bien lancer des tests, un build et un scan. Le problème n'est pas qu'elle exécute la CI : c'est qu'elle puisse écrire dans le registry de production.
