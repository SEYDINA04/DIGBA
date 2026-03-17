"""
DIGBA — Route : health check
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.db.database import get_db
from backend.config.settings import settings
from backend.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """Vérifie que l'API et la base de données sont opérationnelles."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    return HealthResponse(
        status="ok" if db_ok else "degraded",
        version=settings.app_version,
        db_ok=db_ok,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
