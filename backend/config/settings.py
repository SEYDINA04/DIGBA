"""
DIGBA — Configuration centralisée
Toutes les valeurs sont lues depuis .env (via pydantic-settings).
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Chemins absolus du projet
ROOT_DIR    = Path(__file__).parents[2]          # DIGBA/
BACKEND_DIR = Path(__file__).parents[1]          # DIGBA/backend/
DATA_DIR    = BACKEND_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────
    app_env:     str = "development"
    app_version: str = "1.0.0"
    debug:       bool = True

    # ── API ──────────────────────────────────────────
    api_host:   str = "0.0.0.0"
    api_port:   int = 8000
    api_prefix: str = "/api/v1"

    # ── Base de données ───────────────────────────────
    database_url: str = f"sqlite:///{DATA_DIR}/rasff/digba.db"

    # ── Sentinel-2 ───────────────────────────────────
    sentinel_base_url:       str = "https://sentinel-s2-l2a.s3.amazonaws.com"
    sentinel_tile:           str = "28PBV"
    sentinel_scale:          int = 4
    sentinel_max_cloud_cover: int = 20

    # ── Météo ─────────────────────────────────────────
    weather_api_url:      str = "https://wttr.in"
    weather_default_city: str = "Kaolack"
    weather_timeout:      int = 10

    # ── Pondérations scoring ──────────────────────────
    weight_ndvi:     float = 0.35
    weight_weather:  float = 0.25
    weight_rasff:    float = 0.25
    weight_operator: float = 0.15

    # ── Seuils de décision ────────────────────────────
    score_low_max:    int = 35
    score_medium_max: int = 65

    # ── Seuils métier ─────────────────────────────────
    afb1_limit_ppb:          float = 5.0
    ndvi_stress_threshold:   float = 0.2
    humidity_high_threshold: int   = 80
    temp_high_threshold:     int   = 35

    # ── CORS ─────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def data_satellite_dir(self) -> Path:
        return DATA_DIR / "satellite"

    @property
    def data_outputs_dir(self) -> Path:
        return DATA_DIR / "outputs"

    @property
    def data_rasff_dir(self) -> Path:
        return DATA_DIR / "rasff"


# Instance globale — importée partout dans le backend
settings = Settings()
