-- DIGBA — Schéma SQLite base RASFF
-- Rejets documentés de produits sénégalais en Europe

CREATE TABLE IF NOT EXISTS rasff_rejets (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    reference         TEXT NOT NULL UNIQUE,        -- Référence RASFF (ex: 2024.0892)
    date              DATE NOT NULL,               -- Date du rejet
    pays_origine      TEXT NOT NULL DEFAULT 'Sénégal',
    produit           TEXT NOT NULL,               -- Type de produit
    danger            TEXT NOT NULL,               -- Danger détecté
    categorie_danger  TEXT NOT NULL,               -- Mycotoxine | Pesticide | Microbiologie
    valeur_mesuree    TEXT,                        -- Valeur mesurée (TEXT car peut être "Présence")
    unite             TEXT,                        -- ppb | mg/kg | /25g
    limite_eu         TEXT,                        -- Limite réglementaire EU
    decision          TEXT NOT NULL,               -- Rejet frontière | Retrait marché
    fournisseur       TEXT,                        -- Nom de l'exportateur (si connu)
    region_senegal    TEXT,                        -- Région d'origine au Sénégal
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour accélérer les lookups par fournisseur et danger
CREATE INDEX IF NOT EXISTS idx_rasff_fournisseur    ON rasff_rejets(fournisseur);
CREATE INDEX IF NOT EXISTS idx_rasff_danger         ON rasff_rejets(danger);
CREATE INDEX IF NOT EXISTS idx_rasff_region         ON rasff_rejets(region_senegal);
CREATE INDEX IF NOT EXISTS idx_rasff_date           ON rasff_rejets(date);
CREATE INDEX IF NOT EXISTS idx_rasff_categorie      ON rasff_rejets(categorie_danger);

-- Vue : fournisseurs blacklistés (rejet < 12 mois)
CREATE VIEW IF NOT EXISTS v_fournisseurs_blacklistes AS
    SELECT
        fournisseur,
        COUNT(*)          AS nb_rejets,
        MAX(date)         AS dernier_rejet,
        GROUP_CONCAT(DISTINCT danger) AS dangers
    FROM rasff_rejets
    WHERE date >= DATE('now', '-12 months')
    GROUP BY fournisseur
    ORDER BY nb_rejets DESC;

-- Vue : résumé par danger
CREATE VIEW IF NOT EXISTS v_stats_dangers AS
    SELECT
        danger,
        categorie_danger,
        COUNT(*) AS nb_rejets,
        MIN(date) AS premier_rejet,
        MAX(date) AS dernier_rejet
    FROM rasff_rejets
    GROUP BY danger
    ORDER BY nb_rejets DESC;
