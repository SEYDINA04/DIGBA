"""
DIGBA — Génération de la climatologie météo ERA5 (Open-Meteo Archive)
======================================================================
Script one-shot à relancer une fois par an maximum.

Pour chaque région DIGBA (20 régions × 4 pays) :
  1. Télécharge les données ERA5 journalières 2003–2023 (Open-Meteo Archive API)
  2. Agrège par mois → mu + sigma pour température, précipitation, humidité
  3. Sauvegarde dans weather_climatology.json

Usage :
    cd /home/seydina/DIGBA
    uv run python3 backend/core/pipeline/weather/generate_weather_climatology.py

Sortie :
    backend/core/pipeline/weather/weather_climatology.json

Source ERA5 :
    ECMWF ERA5 reanalysis via Open-Meteo Archive API (gratuit, sans authentification)
    Résolution : ~9km | Période : 1940–présent | MAJ : quotidienne (~5j de lag)
"""
import json
import logging
import time
from collections import defaultdict
from pathlib import Path

import requests

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
ARCHIVE_URL   = "https://archive-api.open-meteo.com/v1/archive"
START_DATE    = "2003-01-01"
END_DATE      = "2023-12-31"
OUTPUT_PATH   = Path(__file__).parent / "weather_climatology.json"
PAUSE_BETWEEN = 8.0  # secondes entre requêtes (Open-Meteo archive: ~8 req/min)

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


def fetch_era5(region: str, lat: float, lon: float) -> dict | None:
    """
    Télécharge 20 ans de données ERA5 journalières pour une région.

    Paramètres ERA5 récupérés :
      temperature_2m_mean   — température moyenne journalière (°C)
      precipitation_sum     — cumul précipitation journalier (mm)
      relative_humidity_2m_mean — humidité relative moyenne (%)

    Retourne un dict {mois: {temp: [...], precip: [...], humidity: [...]}}
    ou None si l'API échoue.
    """
    try:
        resp = requests.get(
            ARCHIVE_URL,
            params={
                "latitude":   lat,
                "longitude":  lon,
                "start_date": START_DATE,
                "end_date":   END_DATE,
                "daily": "temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean",
                "timezone":   "auto",
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()

        dates    = data["daily"]["time"]
        temps    = data["daily"]["temperature_2m_mean"]
        precips  = data["daily"]["precipitation_sum"]
        humids   = data["daily"]["relative_humidity_2m_mean"]

        # Agréger par mois (1–12)
        by_month: dict[int, dict[str, list]] = {
            m: {"temp": [], "precip": [], "humidity": []}
            for m in range(1, 13)
        }

        for date_str, t, p, h in zip(dates, temps, precips, humids):
            month = int(date_str[5:7])
            if t is not None:   by_month[month]["temp"].append(t)
            if p is not None:   by_month[month]["precip"].append(p)
            if h is not None:   by_month[month]["humidity"].append(h)

        log.info(
            f"  {region}: {len(dates)} jours chargés "
            f"({START_DATE[:4]}–{END_DATE[:4]})"
        )
        return by_month

    except Exception as exc:
        log.error(f"  {region}: ERREUR API — {exc}")
        return None


def compute_stats(values: list[float]) -> tuple[float, float]:
    """Calcule mu et sigma d'une liste de valeurs journalières."""
    if not values:
        return 0.0, 1.0
    n   = len(values)
    mu  = sum(values) / n
    var = sum((x - mu) ** 2 for x in values) / n
    sigma = var ** 0.5
    return round(mu, 2), round(max(sigma, 0.01), 2)  # sigma min 0.01 évite div/0


def main():
    log.info("=== DIGBA — Génération climatologie météo ERA5 ===")
    log.info(f"Période : {START_DATE} → {END_DATE}")
    log.info(f"Régions : {len(REGION_COORDS)}")
    log.info(f"Sortie  : {OUTPUT_PATH}\n")

    climatology: dict[str, dict] = {}
    errors: list[str] = []

    for i, (region, (lat, lon)) in enumerate(REGION_COORDS.items(), 1):
        log.info(f"[{i:02d}/{len(REGION_COORDS)}] {region} ({lat:.4f}, {lon:.4f})")

        by_month = fetch_era5(region, lat, lon)
        if by_month is None:
            errors.append(region)
            continue

        climatology[region] = {}
        for month, vals in by_month.items():
            mu_t,  sig_t  = compute_stats(vals["temp"])
            mu_p,  sig_p  = compute_stats(vals["precip"])
            mu_h,  sig_h  = compute_stats(vals["humidity"])

            # Précip mensuelle = somme des moyennes journalières × ~30 jours
            # (approximation — on stocke la moyenne journalière pour cohérence
            #  avec les données instantanées de l'API forecast)
            climatology[region][str(month)] = {
                "temp_mu":       mu_t,
                "temp_sigma":    sig_t,
                "precip_mu":     mu_p,     # mm/jour
                "precip_sigma":  sig_p,
                "humidity_mu":   mu_h,
                "humidity_sigma": sig_h,
                "n_days":        len(vals["temp"]),
            }

        # Pause pour respecter le rate limit Open-Meteo (~10 req/min sur free tier)
        if i < len(REGION_COORDS):
            time.sleep(PAUSE_BETWEEN)

    # Sauvegarde JSON
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(climatology, f, indent=2, ensure_ascii=False)

    log.info(f"\n✅ Climatologie sauvegardée → {OUTPUT_PATH}")
    log.info(f"   {len(climatology)} régions | {len(errors)} erreurs")
    if errors:
        log.warning(f"   Régions en erreur : {errors}")

    # Aperçu rapide
    log.info("\n=== Aperçu — Kaolack mars ===")
    if "Kaolack" in climatology:
        m = climatology["Kaolack"]["3"]
        log.info(f"  Temp    : {m['temp_mu']}°C ± {m['temp_sigma']}")
        log.info(f"  Précip  : {m['precip_mu']} mm/j ± {m['precip_sigma']}")
        log.info(f"  Humidité: {m['humidity_mu']}% ± {m['humidity_sigma']}")
        log.info(f"  N jours : {m['n_days']}")


if __name__ == "__main__":
    main()
