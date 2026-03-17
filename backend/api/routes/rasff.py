"""
DIGBA — Route : statistiques RASFF
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from backend.db.database import get_db
from backend.models.schemas import RasffStatsDanger, RasffStatsFournisseur

router = APIRouter(prefix="/rasff", tags=["RASFF"])


@router.get("/stats", response_model=list[RasffStatsDanger])
def rasff_stats_dangers(db: Session = Depends(get_db)):
    """Statistiques des rejets EU par type de danger."""
    rows = db.execute(text("""
        SELECT danger, categorie_danger,
               COUNT(*) AS nb_rejets,
               MAX(date) AS dernier_rejet
        FROM rasff_rejets
        GROUP BY danger
        ORDER BY nb_rejets DESC
    """)).fetchall()

    return [
        RasffStatsDanger(
            danger=r.danger,
            categorie_danger=r.categorie_danger,
            nb_rejets=r.nb_rejets,
            dernier_rejet=str(r.dernier_rejet),
        )
        for r in rows
    ]


@router.get("/fournisseurs", response_model=list[RasffStatsFournisseur])
def rasff_fournisseurs(db: Session = Depends(get_db)):
    """Liste des fournisseurs avec leur historique de rejets EU."""
    rows = db.execute(text("""
        SELECT fournisseur,
               COUNT(*)                    AS nb_rejets,
               MAX(date)                   AS dernier_rejet,
               GROUP_CONCAT(DISTINCT danger) AS dangers
        FROM rasff_rejets
        WHERE fournisseur IS NOT NULL
        GROUP BY fournisseur
        ORDER BY nb_rejets DESC
    """)).fetchall()

    return [
        RasffStatsFournisseur(
            fournisseur=r.fournisseur,
            nb_rejets=r.nb_rejets,
            dernier_rejet=str(r.dernier_rejet),
            dangers=r.dangers or "",
        )
        for r in rows
    ]
