"""
DIGBA — Moteur de scoring
Combine les 5 sous-scores en un score de risque final 0–100%.

Pondérations (Phase 4) :
    0.30 × NDVI        (satellite + anomalie historique)
    0.20 × Weather     (météo courant)
    0.25 × RASFF       (historique rejets douaniers)
    0.15 × Operator    (stockage + certifications)
    0.10 × Phenology   (stade cultural courant)
    ─────
    1.00
"""
import logging
from backend.config.settings import settings
from backend.models.schemas import (
    NdviResult, WeatherResult, RasffResult, OperatorResult,
    PhenologyResult, ScoreResponse, ScoreDetails,
)

logger = logging.getLogger(__name__)


def _niveau_risque(score: float) -> tuple[str, str]:
    """Retourne (niveau_risque, decision) selon le score."""
    if score <= settings.score_low_max:
        return (
            "Faible",
            "Achat recommandé — vérifications standard + certificat phytosanitaire.",
        )
    elif score <= settings.score_medium_max:
        return (
            "Modéré",
            "Achat conditionnel — test terrain obligatoire avant engagement financier.",
        )
    else:
        return (
            "Élevé",
            "Rejeter ou renégocier — intégrer le coût du risque ou refuser le lot.",
        )


def compute_score(
    ndvi:      NdviResult,
    weather:   WeatherResult,
    rasff:     RasffResult,
    operator:  OperatorResult,
    phenology: PhenologyResult | None = None,
) -> ScoreResponse:
    """
    Calcule le score de risque final DIGBA.

    Formule (Phase 4) :
        score = 0.30×ndvi + 0.20×weather + 0.25×rasff + 0.15×operator + 0.10×phenology

    Si phenology est None (non fourni), on redistribue son poids sur ndvi :
        score = 0.35×ndvi + 0.20×weather + 0.25×rasff + 0.15×operator + 0.05 bonus neutre

    Args:
        ndvi, weather, rasff, operator : résultats des 4 pipelines existants
        phenology : résultat du pipeline phénologique (optionnel)

    Returns:
        ScoreResponse avec score final, niveau de risque et décision.
    """
    if phenology is not None:
        # Formule complète Phase 4 — 5 composantes
        raw_score = (
            0.30 * ndvi.score
            + 0.20 * weather.score
            + 0.25 * rasff.score
            + 0.15 * operator.score
            + 0.10 * phenology.score
        )
        pheno_info = f"phenology={phenology.score}({phenology.stade})"
    else:
        # Formule legacy — 4 composantes (poids settings)
        raw_score = (
            settings.weight_ndvi     * ndvi.score
            + settings.weight_weather  * weather.score
            + settings.weight_rasff    * rasff.score
            + settings.weight_operator * operator.score
        )
        pheno_info = "phenology=N/A"

    score = round(min(max(raw_score, 0.0), 100.0), 1)
    niveau, decision = _niveau_risque(score)

    logger.info(
        f"Score DIGBA : {score:.1f}% ({niveau}) | "
        f"ndvi={ndvi.score} weather={weather.score} "
        f"rasff={rasff.score} operator={operator.score} {pheno_info}"
    )

    return ScoreResponse(
        score=score,
        niveau_risque=niveau,
        decision=decision,
        details=ScoreDetails(
            ndvi=ndvi,
            weather=weather,
            rasff=rasff,
            operator=operator,
            phenology=phenology,
        ),
    )
