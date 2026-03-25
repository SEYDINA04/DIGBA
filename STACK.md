# DIGBA — Technical Stack
> MVP v1.0 | MEST Africa | March 2026 | Babacar Ndao — Tech & AI Lead

---

## Overview

DIGBA is a full-stack food safety risk scoring application for West African agro-export lots. The pipeline combines 4 data sources (satellite, weather, EU rejection history, operator form) to produce a risk score in under 5 seconds.

---

## BACKEND

### Language & Runtime
| Technology | Version | Role |
|---|---|---|
| **Python** | 3.13+ | Main backend language |
| **uv** | latest | Package & virtual environment manager (replaces pip/poetry) |

### API Framework
| Technology | Role |
|---|---|
| **FastAPI** | Async web framework — exposes the pipeline's REST endpoints |
| **Uvicorn** | ASGI server for FastAPI |
| **Pydantic** | Data validation and input/output schemas |

### Data Pipeline
| Technology | Role |
|---|---|
| **rasterio** | Reading and processing Sentinel-2 satellite images (GeoTIFF, JP2) |
| **numpy** | Vectorised NDVI computation: `(NIR - RED) / (NIR + RED)` |
| **requests** | HTTP calls to wttr.in (weather) and Sentinel-2 tile downloads |
| **python-dotenv** | Environment variable management |

### Database
| Technology | Role |
|---|---|
| **SQLite** | Local database for the RASFF table (489+ documented EU rejections) |
| **SQLAlchemy** | ORM for RASFF queries and lot history |
| **Alembic** | Database schema migrations |

### Data Science & ML (V2)
| Technology | Role |
|---|---|
| **pandas** | RASFF dataset manipulation and feature engineering |
| **scikit-learn** | Weight calibration (logistic regression), normalisation |
| **matplotlib** | NDVI visualisation generation (PNG/GeoTIFF export) |

### Testing
| Technology | Role |
|---|---|
| **pytest** | Unit and integration test framework |
| **httpx** | Async HTTP client for testing FastAPI endpoints |

---

## FRONTEND

### Framework & Language
| Technology | Version | Role |
|---|---|---|
| **React** | 18+ | UI framework — input interface and score visualisation |
| **TypeScript** | 5+ | Static typing for code robustness |
| **Vite** | latest | Ultra-fast bundler — replaces Create React App |

### UI & Styling
| Technology | Role |
|---|---|
| **Tailwind CSS** | Utility-first styling — coherent and fast design system |
| **shadcn/ui** | Accessible and customisable UI components (buttons, forms, cards) |
| **Lucide React** | SVG icon library |
| **Recharts** | Risk score visualisation (gauge, bar, line charts) |

### State Management & Data Fetching
| Technology | Role |
|---|---|
| **TanStack Query** | Caching, synchronisation and API call state management |
| **Zustand** | Lightweight global state management (user session, history) |

### Forms
| Technology | Role |
|---|---|
| **React Hook Form** | Performant operator form management |
| **Zod** | Client-side schema validation (synchronised with backend Pydantic) |

---

## INFRASTRUCTURE & DEVOPS

| Technology | Role |
|---|---|
| **Docker** | Backend and frontend containerisation |
| **Docker Compose** | Local service orchestration (api + frontend + db) |
| **GitHub Actions** | CI/CD — automated lint, tests and build |
| **Git** | Code versioning |

---

## EXTERNAL DATA (APIs & Sources)

| Source | URL | Auth | Frequency |
|---|---|---|---|
| **Sentinel-2 (ESA/AWS)** | `sentinel-s2-l2a.s3.amazonaws.com` | None | Per scene (~5 days) |
| **wttr.in** | `wttr.in/{city}?format=j1` | None | On demand |
| **RASFF EU** | Local SQLite table | N/A | Manual update |

---

## FOLDER STRUCTURE

```
DIGBA/
├── backend/
│   ├── api/
│   │   ├── routes/          # FastAPI endpoints (scoring, lots, history)
│   │   └── middleware/      # Auth, CORS, logging
│   ├── core/
│   │   ├── scoring/         # Final score computation engine
│   │   └── pipeline/
│   │       ├── ndvi/        # Sentinel-2 download + NDVI calculation
│   │       ├── weather/     # wttr.in call + weather parsing
│   │       ├── rasff/       # RASFF lookup + rejection detection
│   │       └── operator/    # Operator form processing
│   ├── models/              # Pydantic schemas + SQLAlchemy models
│   ├── db/
│   │   └── migrations/      # Alembic migrations
│   ├── config/              # Settings, environment variables
│   ├── utils/               # Shared helpers
│   └── tests/
│       ├── unit/            # Unit tests per component
│       └── integration/     # End-to-end pipeline tests
│
├── frontend/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/
│       │   ├── ui/          # Atomic components (Button, Card, Badge...)
│       │   ├── forms/       # Operator form
│       │   ├── charts/      # Score & NDVI visualisations
│       │   └── layout/      # Header, Sidebar, Footer
│       ├── pages/
│       │   ├── Dashboard/   # Main view — real-time risk score
│       │   ├── Analysis/    # Lot analysis detail
│       │   ├── History/     # Analysed lots history
│       │   └── Settings/    # Configuration (region, thresholds...)
│       ├── services/        # Backend API calls (fetch/axios)
│       ├── hooks/           # Custom React hooks
│       ├── store/           # Zustand stores
│       ├── utils/           # JS/TS utility functions
│       └── assets/          # Images, icons, fonts
│
├── .claude/
│   └── launch.json          # Server launch configurations
├── STACK.md                 # This file
└── DIGBA_Pipeline_Reference.docx.pdf
```

---

## RASFF DATABASE — 4-Country Coverage

| Country | Alerts | Border Rejections | Primary Hazard | Primary Market |
|---|---|---|---|---|
| Senegal | 54 | 35% | Chlorpyrifos (chilli) | Spain |
| Ghana | 98 | 63% | Sudan dyes (palm oil) | UK |
| Côte d'Ivoire | 25 | 36% | Sudan dyes (palm oil) | Belgium |
| Nigeria | 312 | 82% | Salmonella (sesame) | Greece |
| **Total** | **489** | | | |

---

## TECHNICAL ROADMAP

| Phase | Timeline | Focus |
|---|---|---|
| **MVP** | 0–3 weeks | 4-source pipeline + FastAPI + React operator form |
| **V1.1** | 3–5 months | Open-Meteo history, plot GPS, exporter dashboard |
| **V2** | 5–7 months | ML model (XGBoost/RF), public API, CI/GH/NG expansion |

---

*DIGBA by MEST Africa — Confidential*
