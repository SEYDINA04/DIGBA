"""
DIGBA — Application FastAPI
Point d'entrée principal du backend.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config.settings import settings
from backend.db.seed import seed_database
from backend.api.routes import health, scoring, rasff

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

# Silence les bibliothèques tierces très verboses en mode DEBUG
for _noisy_logger in (
    "matplotlib",
    "matplotlib.font_manager",
    "rasterio",
    "urllib3",
    "urllib3.connectionpool",
    "sqlalchemy.engine",
    "sqlalchemy.pool",
    "PIL",
    "fiona",
):
    logging.getLogger(_noisy_logger).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise la base de données au démarrage."""
    logger.info("🌱 Démarrage DIGBA API...")
    seed_database()
    logger.info("✅ DIGBA API prête")
    yield
    logger.info("🛑 Arrêt DIGBA API")


app = FastAPI(
    title="DIGBA API",
    description="Système de scoring de risque alimentaire pour l'export d'anacarde sénégalais",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(health.router,  prefix=settings.api_prefix)
app.include_router(scoring.router, prefix=settings.api_prefix)
app.include_router(rasff.router,   prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
def root():
    return {
        "name": "DIGBA API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
