# DIGBA — Système de Scoring de Risque Alimentaire

> MVP v1.0 | MEST Africa | Mars 2026
> **Babacar Ndao** — Tech & AI Lead

DIGBA prédit le risque de rejet européen des lots d'anacarde sénégalais en croisant 4 sources de données : satellite NDVI, météo, historique RASFF et formulaire opérateur.

---

## Démarrage rapide

### Prérequis
- Python 3.13+ avec [uv](https://docs.astral.sh/uv/)
- Node.js 20+ avec npm
- Docker & Docker Compose (optionnel)

### 1. Cloner et configurer l'environnement

```bash
git clone <repo-url>
cd DIGBA

# Copier et renseigner les variables d'environnement
cp .env.example .env
```

### 2. Backend

```bash
# Installer les dépendances Python
uv sync

# Lancer le serveur FastAPI
uv run uvicorn backend.main:app --reload --port 8000
```

API disponible sur `http://localhost:8000`
Docs Swagger : `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

# Installer les dépendances Node
npm install

# Lancer le serveur de développement
npm run dev
```

Interface disponible sur `http://localhost:5173`

### 4. Avec Docker (tout en un)

```bash
docker-compose up --build
```

---

## Architecture

```
DIGBA/
├── backend/                    # API Python / FastAPI
│   ├── api/
│   │   ├── routes/             # Endpoints REST
│   │   └── middleware/         # CORS, auth, logging
│   ├── core/
│   │   ├── pipeline/
│   │   │   ├── ndvi/           # Sentinel-2 → calcul NDVI
│   │   │   ├── weather/        # wttr.in → données météo
│   │   │   ├── rasff/          # Lookup rejets EU
│   │   │   └── operator/       # Formulaire opérateur
│   │   └── scoring/            # Moteur de score final
│   ├── models/                 # Schémas Pydantic + SQLAlchemy
│   ├── db/                     # SQLite + migrations Alembic
│   ├── config/
│   │   └── settings.py         # Configuration centralisée
│   ├── data/
│   │   ├── satellite/          # Tuiles Sentinel-2 (B4.jp2, B8.jp2)
│   │   ├── outputs/            # NDVI maps générées
│   │   └── rasff/              # BDD rejets EU + seed CSV
│   └── tests/
├── frontend/                   # React + TypeScript + Vite
│   └── src/
│       ├── components/         # UI atomique (shadcn)
│       ├── pages/              # Dashboard, Analysis, History
│       ├── services/           # Appels API
│       ├── hooks/              # Custom hooks
│       └── store/              # Zustand state
├── docs/                       # Documentation technique
├── docker-compose.yml
├── pyproject.toml              # Dépendances Python (uv)
├── .env.example                # Variables d'environnement
└── STACK.md                    # Stack technique détaillé
```

---

## Pipeline de scoring

| Source | Poids | Rôle |
|---|---|---|
| Satellite NDVI (Sentinel-2) | **35%** | État de santé de la végétation à la parcelle |
| Météo (wttr.in) | **25%** | Conditions de stockage & transport |
| RASFF EU | **25%** | Historique des rejets européens documentés |
| Formulaire opérateur | **15%** | Contexte terrain (pratiques, région, fournisseur) |

### Niveaux de risque

| Score | Niveau | Décision |
|---|---|---|
| 0 – 35% | 🟢 Faible | Achat recommandé |
| 35 – 65% | 🟡 Modéré | Test terrain obligatoire |
| > 65% | 🔴 Élevé | Rejeter ou renégocier |

---

## Stack technique

Voir [`STACK.md`](./STACK.md) pour le détail complet.

**Backend** : Python 3.13 · FastAPI · SQLAlchemy · rasterio · numpy
**Frontend** : React 18 · TypeScript · Vite · Tailwind CSS · Recharts
**DevOps** : Docker · GitHub Actions · uv

---

## Roadmap

- **MVP (0–3 mois)** : Pipeline 4 sources + API FastAPI + UI formulaire
- **V1.1 (3–6 mois)** : Historique météo, GPS parcelle, dashboard exportateur
- **V2 (6–12 mois)** : Modèle ML calibré, API publique, expansion CI/GH

---

*DIGBA by MEST Africa — Confidentiel*
