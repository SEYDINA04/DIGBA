"""
DIGBA — Database seeder
Exécute schema.sql puis importe le CSV RASFF.
Idempotent : INSERT OR IGNORE sur la clé UNIQUE `reference`.
"""
import csv
import logging
from sqlalchemy import text
from backend.db.database import engine, SessionLocal
from backend.config.settings import settings

logger = logging.getLogger(__name__)

SCHEMA_PATH = settings.data_rasff_dir / "schema.sql"
CSV_PATH    = settings.data_rasff_dir / "rasff_senegal_rejets.csv"

_INSERT_SQL = text("""
    INSERT OR IGNORE INTO rasff_rejets
        (reference, date, pays_origine, produit, danger,
         categorie_danger, valeur_mesuree, unite, limite_eu,
         decision, fournisseur, region_senegal)
    VALUES
        (:reference, :date, :pays_origine, :produit, :danger,
         :categorie_danger, :valeur_mesuree, :unite, :limite_eu,
         :decision, :fournisseur, :region_senegal)
""")


def run_schema() -> None:
    """Crée les tables, index et vues depuis schema.sql."""
    if not SCHEMA_PATH.exists():
        logger.warning(f"Schema file not found: {SCHEMA_PATH}")
        return

    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with engine.connect() as conn:
        for statement in sql.split(";"):
            # Supprimer les lignes de commentaires, garder uniquement le SQL pur
            lines = [l for l in statement.split("\n") if not l.strip().startswith("--")]
            stmt  = "\n".join(lines).strip()
            if stmt:
                conn.execute(text(stmt))
        conn.commit()
    logger.info("✓ Schema SQLite appliqué")


def import_csv() -> int:
    """Importe le CSV RASFF. Retourne le nombre de lignes insérées."""
    if not CSV_PATH.exists():
        logger.warning(f"CSV file not found: {CSV_PATH}")
        return 0

    inserted = 0
    with SessionLocal() as db:
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                result = db.execute(_INSERT_SQL, {
                    "reference":        row["reference"],
                    "date":             row["date"],
                    "pays_origine":     row["pays_origine"],
                    "produit":          row["produit"],
                    "danger":           row["danger"],
                    "categorie_danger": row["categorie_danger"],
                    "valeur_mesuree":   row["valeur_mesuree"] or None,
                    "unite":            row["unite"] or None,
                    "limite_eu":        row["limite_eu"] or None,
                    "decision":         row["decision"],
                    "fournisseur":      row["fournisseur"] or None,
                    "region_senegal":   row["region_senegal"] or None,
                })
                inserted += result.rowcount
        db.commit()
    logger.info(f"✓ RASFF CSV importé : {inserted} lignes insérées")
    return inserted


def seed_database() -> None:
    """Point d'entrée principal — appelé au démarrage de l'app. Safe à répéter."""
    logger.info("Initialisation de la base de données DIGBA...")
    run_schema()
    import_csv()
    logger.info("✓ Base de données prête")
