"""
DIGBA — Pipeline Météo (Open-Meteo)
=====================================
Remplace wttr.in par Open-Meteo — API gratuite, sans clé, basée sur
ERA5 (ECMWF reanalysis) pour les données historiques et le modèle
météo global IFS pour les conditions actuelles.

APIs utilisées :
  Forecast  : https://api.open-meteo.com/v1/forecast        (conditions actuelles)
  Archive   : https://archive-api.open-meteo.com/v1/archive (historique ERA5)

Avantages vs wttr.in :
  ✓ Coordonnées GPS précises (pas d'ambiguïté sur les noms de villes)
  ✓ Historique ERA5 1940–présent → climatologie mensuelle
  ✓ Détection d'anomalie : z-score temp et précip vs normale 20 ans
  ✓ Score météo contextualisé (pas juste instantané)
  ✓ Aucune authentification, aucune limite de requêtes raisonnable
"""
import json
import logging
import datetime
from pathlib import Path
from typing import Optional

import requests

from backend.models.schemas import WeatherResult, WeatherAnomaly

logger = logging.getLogger(__name__)

# ── Constantes API ────────────────────────────────────────────────────────────
FORECAST_URL  = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL   = "https://archive-api.open-meteo.com/v1/archive"
TIMEOUT       = 12  # secondes

# Climatologie pré-calculée (générée par generate_weather_climatology.py)
CLIM_PATH = Path(__file__).parent / "weather_climatology.json"

# ── Coordonnées GPS par région (WGS84) ───────────────────────────────────────
# Utilisées directement par Open-Meteo — plus fiable que les noms de villes
REGION_COORDS: dict[str, tuple[float, float]] = {
    # Sénégal
    "Dakar":       (14.6928, -17.4467),
    "Thiès":       (14.7886, -16.9260),
    "Kaolack":     (14.1520, -16.0726),
    "Ziguinchor":  (12.5588, -16.2719),
    "Saint-Louis": (16.0326, -16.4818),
    # Ghana
    "Accra":       (5.5600,  -0.2057),
    "Kumasi":      (6.6885,  -1.6244),
    "Tamale":      (9.4034,  -0.8424),
    "Cape Coast":  (5.1053,  -1.2466),
    "Sunyani":     (7.3400,  -2.3264),
    # Nigeria
    "Lagos":         (6.5244,  3.3792),
    "Kano":          (12.0022, 8.5920),
    "Ibadan":        (7.3775,  3.9470),
    "Abuja":         (9.0765,  7.3986),
    "Port Harcourt": (4.8156,  7.0498),
    # Côte d'Ivoire
    "Abidjan":       (5.3599,  -4.0083),
    "Bouaké":        (7.6906,  -5.0313),
    "Yamoussoukro":  (6.8276,  -5.2893),
    "San-Pédro":     (4.7484,  -6.6363),
    "Korhogo":       (9.4580,  -5.6294),
}

# ── Codes météo WMO → description lisible ────────────────────────────────────
# Source : https://open-meteo.com/en/docs (WMO Weather interpretation codes)
WMO_CODES: dict[int, str] = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm + hail", 99: "Thunderstorm + heavy hail",
}

# ── Climatologie chargée en mémoire (lazy) ───────────────────────────────────
_climatology: dict | None = None


def _load_climatology() -> dict | None:
    global _climatology
    if _climatology is not None:
        return _climatology
    if CLIM_PATH.exists():
        with open(CLIM_PATH) as f:
            _climatology = json.load(f)
        logger.info(f"Climatologie météo chargée : {len(_climatology)} régions")
    else:
        logger.warning(
            "weather_climatology.json absent — anomalie météo désactivée. "
            "Lancer generate_weather_climatology.py pour l'activer."
        )
    return _climatology


# ── Fonctions de scoring ──────────────────────────────────────────────────────

def _humidity_score(humidity: float) -> float:
    """Score de risque humidité (0–100). Seuils calibrés Afrique de l'Ouest."""
    if humidity < 60:   return 0.0
    elif humidity < 70: return 30.0
    elif humidity < 80: return 60.0
    else:               return 100.0


def _temp_score(temp_c: float) -> float:
    """Score de risque température (0–100). Seuils calibrés zone tropicale."""
    if temp_c < 25:     return 0.0
    elif temp_c < 30:   return 30.0
    elif temp_c < 35:   return 60.0
    else:               return 100.0


def _precip_score(precip_mm: float) -> float:
    """
    Score de risque précipitation journalière (0–100).
    Précip élevée = humidité résiduelle → conditions mycotoxines.
    """
    if precip_mm == 0:      return 0.0
    elif precip_mm < 5:     return 15.0
    elif precip_mm < 20:    return 40.0
    else:                   return 70.0


def _anomaly_label(z: float, var: str) -> str:
    """Génère un label lisible pour un z-score météo."""
    sign = f"+{z:.1f}σ" if z >= 0 else f"{z:.1f}σ"
    if var == "temp":
        if z > 2.0:    return f"🌡️ Canicule exceptionnelle ({sign})"
        elif z > 1.0:  return f"🌡️ Chaleur anormale ({sign})"
        elif z < -2.0: return f"❄️ Fraîcheur exceptionnelle ({sign})"
        elif z < -1.0: return f"❄️ Fraîcheur anormale ({sign})"
        else:          return f"✅ Température normale ({sign})"
    else:  # precip
        if z > 2.0:    return f"🌧️ Excès pluie exceptionnel ({sign})"
        elif z > 1.0:  return f"🌧️ Pluies au-dessus normale ({sign})"
        elif z < -2.0: return f"🏜️ Sécheresse sévère ({sign})"
        elif z < -1.0: return f"🏜️ Déficit pluviométrique ({sign})"
        else:          return f"✅ Précipitations normales ({sign})"


def _anomaly_penalty(z_temp: float, z_precip: float) -> float:
    """
    Pénalité totale basée sur les anomalies temp + précip.

    Logique mycotoxines :
      - Canicule sévère (z_temp > 2) : favorise Aspergillus → +15 pts
      - Sécheresse sévère (z_precip < -2) : stress + Aspergillus → +20 pts
      - Excès pluie (z_precip > 2) : humidité → Fusarium/Ochratoxine → +10 pts
    """
    penalty = 0.0

    # Anomalie température
    if z_temp > 2.5:    penalty += 18.0
    elif z_temp > 2.0:  penalty += 15.0
    elif z_temp > 1.5:  penalty += 8.0
    elif z_temp > 1.0:  penalty += 4.0

    # Anomalie précipitation
    if z_precip < -2.5:   penalty += 22.0
    elif z_precip < -2.0: penalty += 18.0
    elif z_precip < -1.5: penalty += 10.0
    elif z_precip < -1.0: penalty += 5.0
    elif z_precip > 2.5:  penalty += 12.0
    elif z_precip > 2.0:  penalty += 10.0
    elif z_precip > 1.5:  penalty += 5.0

    return round(min(penalty, 35.0), 1)  # plafond 35 pts


# ── Fonction principale ───────────────────────────────────────────────────────

def get_weather(region: str) -> WeatherResult:
    """
    Récupère les conditions actuelles via Open-Meteo Forecast API
    et calcule le score de risque avec anomalie vs climatologie ERA5.

    Dégradation gracieuse :
      - Si Open-Meteo indisponible → score 50 (incertitude)
      - Si climatologie absente → score absolu sans anomalie
    """
    coords = REGION_COORDS.get(region)
    if not coords:
        # Fallback : région inconnue → coordonnées Dakar
        logger.warning(f"Région inconnue '{region}' — fallback Dakar")
        coords = REGION_COORDS["Dakar"]

    lat, lon = coords
    city_label = region  # label affiché dans le frontend

    try:
        # ── 1. Conditions actuelles (Open-Meteo Forecast) ─────────────────────
        resp = requests.get(
            FORECAST_URL,
            params={
                "latitude":  lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
                "timezone": "auto",
            },
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data    = resp.json()
        current = data["current"]

        temp_c       = float(current["temperature_2m"])
        humidity     = int(current["relative_humidity_2m"])
        precip_mm    = float(current.get("precipitation", 0.0))
        wind_speed   = float(current.get("wind_speed_10m", 0.0))
        weather_code = int(current.get("weather_code", 0))
        weather_desc = WMO_CODES.get(weather_code, "Unknown")

        # ── 2. Score absolu (temp + humidité + précip) ────────────────────────
        h_score = _humidity_score(humidity)
        t_score = _temp_score(temp_c)
        p_score = _precip_score(precip_mm)
        score_abs = round(0.5 * h_score + 0.3 * t_score + 0.2 * p_score, 1)

        logger.info(
            f"✓ Météo {region} ({lat:.2f},{lon:.2f}) | "
            f"temp={temp_c}°C hum={humidity}% précip={precip_mm}mm vent={wind_speed}km/h | "
            f"code={weather_code} '{weather_desc}' | score_abs={score_abs}"
        )

        # ── 3. Anomalie vs climatologie ERA5 ──────────────────────────────────
        weather_anomaly: Optional[WeatherAnomaly] = None
        score_final = score_abs

        clim = _load_climatology()
        if clim and region in clim:
            month_key = str(datetime.datetime.now().month)
            month_clim = clim[region].get(month_key)

            if month_clim:
                mu_temp    = month_clim["temp_mu"]
                sigma_temp = month_clim["temp_sigma"]
                mu_precip  = month_clim["precip_mu"]
                sigma_precip = month_clim["precip_sigma"]

                # z-scores (protégé contre sigma=0)
                z_temp   = (temp_c - mu_temp) / sigma_temp if sigma_temp > 0 else 0.0
                z_precip = (precip_mm - mu_precip) / sigma_precip if sigma_precip > 0 else 0.0

                z_temp   = round(z_temp, 2)
                z_precip = round(z_precip, 2)

                penalty = _anomaly_penalty(z_temp, z_precip)
                score_final = float(min(score_abs + penalty, 100.0))

                weather_anomaly = WeatherAnomaly(
                    temp_z=z_temp,
                    precip_z=z_precip,
                    temp_mu=round(mu_temp, 1),
                    precip_mu=round(mu_precip, 1),
                    temp_label=_anomaly_label(z_temp, "temp"),
                    precip_label=_anomaly_label(z_precip, "precip"),
                    penalty=penalty,
                )
                logger.info(
                    f"Anomalie météo {region} mois={month_key} | "
                    f"z_temp={z_temp} z_precip={z_precip} | penalty={penalty} | "
                    f"score_final={score_final}"
                )

        return WeatherResult(
            city=city_label,
            humidity=humidity,
            temp_c=temp_c,
            precip_mm=precip_mm,
            wind_speed=wind_speed,
            weather_desc=weather_desc,
            humidity_score=h_score,
            temp_score=t_score,
            score=score_final,
            anomaly=weather_anomaly,
        )

    except Exception as exc:
        logger.warning(f"Open-Meteo indisponible pour {region} : {exc} — score 50")
        return WeatherResult(
            city=city_label,
            humidity=70,
            temp_c=30.0,
            precip_mm=0.0,
            wind_speed=0.0,
            weather_desc="Indisponible",
            humidity_score=30.0,
            temp_score=30.0,
            score=50.0,
            anomaly=None,
        )
