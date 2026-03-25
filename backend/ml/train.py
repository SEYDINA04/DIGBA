"""
DIGBA — Entraînement du modèle Random Forest
=============================================
Script exécuté UNE FOIS au démarrage de l'API (ou manuellement) pour
entraîner et sauvegarder le modèle ML de scoring RASFF.

Pourquoi Random Forest ?
  → Robuste sur petits datasets (< 1000 lignes)
  → Interprétable via feature_importances_
  → Pas de normalisation requise (contrairement à SVM/NN)
  → Résistant au surapprentissage grâce à l'averaging des arbres
  → Voir justification complète dans backend/ml/features.py

Utilisation :
    python -m backend.ml.train          # entraînement complet
    uv run python -m backend.ml.train   # dans l'environnement uv

Sorties (dans backend/ml/) :
    model.pkl           — modèle Random Forest sérialisé
    metadata.json       — métriques, feature importances, date d'entraînement
"""

import json
import logging
import pickle
import random
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

ML_DIR     = Path(__file__).parent
MODEL_PATH = ML_DIR / "model.pkl"
META_PATH  = ML_DIR / "metadata.json"


def _train_test_split(
    X: list[list[float]],
    y: list[float],
    test_ratio: float = 0.2,
    seed: int = 42,
) -> tuple[list, list, list, list]:
    """
    Découpe X, y en train/test de façon stratifiée (80/20 par défaut).

    Justification du 80/20 vs cross-validation :
      Avec ~500 lignes, le 80/20 offre suffisamment de données d'entraînement
      (400 lignes) et un test set représentatif (100 lignes).
      La cross-validation K-fold sera ajoutée en V2 quand le dataset sera plus grand.
    """
    rng     = random.Random(seed)
    indices = list(range(len(X)))
    rng.shuffle(indices)
    split   = int(len(indices) * (1 - test_ratio))
    train_i = indices[:split]
    test_i  = indices[split:]

    X_train = [X[i] for i in train_i]
    y_train = [y[i] for i in train_i]
    X_test  = [X[i] for i in test_i]
    y_test  = [y[i] for i in test_i]

    return X_train, X_test, y_train, y_test


def _mean_absolute_error(y_true: list[float], y_pred: list[float]) -> float:
    """MAE manuel (pas de numpy requis ici)."""
    return sum(abs(a - b) for a, b in zip(y_true, y_pred)) / len(y_true)


def _r2_score(y_true: list[float], y_pred: list[float]) -> float:
    """Coefficient de détermination R² manuel."""
    mean_y = sum(y_true) / len(y_true)
    ss_tot = sum((y - mean_y) ** 2 for y in y_true)
    ss_res = sum((t - p) ** 2 for t, p in zip(y_true, y_pred))
    return 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0


def train_model(force: bool = False) -> bool:
    """
    Entraîne le Random Forest et sauvegarde model.pkl + metadata.json.

    Args:
        force: Si True, réentraîne même si model.pkl existe déjà.

    Returns:
        True si l'entraînement a été effectué, False si déjà existant.
    """
    if MODEL_PATH.exists() and not force:
        logger.info(f"✅ Modèle ML déjà présent : {MODEL_PATH} — skip entraînement")
        return False

    logger.info("🤖 Démarrage de l'entraînement du modèle Random Forest DIGBA...")

    # ── 1. Charger les données ────────────────────────────────────────────────
    try:
        from backend.ml.features import build_training_data
        X, y = build_training_data()
    except Exception as e:
        logger.error(f"❌ Erreur chargement données : {e}", exc_info=True)
        return False

    if len(X) < 50:
        logger.error(f"❌ Pas assez de données pour entraîner ({len(X)} lignes)")
        return False

    logger.info(f"📊 Dataset : {len(X)} lignes × {len(X[0])} features")

    # ── 2. Split train/test ───────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = _train_test_split(X, y, test_ratio=0.2)
    logger.info(f"   Train : {len(X_train)} lignes | Test : {len(X_test)} lignes")

    # ── 3. Entraînement Random Forest ─────────────────────────────────────────
    try:
        from sklearn.ensemble import RandomForestRegressor  # type: ignore
    except ImportError:
        logger.error("❌ scikit-learn non installé — rebuild du container nécessaire")
        return False

    model = RandomForestRegressor(
        n_estimators=300,       # 300 arbres : bon compromis biais/variance
        max_depth=8,            # limite la profondeur pour éviter le sur-apprentissage
        min_samples_split=5,    # au moins 5 samples pour créer un nœud
        min_samples_leaf=3,     # au moins 3 samples par feuille
        max_features="sqrt",    # sqrt(n_features) features par split → diversité
        random_state=42,        # reproductibilité
        n_jobs=-1,              # parallélisation sur tous les cœurs
    )

    logger.info("   Entraînement en cours...")
    model.fit(X_train, y_train)
    logger.info("   ✓ Entraînement terminé")

    # ── 4. Évaluation ─────────────────────────────────────────────────────────
    y_pred_train = model.predict(X_train).tolist()
    y_pred_test  = model.predict(X_test).tolist()

    mae_train = _mean_absolute_error(y_train, y_pred_train)
    mae_test  = _mean_absolute_error(y_test, y_pred_test)
    r2_train  = _r2_score(y_train, y_pred_train)
    r2_test   = _r2_score(y_test, y_pred_test)

    logger.info(f"   📈 MAE train={mae_train:.2f} | MAE test={mae_test:.2f}")
    logger.info(f"   📈 R²  train={r2_train:.3f} | R²  test={r2_test:.3f}")

    # ── 5. Feature importances ────────────────────────────────────────────────
    feature_names = [
        "category", "country", "month", "hazard_type",
        "stockage", "has_certification", "severity_bonus",
    ]
    importances = {
        name: round(float(imp), 4)
        for name, imp in zip(feature_names, model.feature_importances_)
    }
    logger.info(f"   🔍 Feature importances : {importances}")

    # ── 6. Sauvegarde du modèle ───────────────────────────────────────────────
    ML_DIR.mkdir(parents=True, exist_ok=True)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f, protocol=pickle.HIGHEST_PROTOCOL)
    logger.info(f"   💾 Modèle sauvegardé : {MODEL_PATH}")

    # ── 7. Sauvegarde des métadonnées ─────────────────────────────────────────
    metadata = {
        "trained_at":          datetime.utcnow().isoformat() + "Z",
        "model_type":          "RandomForestRegressor",
        "n_estimators":        300,
        "n_samples_total":     len(X),
        "n_samples_train":     len(X_train),
        "n_samples_test":      len(X_test),
        "n_features":          len(X[0]),
        "feature_names":       feature_names,
        "feature_importances": importances,
        "metrics": {
            "mae_train":  round(mae_train, 3),
            "mae_test":   round(mae_test, 3),
            "r2_train":   round(r2_train, 4),
            "r2_test":    round(r2_test, 4),
        },
        "data_sources": [
            "RASFF_window_SEN.xlsx (Sénégal)",
            "RASFF_window_GH.xlsx (Ghana)",
            "RASFF_window_CDV.xlsx (Côte d'Ivoire)",
            "RASFF_window_results_NGR.xlsx (Nigeria)",
        ],
        "synthetic_samples": "Oui — cas faible risque générés (stockage silo, certifiés, saison sèche)",
    }

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    logger.info(f"   📋 Métadonnées sauvegardées : {META_PATH}")

    logger.info(
        f"✅ Modèle DIGBA prêt | MAE={mae_test:.1f} pts | R²={r2_test:.3f} "
        f"| {len(X)} samples ({len(X_train)} train + {len(X_test)} test)"
    )
    return True


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )
    train_model(force=True)
