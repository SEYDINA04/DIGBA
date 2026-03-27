"""
DIGBA — Pipeline Opérateur (formulaire terrain)
"""
import logging
from backend.models.schemas import ScoreRequest, OperatorResult

logger = logging.getLogger(__name__)

# Score de base par mode de stockage
_STOCKAGE_SCORE: dict[str, float] = {
    "silo_ventile": 10.0,
    "hangar":       40.0,
    "plein_air":    80.0,
}

# Réduction par certification (cumulable, plancher 0)
_CERTIFICATION_REDUCTION: dict[str, float] = {
    "GlobalG.A.P.": 20.0,
    "HACCP":        15.0,
    "ISO22000":     20.0,
    "GlobalGAP":    20.0,
    "BRC":          15.0,
    "IFS":          10.0,
}


def process_operator(form: ScoreRequest) -> OperatorResult:
    """
    Calcule le score opérateur à partir des champs du formulaire terrain.

    Facteurs pris en compte :
    - Mode de stockage (principal risque post-récolte)
    - Certifications qualité (réduisent le score)

    Args:
        form: ScoreRequest validé

    Returns:
        OperatorResult avec score et détail des facteurs.
    """
    facteurs: dict[str, str] = {}

    # Score de base : stockage (Stockage enum ou str)
    stockage_val = form.stockage.value if hasattr(form.stockage, "value") else str(form.stockage)
    score = _STOCKAGE_SCORE.get(stockage_val, 50.0)
    facteurs["stockage"] = (
        f"[EN] {stockage_val} → base score {score:.0f}/100"
        f" || [FR] {stockage_val} → score de base {score:.0f}/100"
    )

    # Réductions certifications
    total_reduction = 0.0
    certs_reconnues = []
    for cert in form.certifications:
        reduction = _CERTIFICATION_REDUCTION.get(cert, 0.0)
        if reduction > 0:
            total_reduction += reduction
            certs_reconnues.append(cert)

    if total_reduction > 0:
        score = max(0.0, score - total_reduction)
        certs_str = ', '.join(certs_reconnues)
        facteurs["certifications"] = (
            f"[EN] {certs_str} → -{total_reduction:.0f} pts reduction"
            f" || [FR] {certs_str} → réduction -{total_reduction:.0f} pts"
        )
    else:
        facteurs["certifications"] = (
            "[EN] No recognised certification || [FR] Aucune certification reconnue"
        )

    score = round(score, 1)
    logger.info(
        f"✓ Opérateur | stockage={stockage_val} "
        f"certs={form.certifications} score={score}"
    )

    return OperatorResult(
        stockage=stockage_val,
        certifications=form.certifications,
        score=score,
        facteurs=facteurs,
    )
