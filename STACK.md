# DIGBA — Stack Technique
> MVP v1.0 | MEST Africa | Mars 2026 | Babacar Ndao — Tech & AI Lead

---

## Vue d'ensemble

DIGBA est une application full-stack de scoring de risque alimentaire pour les lots d'anacarde sénégalais à l'export. Le pipeline croise 4 sources de données (satellite, météo, historique EU, formulaire opérateur) pour produire un score de risque en < 5 secondes.

---

## BACKEND

### Langage & Runtime
| Technologie | Version | Rôle |
|---|---|---|
| **Python** | 3.13+ | Langage principal du backend |
| **uv** | latest | Gestionnaire de paquets & environnements virtuels (remplace pip/poetry) |

### Framework API
| Technologie | Rôle |
|---|---|
| **FastAPI** | Framework web async — expose les endpoints REST du pipeline |
| **Uvicorn** | Serveur ASGI pour FastAPI |
| **Pydantic** | Validation des données et schémas d'entrée/sortie |

### Pipeline de données
| Technologie | Rôle |
|---|---|
| **rasterio** | Lecture et traitement des images satellite Sentinel-2 (GeoTIFF, JP2) |
| **numpy** | Calcul vectorisé du NDVI : `(NIR - RED) / (NIR + RED)` |
| **requests** | Appels HTTP vers wttr.in (météo) et téléchargement des tuiles Sentinel-2 |
| **python-dotenv** | Gestion des variables d'environnement |

### Base de données
| Technologie | Rôle |
|---|---|
| **SQLite** | Base locale pour la table RASFF (36+ rejets EU documentés) |
| **SQLAlchemy** | ORM pour les requêtes RASFF et historique des lots |
| **Alembic** | Migrations de schéma de base de données |

### Data Science & ML (V2)
| Technologie | Rôle |
|---|---|
| **pandas** | Manipulation des datasets RASFF et feature engineering |
| **scikit-learn** | Calibration des pondérations (régression logistique), normalisation |
| **matplotlib** | Génération des visualisations NDVI (export PNG/GeoTIFF) |

### Tests
| Technologie | Rôle |
|---|---|
| **pytest** | Framework de tests unitaires et d'intégration |
| **httpx** | Client HTTP async pour tester les endpoints FastAPI |

---

## FRONTEND

### Framework & Langage
| Technologie | Version | Rôle |
|---|---|---|
| **React** | 18+ | Framework UI — interface de saisie et visualisation des scores |
| **TypeScript** | 5+ | Typage statique pour la robustesse du code |
| **Vite** | latest | Bundler ultra-rapide — remplace Create React App |

### UI & Styles
| Technologie | Rôle |
|---|---|
| **Tailwind CSS** | Styling utility-first — design system cohérent et rapide |
| **shadcn/ui** | Composants UI accessibles et customisables (boutons, formulaires, cards) |
| **Lucide React** | Bibliothèque d'icônes SVG |
| **Recharts** | Visualisation des scores de risque (gauge, bar, line charts) |

### State Management & Data Fetching
| Technologie | Rôle |
|---|---|
| **TanStack Query** | Cache, synchronisation et gestion des états des appels API |
| **Zustand** | State management global léger (session utilisateur, historique) |

### Formulaires
| Technologie | Rôle |
|---|---|
| **React Hook Form** | Gestion performante du formulaire opérateur |
| **Zod** | Validation des schémas côté client (synchronisé avec Pydantic backend) |

---

## INFRASTRUCTURE & DEVOPS

| Technologie | Rôle |
|---|---|
| **Docker** | Conteneurisation du backend et frontend |
| **Docker Compose** | Orchestration locale des services (api + frontend + db) |
| **GitHub Actions** | CI/CD — lint, tests, build automatique |
| **Git** | Versioning du code |

---

## DONNÉES EXTERNES (APIs & Sources)

| Source | URL | Auth | Fréquence |
|---|---|---|---|
| **Sentinel-2 (ESA/AWS)** | `sentinel-s2-l2a.s3.amazonaws.com` | Aucune | Par scène (~5 jours) |
| **wttr.in** | `wttr.in/{city}?format=j1` | Aucune | À la demande |
| **RASFF EU** | Table locale SQLite | N/A | Mise à jour manuelle |

---

## STRUCTURE DES DOSSIERS

```
DIGBA/
├── backend/
│   ├── api/
│   │   ├── routes/          # Endpoints FastAPI (scoring, lots, historique)
│   │   └── middleware/      # Auth, CORS, logging
│   ├── core/
│   │   ├── scoring/         # Moteur de calcul du score final
│   │   └── pipeline/
│   │       ├── ndvi/        # Download Sentinel-2 + calcul NDVI
│   │       ├── weather/     # Appel wttr.in + parsing météo
│   │       ├── rasff/       # Lookup RASFF + détection rejets
│   │       └── operator/    # Traitement formulaire opérateur
│   ├── models/              # Schémas Pydantic + modèles SQLAlchemy
│   ├── db/
│   │   └── migrations/      # Migrations Alembic
│   ├── config/              # Settings, variables d'env
│   ├── utils/               # Helpers partagés
│   └── tests/
│       ├── unit/            # Tests unitaires par composant
│       └── integration/     # Tests end-to-end du pipeline
│
├── frontend/
│   ├── public/              # Assets statiques
│   └── src/
│       ├── components/
│       │   ├── ui/          # Composants atomiques (Button, Card, Badge...)
│       │   ├── forms/       # Formulaire opérateur
│       │   ├── charts/      # Visualisations scores & NDVI
│       │   └── layout/      # Header, Sidebar, Footer
│       ├── pages/
│       │   ├── Dashboard/   # Vue principale — score en temps réel
│       │   ├── Analysis/    # Détail d'une analyse de lot
│       │   ├── History/     # Historique des lots analysés
│       │   └── Settings/    # Configuration (région, seuils...)
│       ├── services/        # Appels API backend (fetch/axios)
│       ├── hooks/           # Custom React hooks
│       ├── store/           # Zustand stores
│       ├── utils/           # Fonctions utilitaires JS/TS
│       └── assets/          # Images, icônes, fonts
│
├── .claude/
│   └── launch.json          # Configurations de lancement des serveurs
├── STACK.md                 # Ce fichier
└── DIGBA_Pipeline_Reference.docx.pdf
```

---

## ROADMAP TECHNIQUE

| Phase | Période | Focus |
|---|---|---|
| **MVP** | 0–3 mois | Pipeline 4 sources + API FastAPI + UI React formulaire |
| **V1.1** | 3–6 mois | Open-Meteo historique, GPS parcelle, dashboard exportateur |
| **V2** | 6–12 mois | Modèle ML (XGBoost/RF), API publique, expansion CI/GH |

---

*DIGBA by MEST Africa — Confidentiel*
