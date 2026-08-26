# ORBITER-7 - Flight Log

## Crew

- Builder:
- Flight Controller:
- Safety Officer:

## Gate 01 - Baseline and optimization

| Metric | Baseline | Final | Improvement |
|---|---:|---:|---:|
| Image size | 371.8MB | 47.2MB | -324.6MB |
| Full build time | 1.6s | 1.0s | -0.6 |
| Code-only rebuild time | 1.3 | 0.8 | -0.5 |

- **What changed and why:** Passé node:20 passe en node:22-alpine pour gagenr en poids, copie de package*.json avant le ```npm install``` pour le garder en cache et gagner du temps de build

## Gate 02 - Container safety

- `docker inspect` health status:
- Evidence that PID 1 is not root:
- Healthcheck command used:

- **Baseline running user:** root
- **Final running user:** app
- **What changed and why:** Modify root to app -> Pas de droits root pour l'utilisateur app pour eviter les bétises

## Gate 03 - Continuous Integration

- First successful workflow run:
- Failing pull request run:
- Fixed pull request run:

## Gate 04 - Compatibility and cache

- Runtime versions tested:
- Cache-hit run:
- Time before cache:
- Time after cache:

## Gate 05 - Security clearance

- Trivy run:
- Blocking severity policy:
- Critical findings at ship time:

## Gate 06 - Registry and release

- GHCR package URL:
- `latest` tag:
- SHA tag:
- Optional version tag:

## Final crew note

In 5 lines maximum: what made the biggest difference between "it runs" and "we can ship it"?
