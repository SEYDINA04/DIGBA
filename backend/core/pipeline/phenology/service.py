"""
DIGBA — Pipeline Phénologique (Phase 4)
========================================
Détermine le stade de croissance courant d'une culture selon son calendrier
cultural (pays × mois) et retourne un score de risque phénologique.

Pourquoi la phénologie est-elle critique pour la sécurité alimentaire ?

Les mycotoxines (aflatoxines, ochratoxines, fumonisines) ne se développent
pas uniformément au cours du cycle cultural. Elles se concentrent sur des
fenêtres précises :

  1. FLORAISON (flowering) : Aspergillus flavus infecte la fleur avant que
     la cosse se ferme. La chaleur + stress hydrique à ce stade = aflatoxine
     dans la graine (arachide, mais). Risque max sur cultures sèches.

  2. REMPLISSAGE GRAINS (grain_fill) : Accumulation des mycotoxines dans
     le grain en développement. Critique pour arachide, sorgho, mil.

  3. RÉCOLTE (harvest) : Manipulation mécanique, blessures sur les grains,
     contact avec le sol humide = contamination fongique en quelques heures.

  4. SÉCHAGE POST-RÉCOLTE (post_harvest_drying) : Étape la plus critique.
     Un séchage insuffisant (humidité > 14%) déclenche la sporulation
     fongique en 48-72h. C'est la cause n°1 de contamination en Afrique de
     l'Ouest (source : FAO/IFAD Aflatoxin Learning Programme 2020).

Le score phénologique n'est pas un indicateur de stock — il indique si
la période actuelle est intrinsèquement risquée pour cette culture.

Usage :
    from backend.core.pipeline.phenology.service import compute_phenology
    result = compute_phenology(produit="arachide", country="SN", month=10)
    # → PhenologyResult(stade="harvest", score=70.0, label="Récolte — manipulation critique")
"""
import json
import logging
import datetime
from pathlib import Path

from backend.models.schemas import PhenologyResult

log = logging.getLogger(__name__)

# ── Chargement du calendrier cultural ────────────────────────────────────────
_CALENDAR_PATH = Path(__file__).parent / "crop_calendar.json"

def _load_calendar() -> dict:
    with open(_CALENDAR_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

_CALENDAR: dict = _load_calendar()
_STAGES:   dict = _CALENDAR["_meta"]["stades"]


def compute_phenology(
    produit : str,
    country : str,
    month   : int | None = None,
) -> PhenologyResult:
    """
    Calcule le score de risque phénologique pour une culture × pays × mois.

    Args:
        produit : Culture (ex: "arachide", "noix_de_cajou")
        country : Code pays ISO-2 (ex: "SN", "GH", "CI", "NG")
        month   : Mois 1-12. Si None → mois courant.

    Returns:
        PhenologyResult avec stade, score et label.
    """
    if month is None:
        month = datetime.datetime.now().month

    country = country.upper()

    # ── Chercher le calendrier pour cette culture × pays ─────────────────────
    crop_data = _CALENDAR.get(produit)
    if not crop_data:
        log.warning(f"[phenologie] Culture '{produit}' absente du calendrier")
        return _fallback(produit, country, month, "Culture non répertoriée")

    country_data = crop_data.get(country)
    if not country_data:
        # Essayer avec le pays par défaut SN si non trouvé
        log.warning(f"[phenologie] Pays '{country}' absent pour '{produit}' — fallback SN")
        country_data = crop_data.get("SN")
        if not country_data:
            return _fallback(produit, country, month, "Pays non répertorié")
        country = "SN"

    # ── Stade du mois courant ─────────────────────────────────────────────────
    stade_key = country_data.get(str(month))
    if not stade_key:
        log.warning(f"[phenologie] Mois {month} absent pour {produit}/{country}")
        return _fallback(produit, country, month, "Mois non répertorié")

    stade_info = _STAGES.get(stade_key, {})
    score      = float(stade_info.get("score", 35))
    label      = stade_info.get("label", stade_key)
    emoji      = stade_info.get("emoji", "⚪")
    zone       = country_data.get("zone", "Zone inconnue")

    log.info(
        f"[phenologie] {produit}/{country} | mois={month} | "
        f"stade={stade_key} | score={score} | {label}"
    )

    return PhenologyResult(
        stade=stade_key,
        score=score,
        label=label,
        emoji=emoji,
        country=country,
        produit=produit,
        month=month,
        zone=zone,
        available=True,
    )


def _fallback(produit: str, country: str, month: int, reason: str) -> PhenologyResult:
    """Retourne un score neutre quand les données sont indisponibles."""
    return PhenologyResult(
        stade="off_season",
        score=35.0,
        label=f"Données phénologiques indisponibles ({reason})",
        emoji="⚪",
        country=country,
        produit=produit,
        month=month,
        zone="Inconnue",
        available=False,
    )
