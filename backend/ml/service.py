"""
DIGBA — Service d'inférence ML (Random Forest)
===============================================
Ce module expose une unique fonction `predict_rasff_risk()` appelée par le
pipeline RASFF pour remplacer le scoring rule-based par une prédiction ML.

Architecture :
  - Le modèle est chargé UNE FOIS en mémoire au premier appel (_load_model)
  - Chaque prédiction est instantanée (< 1 ms)
  - Si le modèle n'est pas disponible → fallback automatique sur les règles fixes
    (aucune interruption de service)

Intégration dans le pipeline :
    rasff/service.py → ml/service.py → model.pkl
                    ↘ fallback → _rasff_score() rules
"""

import json
import logging
import pickle
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

ML_DIR     = Path(__file__).parent
MODEL_PATH = ML_DIR / "model.pkl"
META_PATH  = ML_DIR / "metadata.json"

# ── Cache du modèle (singleton chargé une fois) ───────────────────────────────
_model      = None   # RandomForestRegressor chargé depuis model.pkl
_model_ok   = False  # True si le modèle est disponible et opérationnel
_model_meta: dict = {}


def _load_model() -> bool:
    """
    Charge le modèle depuis model.pkl (une seule fois, résultat mis en cache).

    Returns:
        True si le modèle est chargé avec succès, False sinon.
    """
    global _model, _model_ok, _model_meta

    if _model_ok:
        return True  # déjà chargé

    if not MODEL_PATH.exists():
        logger.warning(
            "⚠️  model.pkl introuvable — scoring ML indisponible. "
            "Fallback sur règles fixes activé."
        )
        return False

    try:
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        _model_ok = True

        # Charger les métadonnées si disponibles
        if META_PATH.exists():
            with open(META_PATH, encoding="utf-8") as f:
                _model_meta = json.load(f)
            logger.info(
                f"🤖 Modèle ML chargé | "
                f"entraîné le {_model_meta.get('trained_at', 'N/A')} | "
                f"MAE test = {_model_meta.get('metrics', {}).get('mae_test', 'N/A')} pts | "
                f"R² = {_model_meta.get('metrics', {}).get('r2_test', 'N/A')}"
            )
        else:
            logger.info("🤖 Modèle ML chargé (sans métadonnées)")

        return True

    except Exception as e:
        logger.error(f"❌ Erreur chargement modèle ML : {e}", exc_info=True)
        _model_ok = False
        return False


def predict_rasff_risk(
    produit:        str,
    country:        str,
    stockage:       str,
    certifications: list[str],
    hazard_hint:    str = "unknown",
    month:          Optional[int] = None,
) -> tuple[float, bool]:
    """
    Prédit le score de risque RASFF pour un lot via le modèle Random Forest.

    Le mois est automatiquement déterminé depuis la date actuelle si non fourni,
    ce qui capture la saisonnalité des mycotoxines (aflatoxines plus élevées
    en saison humide : avril–octobre en Afrique de l'Ouest).

    Args:
        produit:        Type de produit (enum Produit, ex: "noix_de_cajou")
        country:        Code pays ISO-2 (ex: "SN", "GH", "CI", "NG")
        stockage:       Mode de stockage (ex: "silo_ventile", "hangar", "plein_air")
        certifications: Liste des certifications déclarées (ex: ["GlobalG.A.P."])
        hazard_hint:    Famille de danger connue depuis l'historique RASFF du fournisseur.
                        Transmis par rasff/service.py après le lookup DB.
                        Exemples : "mycotoxin", "pathogen", "heavy_metal", "unknown"
        month:          Mois (1–12). Si None, utilise le mois courant.

    Returns:
        (score, ml_used):
            score   — float 0–100 (ML si disponible, règle fixe sinon)
            ml_used — True si prédiction ML, False si fallback règle fixe
    """
    if not _load_model():
        return _fallback_score(produit, country, certifications), False

    if month is None:
        month = datetime.now().month

    # Encoder les features
    try:
        from backend.ml.features import encode_input
        features = encode_input(
            produit=produit,
            country=country,
            month=month,
            stockage=stockage,
            certifications=certifications,
            hazard_hint=hazard_hint,
        )
    except Exception as e:
        logger.error(f"❌ Erreur encodage features ML : {e}")
        return _fallback_score(produit, country, certifications), False

    # Prédiction 100% ML
    # NOTE : en cas d'erreur de prédiction, l'exception remonte au pipeline
    # Pour réactiver le fallback : wrapper ce bloc dans un try/except
    #   et retourner _fallback_score(produit, country, certifications), False
    raw_pred = float(_model.predict([features])[0])
    # Clamp entre 0 et 100 pour sécurité
    score = round(min(max(raw_pred, 0.0), 100.0), 1)

    logger.debug(
        f"🤖 ML predict | produit={produit} country={country} "
        f"month={month} stockage={stockage} certs={certifications} "
        f"hazard={hazard_hint} → score={score}"
    )
    return score, True


def _fallback_score(
    produit: str,
    country: str,
    certifications: list[str],
) -> float:
    """
    Score de fallback basé sur des règles simples quand le modèle ML est
    indisponible. Assure la continuité du service.

    Règle : risque de base par pays (historique RASFF) + réduction certifications.
    """
    # Risque de base par pays selon fréquence historique RASFF
    base: dict[str, float] = {"NG": 65.0, "GH": 50.0, "CI": 40.0, "SN": 35.0}
    score = base.get(country.upper(), 45.0)

    # Réduction si certifié
    if certifications:
        score = max(score - 15.0, 5.0)

    logger.info(f"⚠️  Fallback rule-based | country={country} score={score}")
    return score


def get_model_info() -> dict:
    """
    Retourne les informations sur le modèle chargé.
    Utilisé par le endpoint /health pour exposer le statut ML.
    """
    _load_model()
    return {
        "ml_available":  _model_ok,
        "model_path":    str(MODEL_PATH),
        "trained_at":    _model_meta.get("trained_at"),
        "n_samples":     _model_meta.get("n_samples_total"),
        "mae_test":      _model_meta.get("metrics", {}).get("mae_test"),
        "r2_test":       _model_meta.get("metrics", {}).get("r2_test"),
        "feature_importances": _model_meta.get("feature_importances"),
    }
