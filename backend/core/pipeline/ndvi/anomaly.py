"""
DIGBA — Détection d'anomalie NDVI historique (Phase 3)
======================================================
Compare le NDVI courant (Sentinel-2) à la climatologie MODIS 2003-2023
pour détecter des conditions anormales : sécheresse, stress hydrique,
mauvaise récolte — ou à l'inverse, une saison exceptionnellement bonne.

Principe (Z-score) :
    z = (ndvi_courant - mu_historique) / sigma_historique

    z < -2  → déficit sévère vs historique  → risque très élevé
    z < -1  → déficit modéré               → risque augmenté
    -1 ≤ z ≤ +1 → dans la norme            → neutre
    z > +1  → au-dessus de la normale      → conditions favorables

Pourquoi le Z-score ?
    Un NDVI de 0.08 en mars n'est PAS inquiétant pour Kaolack
    (normale historique mars = 0.08 ± 0.03), mais ce même 0.08 en août
    serait catastrophique (normale août = 0.52 ± 0.08 → z = -5.5).
    Le score absolu seul ne peut pas faire cette distinction.

Usage :
    from backend.core.pipeline.ndvi.anomaly import compute_anomaly
    result = compute_anomaly(region="Kaolack", month=8, ndvi_mean=0.22)
    # → AnomalyResult(z_score=-3.75, penalty=25.0, label="Déficit sévère")
"""
import json
import logging
import datetime
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)

# ── Chargement de la climatologie ────────────────────────────────────────────
_CLIM_PATH = Path(__file__).parent / "historical_ndvi.json"

def _load_climatology() -> dict:
    """Charge le fichier JSON de climatologie NDVI historique."""
    with open(_CLIM_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

_CLIMATOLOGY: dict = _load_climatology()


# ── Résultat de l'anomalie ───────────────────────────────────────────────────
@dataclass
class AnomalyResult:
    """
    Résultat de la comparaison NDVI courant vs historique.

    Attributs :
        z_score   : Écart à la normale en nombre d'écarts-types.
                    z=-2 = 2 sigma sous la normale (sécheresse grave)
        mu        : NDVI moyen historique pour ce mois/région
        sigma     : Écart-type historique pour ce mois/région
        penalty   : Points à AJOUTER au score NDVI (0 = neutre, +25 = grave)
        label     : Description lisible de l'anomalie
        available : False si les données historiques sont absentes
    """
    z_score   : float
    mu        : float
    sigma     : float
    penalty   : float
    label     : str
    available : bool


def compute_anomaly(
    region: str,
    ndvi_mean: float,
    month: int | None = None,
) -> AnomalyResult:
    """
    Calcule l'anomalie NDVI pour une région et un mois donnés.

    Args:
        region    : Nom de la région (ex: "Kaolack")
        ndvi_mean : NDVI moyen calculé depuis Sentinel-2 (Phase 1+2)
        month     : Mois de l'observation (1-12). Si None → mois courant.

    Returns:
        AnomalyResult avec z_score, penalité et label.
    """
    if month is None:
        month = datetime.datetime.now().month

    # Récupérer la climatologie pour cette région
    region_data = _CLIMATOLOGY.get(region)
    if not region_data:
        log.warning(f"[anomalie] Région '{region}' absente de la climatologie — skip")
        return AnomalyResult(
            z_score=0.0, mu=0.0, sigma=0.0,
            penalty=0.0,
            label="Données historiques indisponibles",
            available=False,
        )

    # Récupérer mu et sigma pour le mois
    month_key = str(month)
    month_data = region_data.get("months", {}).get(month_key)
    if not month_data:
        log.warning(f"[anomalie] Mois {month} absent pour région '{region}'")
        return AnomalyResult(
            z_score=0.0, mu=0.0, sigma=0.0,
            penalty=0.0,
            label="Données mensuelles indisponibles",
            available=False,
        )

    mu    = month_data["mu"]
    sigma = month_data["sigma"]

    # Calcul du Z-score
    # Garde-fou : sigma minimum 0.01 pour éviter division par zéro
    sigma_safe = max(sigma, 0.01)
    z = (ndvi_mean - mu) / sigma_safe

    # Conversion z-score → pénalité sur le score de risque
    penalty, label = _z_to_penalty(z)

    log.info(
        f"[anomalie] {region} | mois={month} | NDVI={ndvi_mean:.3f} | "
        f"mu={mu:.3f} σ={sigma:.3f} | z={z:+.2f} | {label} | +{penalty} pts"
    )

    return AnomalyResult(
        z_score=round(z, 2),
        mu=mu,
        sigma=sigma,
        penalty=penalty,
        label=label,
        available=True,
    )


def _z_to_penalty(z: float) -> tuple[float, str]:
    """
    Convertit un Z-score en pénalité de risque (points à ajouter).

    Logique :
    - Un déficit NDVI vs historique augmente le risque alimentaire
      (stress hydrique → mycotoxines, mauvaise récolte, qualité réduite)
    - Un excès NDVI est légèrement favorable mais n'efface pas d'autres risques
    - Plafond à ±25 pour que l'anomalie soit un modulateur, pas le score total

    Z-score | Signification agro                    | Pénalité
    --------+--------------------------------------+----------
    < -2.5  | Sécheresse catastrophique (1 / 20 ans)| +25
    < -2.0  | Sécheresse sévère (1 / 10 ans)        | +20
    < -1.5  | Déficit notable vs normale             | +13
    < -1.0  | Légèrement sous la normale             | +7
    < -0.5  | Quasi-normal                           | +3
    -0.5–1.0| Dans la norme (±0.5σ)                 |  0
    > +1.0  | Au-dessus de la normale                | -5  (bonus)
    > +2.0  | Saison exceptionnellement bonne        | -8  (bonus)
    """
    if z < -2.5:
        return 25.0, "🔴 Sécheresse catastrophique (−2.5σ)"
    elif z < -2.0:
        return 20.0, "🔴 Sécheresse sévère (−2σ)"
    elif z < -1.5:
        return 13.0, "🟠 Déficit important (−1.5σ)"
    elif z < -1.0:
        return 7.0,  "🟡 Légèrement sous la normale (−1σ)"
    elif z < -0.5:
        return 3.0,  "🟡 Quasi-normal (−0.5σ)"
    elif z <= 1.0:
        return 0.0,  "✅ Dans la norme (±1σ)"
    elif z <= 2.0:
        return -5.0, "✅ Au-dessus de la normale (+1σ)"
    else:
        return -8.0, "✅ Saison exceptionnellement bonne (+2σ)"
