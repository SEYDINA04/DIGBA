"""
DIGBA — SQLAlchemy engine + session factory
"""
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.config.settings import settings

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    # echo=True activerait les logs SQL de toutes les requêtes (très verbeux).
    # Laisser à False même en mode debug — utiliser sqlalchemy logging si besoin.
    echo=False,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Active WAL mode + foreign keys à chaque connexion SQLite."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # évite DetachedInstanceError après commit
)


class Base(DeclarativeBase):
    pass


def get_db():
    """Générateur FastAPI Depends — fournit une session scoped par requête."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
