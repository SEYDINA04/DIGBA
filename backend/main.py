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
    """
    Initialise la base de données et le modèle ML au démarrage.

    Ordre d'initialisation :
      1. seed_database()  — charge les données RASFF dans SQLite
      2. train_model()    — entraîne le Random Forest (skip si model.pkl existe)
      3. get_model_info() — précharge le modèle en mémoire (évite la latence au 1er appel)
    """
    logger.info("🌱 Démarrage DIGBA API...")

    # Étape 1 : base de données
    seed_database()

    # Étape 2 : entraînement ML (skip automatique si model.pkl déjà présent)
    try:
        from backend.ml.train import train_model
        trained = train_model(force=False)
        if trained:
            logger.info("🤖 Modèle ML entraîné avec succès au démarrage")
    except Exception as e:
        logger.warning(f"⚠️  Entraînement ML échoué (fallback rule-based actif) : {e}")

    # Étape 3 : préchargement du modèle en mémoire
    try:
        from backend.ml.service import get_model_info
        info = get_model_info()
        if info["ml_available"]:
            logger.info(
                f"✅ ML opérationnel | MAE={info['mae_test']} pts | R²={info['r2_test']}"
            )
        else:
            logger.warning("⚠️  ML indisponible — fallback rule-based actif")
    except Exception as e:
        logger.warning(f"⚠️  Préchargement ML échoué : {e}")

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
