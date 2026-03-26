"""
DIGBA — Routes : scoring d'un lot + prévisualisation zone
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.models.schemas import ScoreRequest, ScoreResponse, PreviewResponse
from backend.core.pipeline.ndvi.service import compute_ndvi
from backend.core.pipeline.weather.service import get_weather
from backend.core.pipeline.rasff.service import lookup_rasff
from backend.core.pipeline.operator.service import process_operator
from backend.core.pipeline.phenology.service import compute_phenology
from backend.core.scoring.engine import compute_score

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Scoring"])


@router.get("/preview", response_model=PreviewResponse)
def preview_zone(
    region:  str = Query(..., description="Région de production"),
    country: str = Query(default="SN", description="Code pays ISO-2"),
):
    """
    Prévisualisation rapide d'une zone : NDVI Sentinel-2 + Météo Open-Meteo.
    Utilisé par le wizard frontend (step 1) avant la saisie des détails du lot.
    """
    logger.info(f"Preview demandé | region={region} country={country}")
    try:
        ndvi_result    = compute_ndvi(region=region)
        weather_result = get_weather(region=region)
        return PreviewResponse(
            region=region,
            country=country,
            ndvi=ndvi_result,
            weather=weather_result,
        )
    except Exception as e:
        logger.error(f"Erreur preview : {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur preview : {str(e)}")


@router.post("/score", response_model=ScoreResponse)
def score_lot(form: ScoreRequest, db: Session = Depends(get_db)):
    """
    Calcule le score de risque DIGBA pour un lot agricole.

    Le pipeline exécute en séquence :
    1. NDVI (Sentinel-2 + anomalie MODIS) — état de la végétation
    2. Météo (Open-Meteo) — conditions de stockage et transport
    3. RASFF — historique des rejets EU du fournisseur/région
    4. Opérateur — score basé sur le formulaire terrain
    5. Phénologie — stade cultural courant (floraison/récolte/stockage)
    """
    produit_val  = form.produit.value if hasattr(form.produit, "value") else str(form.produit)
    logger.info(
        f"Score demandé | produit={produit_val} "
        f"region={form.region} country={form.country} fournisseur={form.fournisseur}"
    )

    try:
        ndvi_result     = compute_ndvi(region=form.region)
        weather_result  = get_weather(region=form.region)
        rasff_result    = lookup_rasff(
            fournisseur=form.fournisseur,
            region=form.region,
            produit=produit_val,
            country=form.country,
            stockage=form.stockage.value if hasattr(form.stockage, "value") else str(form.stockage),
            certifications=form.certifications,
            db=db,
        )
        operator_result   = process_operator(form=form)
        phenology_result  = compute_phenology(
            produit=produit_val,
            country=form.country,
        )

        return compute_score(
            ndvi=ndvi_result,
            weather=weather_result,
            rasff=rasff_result,
            operator=operator_result,
            phenology=phenology_result,
            produit=produit_val,
            region=form.region,
        )

    except Exception as e:
        logger.error(f"Erreur pipeline scoring : {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur pipeline : {str(e)}")
