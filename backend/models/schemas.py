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

class NdviResult(BaseModel):
    ndvi_mean:  float
    ndvi_min:   float
    ndvi_max:   float
    classes:    dict[str, float]   # {"sol_nu": 12.3, "vegetation_moderee": 45.1, ...}
    score:      float              # 0–100
    map_path:   Optional[str] = None


class WeatherResult(BaseModel):
    city:            str
    humidity:        int
    temp_c:          int
    precip_mm:       float
    weather_desc:    str
    humidity_score:  float
    temp_score:      float
    score:           float         # 0–100


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


# ── Prévisualisation zone (wizard step 1) ─────────────────────────────────────

class PreviewResponse(BaseModel):
    region:  str
    country: str
    ndvi:    NdviResult
    weather: WeatherResult


# ── Réponse finale ────────────────────────────────────────────────────────────

class ScoreDetails(BaseModel):
    ndvi:     NdviResult
    weather:  WeatherResult
    rasff:    RasffResult
    operator: OperatorResult


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
