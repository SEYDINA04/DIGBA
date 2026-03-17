"""
DIGBA — Moteur de scoring
Combine les 4 sous-scores en un score de risque final 0–100%.
"""
import logging
from backend.config.settings import settings
from backend.models.schemas import (
    NdviResult, WeatherResult, RasffResult, OperatorResult,
    ScoreResponse, ScoreDetails,
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
    ndvi:     NdviResult,
    weather:  WeatherResult,
    rasff:    RasffResult,
    operator: OperatorResult,
) -> ScoreResponse:
    """
    Calcule le score de risque final DIGBA.

    Formule :
        score = 0.35×ndvi + 0.25×weather + 0.25×rasff + 0.15×operator

    Pondérations depuis settings (calibrables empiriquement après pilotes).

    Args:
        ndvi, weather, rasff, operator : résultats des 4 pipelines

    Returns:
        ScoreResponse avec score final, niveau de risque et décision.
    """
    raw_score = (
        settings.weight_ndvi     * ndvi.score
        + settings.weight_weather  * weather.score
        + settings.weight_rasff    * rasff.score
        + settings.weight_operator * operator.score
    )

    score = round(min(max(raw_score, 0.0), 100.0), 1)
    niveau, decision = _niveau_risque(score)

    logger.info(
        f"Score DIGBA : {score:.1f}% ({niveau}) | "
        f"ndvi={ndvi.score} weather={weather.score} "
        f"rasff={rasff.score} operator={operator.score}"
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
        ),
    )
