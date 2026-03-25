"""
DIGBA — Pipeline RASFF (lookup DB + scoring Random Forest)
===========================================================
Ce service remplace l'ancien scoring rule-based (_rasff_score basé sur des
seuils fixes) par une prédiction ML via le modèle Random Forest entraîné sur
493 rejets RASFF réels (Sénégal, Ghana, Côte d'Ivoire, Nigeria).

Architecture hybride (DB + ML) :
  ┌─────────────────────────────────────────────────────┐
  │  1. LOOKUP DB (inchangé)                            │
  │     → nb_rejets fournisseur / région (24 mois)      │
  │     → blacklist fournisseur (12 mois)               │
  │     → derniers dangers détectés                     │
  │                                                     │
  │  2. SCORING ML (nouveau — remplace _rasff_score)    │
  │     → extrait hazard_hint depuis derniers_dangers   │
  │     → appelle ml/service.predict_rasff_risk()       │
  │     → fallback automatique si modèle indisponible   │
  │                                                     │
  │  3. OVERRIDE BLACKLIST                              │
  │     → si fournisseur blacklisté → score = 95        │
  └─────────────────────────────────────────────────────┘

Justification du choix hybride :
  - Le lookup DB reste nécessaire pour les métadonnées (derniers dangers,
    nb rejets) affichées dans l'interface
  - Le ML remplace uniquement le calcul du score numérique
  - La blacklist reste une règle fixe car c'est une décision binaire critique
    (fournisseur rejeté < 12 mois = risque maximal quelles que soient les features)
"""

import logging
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from backend.models.rasff import RasffRejet
from backend.models.schemas import RasffResult
from backend.ml.service import predict_rasff_risk

logger = logging.getLogger(__name__)

_BLACKLIST_MONTHS = 12   # Fenêtre blacklist fournisseur (mois)
_LOOKBACK_MONTHS  = 24   # Fenêtre lookback rejets (mois)
_BLACKLIST_SCORE  = 95.0 # Score fixe si fournisseur blacklisté


def _extract_hazard_hint(derniers_dangers: list[str]) -> str:
    """
    Déduit la famille de danger principale depuis la liste des derniers dangers
    détectés (récupérés depuis la base RASFF).

    Utilisé comme feature `hazard_hint` pour le modèle ML, permettant de
    personnaliser la prédiction selon le profil de contamination historique
    du fournisseur / de la région.

    Args:
        derniers_dangers: Liste de noms de dangers (ex: ["Aflatoxine B1", "Salmonella"])

    Returns:
        Famille de danger : "mycotoxin" | "pathogen" | "heavy_metal" |
                            "pesticide" | "contaminant" | "unknown"
    """
    if not derniers_dangers:
        return "unknown"

    # Priorité : mycotoxines (risque #1 pour noix/céréales en Afrique Ouest)
    PRIORITY_KEYWORDS: list[tuple[str, str]] = [
        ("aflatoxin",     "mycotoxin"),
        ("mycotoxin",     "mycotoxin"),
        ("ochratoxin",    "mycotoxin"),
        ("fumonisin",     "mycotoxin"),
        ("deoxynivalenol","mycotoxin"),
        ("salmonella",    "pathogen"),
        ("listeria",      "pathogen"),
        ("e. coli",       "pathogen"),
        ("cadmium",       "heavy_metal"),
        ("lead",          "heavy_metal"),
        ("mercury",       "heavy_metal"),
        ("arsenic",       "heavy_metal"),
        ("pesticide",     "pesticide"),
        ("chlorpyrifos",  "pesticide"),
        ("sudan",         "contaminant"),
        ("dye",           "contaminant"),
    ]

    combined = " ".join(d.lower() for d in derniers_dangers)
    for keyword, family in PRIORITY_KEYWORDS:
        if keyword in combined:
            return family

    return "unknown"


def lookup_rasff(
    fournisseur: str,
    region:      str,
    produit:     str,
    country:     str,
    stockage:    str,
    certifications: list[str],
    db:          Session,
) -> RasffResult:
    """
    Calcule le sous-score RASFF d'un lot via lookup DB + prédiction ML.

    Étapes :
      1. Requêtes SQLAlchemy sur la base RASFF pour extraire les métriques
         historiques (rejets 24 mois, blacklist, derniers dangers)
      2. Extraction de la famille de danger dominante (hazard_hint)
      3. Prédiction ML du score de risque via Random Forest
      4. Override si fournisseur blacklisté (score = 95, prioritaire)

    Args:
        fournisseur:    Nom de l'exportateur (utilisé pour le lookup DB)
        region:         Région de production (lookup DB + feature pays)
        produit:        Type de produit (feature ML)
        country:        Code pays ISO-2 (feature ML)
        stockage:       Mode de stockage (feature ML)
        certifications: Labels qualité déclarés (feature ML)
        db:             Session SQLAlchemy

    Returns:
        RasffResult avec nb_rejets, blacklist, derniers_dangers et score ML.
    """
    today      = date.today()
    cutoff_24m = today - timedelta(days=_LOOKBACK_MONTHS * 30)
    cutoff_12m = today - timedelta(days=_BLACKLIST_MONTHS * 30)

    # ── Normalisation du produit pour la recherche DB ─────────────────────────
    produit_db = produit.replace("_", " ").title()

    # ── Filtre de base (produit + 24 derniers mois) ───────────────────────────
    base_filter = and_(
        RasffRejet.date >= cutoff_24m,
        RasffRejet.produit.ilike(f"%{produit_db}%"),
    )

    # ── 1. Nb rejets fournisseur (24 mois) ────────────────────────────────────
    nb_fournisseur = db.query(func.count(RasffRejet.id)).filter(
        base_filter,
        RasffRejet.fournisseur.ilike(f"%{fournisseur}%"),
    ).scalar() or 0

    # ── 2. Nb rejets région (24 mois) ─────────────────────────────────────────
    nb_region = db.query(func.count(RasffRejet.id)).filter(
        base_filter,
        RasffRejet.region_senegal.ilike(f"%{region}%"),
    ).scalar() or 0

    # ── 3. Blacklist fournisseur (12 mois) ────────────────────────────────────
    blackliste = db.query(func.count(RasffRejet.id)).filter(
        RasffRejet.date >= cutoff_12m,
        RasffRejet.fournisseur.ilike(f"%{fournisseur}%"),
    ).scalar() > 0

    # ── 4. Derniers dangers détectés ─────────────────────────────────────────
    derniers = db.query(RasffRejet.danger).filter(
        base_filter,
        or_(
            RasffRejet.fournisseur.ilike(f"%{fournisseur}%"),
            RasffRejet.region_senegal.ilike(f"%{region}%"),
        ),
    ).order_by(RasffRejet.date.desc()).limit(5).all()

    derniers_dangers = list({row.danger for row in derniers})

    # ── 5. Extraction du hazard_hint pour le ML ───────────────────────────────
    hazard_hint = _extract_hazard_hint(derniers_dangers)

    # ── 6. Scoring ML (remplace _rasff_score rule-based) ─────────────────────
    ml_score, ml_used = predict_rasff_risk(
        produit=produit,
        country=country,
        stockage=stockage,
        certifications=certifications,
        hazard_hint=hazard_hint,
    )

    # ── 7. Override blacklist (règle critique conservée) ─────────────────────
    # Justification : un fournisseur rejeté en moins de 12 mois représente
    # un risque maximal documenté → le ML ne peut pas contredire ce fait réel.
    if blackliste:
        final_score = _BLACKLIST_SCORE
        logger.info(
            f"🚨 RASFF blacklist override | fournisseur={fournisseur} "
            f"→ score forcé à {_BLACKLIST_SCORE}"
        )
    else:
        final_score = ml_score

    logger.info(
        f"✓ RASFF | fournisseur={fournisseur} rejets_fourn={nb_fournisseur} "
        f"region={region} rejets_region={nb_region} blackliste={blackliste} "
        f"hazard={hazard_hint} ml={ml_used} score={final_score}"
    )

    return RasffResult(
        nb_rejets_24m=nb_fournisseur,
        nb_rejets_region=nb_region,
        blackliste=blackliste,
        derniers_dangers=derniers_dangers,
        score=final_score,
    )
