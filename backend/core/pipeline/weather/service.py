"""
DIGBA — Pipeline Météo (wttr.in)
"""
import logging
import requests
from backend.config.settings import settings
from backend.models.schemas import WeatherResult

logger = logging.getLogger(__name__)

# Mapping région → ville pour wttr.in (tous pays DIGBA)
REGION_TO_CITY: dict[str, str] = {
    # Sénégal
    "Kaolack":     "Kaolack",
    "Thiès":       "Thies",
    "Dakar":       "Dakar",
    "Ziguinchor":  "Ziguinchor",
    "Saint-Louis": "Saint-Louis",
    # Ghana
    "Kumasi":      "Kumasi",
    "Accra":       "Accra",
    "Cape Coast":  "Cape+Coast",
    "Tamale":      "Tamale",
    "Sunyani":     "Sunyani",
    # Nigeria
    "Lagos":          "Lagos",
    "Kano":           "Kano",
    "Ibadan":         "Ibadan",
    "Abuja":          "Abuja",
    "Port Harcourt":  "Port+Harcourt",
    # Côte d'Ivoire
    "Abidjan":        "Abidjan",
    "Bouaké":         "Bouake",
    "Yamoussoukro":   "Yamoussoukro",
    "San-Pédro":      "San-Pedro",
    "Korhogo":        "Korhogo",
}


def _humidity_score(humidity: int) -> float:
    """Score de risque basé sur l'humidité (%)."""
    if humidity < 60:
        return 0.0
    elif humidity < 70:
        return 30.0
    elif humidity < 80:
        return 60.0
    else:
        return 100.0


def _temp_score(temp_c: int) -> float:
    """Score de risque basé sur la température (°C)."""
    if temp_c < 25:
        return 0.0
    elif temp_c < 30:
        return 30.0
    elif temp_c < 35:
        return 60.0
    else:
        return 100.0


def get_weather(region: str) -> WeatherResult:
    """
    Récupère les données météo pour une région et calcule le score de risque.

    Args:
        region: Région de production (ex: "Kaolack")

    Returns:
        WeatherResult avec données météo et score de risque.
        En cas d'erreur API, retourne un score de 50 (incertitude).
    """
    city = REGION_TO_CITY.get(region, region)
    url  = f"{settings.weather_api_url}/{city}?format=j1"

    try:
        response = requests.get(url, timeout=settings.weather_timeout)
        response.raise_for_status()
        data    = response.json()
        current = data["current_condition"][0]

        humidity     = int(current["humidity"])
        temp_c       = int(current["temp_C"])
        precip_mm    = float(current.get("precipMM", 0))
        weather_desc = current.get("weatherDesc", [{}])[0].get("value", "N/A")

        h_score = _humidity_score(humidity)
        t_score = _temp_score(temp_c)
        score   = round(0.6 * h_score + 0.4 * t_score, 1)

        logger.info(
            f"✓ Météo {city} | humidity={humidity}% temp={temp_c}°C | score={score}"
        )
        return WeatherResult(
            city=city,
            humidity=humidity,
            temp_c=temp_c,
            precip_mm=precip_mm,
            weather_desc=weather_desc,
            humidity_score=h_score,
            temp_score=t_score,
            score=score,
        )

    except Exception as e:
        logger.warning(f"Météo indisponible pour {city} : {e} — score par défaut 50")
        return WeatherResult(
            city=city,
            humidity=70,
            temp_c=30,
            precip_mm=0.0,
            weather_desc="Indisponible",
            humidity_score=30.0,
            temp_score=30.0,
            score=50.0,
        )
