"""
DIGBA — Schémas Pydantic v2 (I/O de l'API)
"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class Produit(str, Enum):
    noix_de_cajou = "noix_de_cajou"
    arachide      = "arachide"
    mil           = "mil"
    sorgho        = "sorgho"
    sesame        = "sesame"
    cacao         = "cacao"


class Region(str, Enum):
    kaolack    = "Kaolack"
    thies      = "Thiès"
    dakar      = "Dakar"
    ziguinchor = "Ziguinchor"
    saint_louis = "Saint-Louis"


class Stockage(str, Enum):
    silo_ventile = "silo_ventile"
    hangar       = "hangar"
    plein_air    = "plein_air"


# ── Requête ───────────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    produit:        Produit       = Field(..., description="Type de produit agricole")
    region:         str           = Field(..., min_length=2, description="Région de production (tout pays)")
    country:        str           = Field(default="SN", description="Code pays ISO-2")
    fournisseur:    str           = Field(..., min_length=2, description="Nom de l'exportateur")
    stockage:       Stockage      = Field(..., description="Mode de stockage du lot")
    certifications: list[str]     = Field(default=[], description="Labels qualité de l'opérateur")

    model_config = {
        "json_schema_extra": {
            "example": {
                "produit":        "noix_de_cajou",
                "region":         "Kaolack",
                "country":        "SN",
                "fournisseur":    "Export Cashew SN",
                "stockage":       "hangar",
                "certifications": ["GlobalG.A.P."],
            }
        }
    }


# ── Résultats intermédiaires (pipeline) ───────────────────────────────────────

class NdviAnomaly(BaseModel):
    """Anomalie NDVI vs climatologie MODIS (Phase 3) — champ séparé des classes."""
    z_score   : float
    mu        : float
    sigma     : float
    penalty   : float
    label     : str
    available : bool


class NdviResult(BaseModel):
    ndvi_mean:      float
    ndvi_min:       float
    ndvi_max:       float
    classes:        dict[str, float]        # occupation du sol uniquement : eau_nuages, sol_nu, vegetation_moderee, vegetation_dense
    cropland_pct:   float = 0.0             # % pixels agricoles analysés (WorldCover classe 40)
    score:          float                   # 0–100
    anomaly:        Optional[NdviAnomaly] = None
    evi_mean:       Optional[float] = None  # EVI moyen (Phase 5) — None si B2 absent
    evi_available:  bool = False            # True dès que B2.jp2 présent
    map_path:       Optional[str] = None


class WeatherAnomaly(BaseModel):
    """Anomalie météo vs climatologie ERA5 (Open-Meteo Archive 2003-2023)."""
    temp_z:        float           # z-score température vs normale du mois
    precip_z:      float           # z-score précipitation vs normale du mois
    temp_mu:       float           # normale mensuelle température (°C)
    precip_mu:     float           # normale mensuelle précipitation (mm/mois)
    temp_label:    str             # ex: "🌡️ Canicule (+2.3σ)"
    precip_label:  str             # ex: "🌧️ Excès pluie (+1.8σ)"
    penalty:       float           # pénalité totale appliquée au score (0–35)


class WeatherResult(BaseModel):
    city:            str
    humidity:        int
    temp_c:          float
    precip_mm:       float
    wind_speed:      float = 0.0   # km/h (Open-Meteo)
    weather_desc:    str
    humidity_score:  float
    temp_score:      float
    score:           float         # 0–100
    anomaly:         Optional[WeatherAnomaly] = None  # None si climatologie absente


class RasffResult(BaseModel):
    nb_rejets_24m:     int
    nb_rejets_region:  int
    blackliste:        bool
    derniers_dangers:  list[str]
    score:             float       # 0–100


class OperatorResult(BaseModel):
    stockage:       str
    certifications: list[str]
    score:          float          # 0–100
    facteurs:       dict[str, str] # description lisible de chaque contribution


class PhenologyResult(BaseModel):
    stade:     str
    score:     float               # 0–100
    label:     str
    emoji:     str
    country:   str
    produit:   str
    month:     int
    zone:      str
    available: bool


# ── Prévisualisation zone (wizard step 1) ─────────────────────────────────────

class PreviewResponse(BaseModel):
    region:  str
    country: str
    ndvi:    NdviResult
    weather: WeatherResult


# ── Réponse finale ────────────────────────────────────────────────────────────

class ScoreDetails(BaseModel):
    ndvi:       NdviResult
    weather:    WeatherResult
    rasff:      RasffResult
    operator:   OperatorResult
    phenology:  Optional[PhenologyResult] = None


class ScoreResponse(BaseModel):
    score:         float        = Field(..., description="Score de risque global 0–100")
    niveau_risque: str          = Field(..., description="Faible | Modéré | Élevé")
    decision:      str          = Field(..., description="Recommandation d'achat")
    details:       ScoreDetails


# ── Schémas utilitaires (routes RASFF) ────────────────────────────────────────

class RasffStatsDanger(BaseModel):
    danger:          str
    categorie_danger: str
    nb_rejets:       int
    dernier_rejet:   str


class RasffStatsFournisseur(BaseModel):
    fournisseur:   str
    nb_rejets:     int
    dernier_rejet: str
    dangers:       str


class HealthResponse(BaseModel):
    status:    str
    version:   str
    db_ok:     bool
    timestamp: str
