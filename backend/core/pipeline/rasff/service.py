"""
DIGBA — Pipeline RASFF (lookup historique rejets EU)
"""
import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from backend.models.rasff import RasffRejet
from backend.models.schemas import RasffResult

logger = logging.getLogger(__name__)

_BLACKLIST_MONTHS = 12
_LOOKBACK_MONTHS  = 24


def _rasff_score(nb_rejets: int, blackliste: bool) -> float:
    """Convertit le nombre de rejets en score de risque 0–100."""
    if blackliste:
        return 95.0
    if nb_rejets == 0:
        return 0.0
    elif nb_rejets <= 2:
        return 40.0
    elif nb_rejets <= 5:
        return 70.0
    else:
        return 90.0


def lookup_rasff(
    fournisseur: str,
    region: str,
    produit: str,
    db: Session,
) -> RasffResult:
    """
    Recherche l'historique de rejets EU pour un fournisseur/région/produit.

    Args:
        fournisseur: Nom de l'exportateur
        region:      Région de production au Sénégal
        produit:     Type de produit (ex: "Noix de cajou")
        db:          Session SQLAlchemy

    Returns:
        RasffResult avec comptages, blacklist et score.
    """
    today          = date.today()
    cutoff_24m     = today - timedelta(days=_LOOKBACK_MONTHS * 30)
    cutoff_12m     = today - timedelta(days=_BLACKLIST_MONTHS * 30)

    # Normalisation du produit pour la recherche
    produit_db = produit.replace("_", " ").replace("noix de cajou", "Noix de cajou")
    if "cajou" in produit.lower():
        produit_db = "Noix de cajou"

    # Filtre de base : même produit, 24 derniers mois
    base_filter = and_(
        RasffRejet.date >= cutoff_24m,
        RasffRejet.produit.ilike(f"%cajou%") if "cajou" in produit.lower()
        else RasffRejet.produit.ilike(f"%{produit_db}%"),
    )

    # Nb rejets fournisseur (24 mois)
    nb_fournisseur = db.query(func.count(RasffRejet.id)).filter(
        base_filter,
        RasffRejet.fournisseur.ilike(f"%{fournisseur}%"),
    ).scalar() or 0

    # Nb rejets région (24 mois)
    nb_region = db.query(func.count(RasffRejet.id)).filter(
        base_filter,
        RasffRejet.region_senegal.ilike(f"%{region}%"),
    ).scalar() or 0

    # Blacklist : rejet fournisseur < 12 mois
    blackliste = db.query(func.count(RasffRejet.id)).filter(
        RasffRejet.date >= cutoff_12m,
        RasffRejet.fournisseur.ilike(f"%{fournisseur}%"),
    ).scalar() > 0

    # Derniers dangers détectés (région, 24 mois)
    derniers = db.query(RasffRejet.danger).filter(
        base_filter,
        or_(
            RasffRejet.fournisseur.ilike(f"%{fournisseur}%"),
            RasffRejet.region_senegal.ilike(f"%{region}%"),
        ),
    ).order_by(RasffRejet.date.desc()).limit(5).all()

    derniers_dangers = list({row.danger for row in derniers})

    # Score final basé sur fournisseur (prioritaire) + région
    nb_total = nb_fournisseur if nb_fournisseur > 0 else nb_region
    score    = _rasff_score(nb_total, blackliste)

    logger.info(
        f"✓ RASFF | fournisseur={fournisseur} rejets={nb_fournisseur} "
        f"region={region} rejets={nb_region} blackliste={blackliste} score={score}"
    )

    return RasffResult(
        nb_rejets_24m=nb_fournisseur,
        nb_rejets_region=nb_region,
        blackliste=blackliste,
        derniers_dangers=derniers_dangers,
        score=score,
    )
