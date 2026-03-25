"""
DIGBA — Feature Engineering (ML)
=================================
Ce module centralise toute la logique de transformation des données brutes
RASFF en features numériques utilisables par le modèle Random Forest.

Responsabilités :
  - Chargement et fusion des 4 fichiers Excel RASFF (SN, GH, CI, NG)
  - Normalisation des champs bruts (catégories, pays, dangers)
  - Construction du score cible (target) depuis risk_decision + classification
  - Encodage des variables catégorielles (LabelEncoder)
  - Génération des données synthétiques "faible risque" pour équilibrer le dataset
"""

import zipfile
import xml.etree.ElementTree as ET
import random
import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Chemins des fichiers source ───────────────────────────────────────────────

DATA_DIR = Path(__file__).parent.parent / "data" / "rasff"
ML_DIR   = Path(__file__).parent

EXCEL_FILES = {
    "SN": Path(__file__).parent.parent / "RASFF_window_SEN.xlsx",
    "GH": Path(__file__).parent.parent / "RASFF_window_GH.xlsx",
    "CI": Path(__file__).parent.parent / "RASFF_window_CDV.xlsx",
    "NG": Path(__file__).parent.parent / "RASFF_window_results_NGR.xlsx",
}

# ── Mappings de normalisation ─────────────────────────────────────────────────

# Catégories de produits → identifiants courts
CATEGORY_MAP: dict[str, str] = {
    "nuts, nut products and seeds":               "nuts",
    "fruits and vegetables":                      "fruits_veg",
    "cereals and bakery products":                "cereals",
    "fats and oils":                              "fats_oils",
    "herbs and spices":                           "herbs_spices",
    "cocoa and cocoa preparations, coffee and tea": "cocoa_coffee",
    "dietetic foods, food supplements and fortified foods": "supplements",
    "non-alcoholic beverages":                    "beverages",
    "meat and meat products":                     "meat",
    "fish and fish products":                     "fish",
}

# Types de dangers extraits du champ `hazards` → familles de risque
HAZARD_TYPE_MAP: dict[str, str] = {
    "aflatoxin":      "mycotoxin",
    "mycotoxin":      "mycotoxin",
    "ochratoxin":     "mycotoxin",
    "fumonisin":      "mycotoxin",
    "deoxynivalenol": "mycotoxin",
    "zearalenone":    "mycotoxin",
    "salmonella":     "pathogen",
    "listeria":       "pathogen",
    "e. coli":        "pathogen",
    "enterobacter":   "pathogen",
    "vibrio":         "pathogen",
    "cadmium":        "heavy_metal",
    "lead":           "heavy_metal",
    "mercury":        "heavy_metal",
    "arsenic":        "heavy_metal",
    "pesticide":      "pesticide",
    "chlorpyrifos":   "pesticide",
    "ddt":            "pesticide",
    "sudan":          "contaminant",
    "dye":            "contaminant",
    "colour":         "contaminant",
    "mineral oil":    "contaminant",
    "foreign body":   "physical",
}

# Scores cibles selon (classification × risk_decision) → [0–100]
# Logique : border rejection = risque max ; information = risque modéré
TARGET_SCORE_MAP: dict[tuple[str, str], float] = {
    ("border rejection notification", "serious"):             92.0,
    ("border rejection notification", "potentially serious"): 80.0,
    ("border rejection notification", "potential risk"):      70.0,
    ("border rejection notification", "not serious"):         55.0,
    ("border rejection notification", "undecided"):           65.0,
    ("alert notification",            "serious"):             82.0,
    ("alert notification",            "potentially serious"): 68.0,
    ("alert notification",            "potential risk"):      55.0,
    ("alert notification",            "not serious"):         40.0,
    ("alert notification",            "undecided"):           50.0,
    ("information notification for attention", "serious"):             62.0,
    ("information notification for attention", "potentially serious"): 48.0,
    ("information notification for attention", "potential risk"):      35.0,
    ("information notification for attention", "not serious"):         22.0,
    ("information notification for attention", "undecided"):           30.0,
    ("information notification for follow-up", "serious"):             58.0,
    ("information notification for follow-up", "potentially serious"): 44.0,
    ("information notification for follow-up", "potential risk"):      30.0,
    ("information notification for follow-up", "not serious"):         18.0,
    ("information notification for follow-up", "undecided"):           25.0,
}

# Score par défaut si combinaison inconnue
_DEFAULT_TARGET = 45.0

# Encodages fixes des variables catégorielles
# (évite de dépendre d'un LabelEncoder sauvegardé séparément)
CATEGORY_ENCODER:  dict[str, int] = {
    "nuts": 0, "fruits_veg": 1, "cereals": 2, "fats_oils": 3,
    "herbs_spices": 4, "cocoa_coffee": 5, "supplements": 6,
    "beverages": 7, "meat": 8, "fish": 9, "other": 10,
}
COUNTRY_ENCODER:   dict[str, int] = {"SN": 0, "GH": 1, "CI": 2, "NG": 3, "other": 4}
HAZARD_ENCODER:    dict[str, int] = {
    "mycotoxin": 0, "pathogen": 1, "heavy_metal": 2,
    "pesticide": 3, "contaminant": 4, "physical": 5, "unknown": 6,
}
STOCKAGE_ENCODER:  dict[str, int] = {"silo_ventile": 0, "hangar": 1, "plein_air": 2}


# ── Lecture Excel sans dépendance openpyxl ───────────────────────────────────

def _read_xlsx(path: Path) -> list[dict]:
    """
    Lit un fichier .xlsx via zipfile + XML (sans openpyxl ni pandas).

    Returns:
        Liste de dictionnaires {colonne: valeur} pour chaque ligne de données.
    """
    with zipfile.ZipFile(path) as z:
        # 1. Charger les chaînes partagées
        with z.open("xl/sharedStrings.xml") as f:
            tree = ET.parse(f)
            ns   = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
            shared = [
                "".join(t.text or "" for t in si.iter(f"{{{ns}}}t"))
                for si in tree.findall(f".//{{{ns}}}si")
            ]

        # 2. Lire la feuille principale
        with z.open("xl/worksheets/sheet1.xml") as f:
            tree = ET.parse(f)
            rows_raw: list[list[str]] = []
            for row in tree.findall(f".//{{{ns}}}row"):
                cells: list[str] = []
                for c in row.findall(f"{{{ns}}}c"):
                    v = c.find(f"{{{ns}}}v")
                    if v is not None and v.text is not None:
                        cells.append(
                            shared[int(v.text)] if c.get("t") == "s" else v.text
                        )
                    else:
                        cells.append("")
                rows_raw.append(cells)

    if not rows_raw:
        return []

    headers = rows_raw[0]
    return [
        {headers[i]: row[i] if i < len(row) else "" for i in range(len(headers))}
        for row in rows_raw[1:]
        if any(row)  # ignorer les lignes vides
    ]


# ── Normalisation d'une ligne RASFF ──────────────────────────────────────────

def _normalize_category(raw: str) -> str:
    """Mappe la catégorie brute RASFF vers l'identifiant court."""
    raw_lower = raw.lower().strip()
    for key, val in CATEGORY_MAP.items():
        if key in raw_lower:
            return val
    return "other"


def _normalize_hazard(raw: str) -> str:
    """
    Extrait la famille de danger principale depuis le champ `hazards`.
    Exemples :
        "aflatoxin B1 - {mycotoxins}" → "mycotoxin"
        "Salmonella spp - {pathogenic micro-organisms}" → "pathogen"
    """
    raw_lower = raw.lower()
    for keyword, family in HAZARD_TYPE_MAP.items():
        if keyword in raw_lower:
            return family
    return "unknown"


def _extract_month(date_str: str) -> int:
    """
    Extrait le mois (1–12) depuis une date RASFF.
    Formats supportés : "25-08-2025 16:05:38" | "2024-03-12"
    Retourne 6 (mois médian) si le parsing échoue.
    """
    for fmt in ("%d-%m-%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str.strip(), fmt).month
        except ValueError:
            continue
    return 6


def _target_score(classification: str, risk_decision: str) -> float:
    """
    Calcule le score cible (0–100) à partir de la classification RASFF
    et de la décision de risque.
    """
    key = (classification.lower().strip(), risk_decision.lower().strip())
    return TARGET_SCORE_MAP.get(key, _DEFAULT_TARGET)


# ── Construction du dataset d'entraînement ───────────────────────────────────

def build_training_data() -> tuple[list[list[float]], list[float]]:
    """
    Charge les 4 fichiers Excel RASFF, extrait les features et construit
    le dataset d'entraînement.

    Features (7 colonnes) :
        [0] category_enc   — catégorie de produit encodée
        [1] country_enc    — pays d'origine encodé
        [2] month          — mois (1–12, saisonnalité)
        [3] hazard_enc     — famille de danger encodée
        [4] stockage_enc   — mode de stockage encodé
        [5] has_cert       — 1 si certifié, 0 sinon
        [6] severity_bonus — bonus de gravité (0=info, 1=alert, 2=border rejection)

    Target :
        risk_score (float, 0–100)

    Returns:
        X (list[list[float]]), y (list[float])
    """
    X: list[list[float]] = []
    y: list[float]       = []
    total_loaded = 0

    for country_code, path in EXCEL_FILES.items():
        if not path.exists():
            logger.warning(f"⚠️  Fichier manquant : {path}")
            continue

        rows = _read_xlsx(path)
        logger.info(f"📂 {path.name} : {len(rows)} lignes chargées (pays={country_code})")
        total_loaded += len(rows)

        for row in rows:
            category_raw    = row.get("category", "")
            hazard_raw      = row.get("hazards", "")
            date_raw        = row.get("date", "")
            classification  = row.get("classification", "")
            risk_decision   = row.get("risk_decision", "")

            # --- Features ---
            category_norm = _normalize_category(category_raw)
            hazard_norm   = _normalize_hazard(hazard_raw)
            month         = _extract_month(date_raw)

            # Gravité de la notification (0/1/2)
            clf_lower = classification.lower()
            if "border rejection" in clf_lower:
                severity_bonus = 2.0
            elif "alert" in clf_lower:
                severity_bonus = 1.0
            else:
                severity_bonus = 0.0

            # Pour les lignes RASFF réelles : pas de certif ni stockage optimal
            # (ces lots ont été rejetés → stockage et certif moins bons en moyenne)
            stockage_enc = STOCKAGE_ENCODER.get("hangar", 1)  # hangar par défaut
            has_cert     = 0.0  # pas de certif (lots rejetés)

            feature_vec = [
                float(CATEGORY_ENCODER.get(category_norm, 10)),
                float(COUNTRY_ENCODER.get(country_code, 4)),
                float(month),
                float(HAZARD_ENCODER.get(hazard_norm, 6)),
                float(stockage_enc),
                has_cert,
                severity_bonus,
            ]

            target = _target_score(classification, risk_decision)

            X.append(feature_vec)
            y.append(target)

    logger.info(f"✅ {total_loaded} lignes RASFF réelles chargées")

    # ── Données synthétiques "faible risque" ─────────────────────────────────
    # Justification : RASFF ne contient QUE des rejets → le modèle sans exemples
    # positifs prédirait toujours "risque élevé". On génère des cas représentant
    # des lots conformes (ratio danger << limite EU, stockage optimal, certifiés).
    synthetic = _generate_safe_samples(n=len(X))
    X.extend(synthetic[0])
    y.extend(synthetic[1])

    logger.info(
        f"📊 Dataset final : {len(X)} lignes "
        f"({total_loaded} RASFF + {len(synthetic[0])} synthétiques)"
    )
    return X, y


def _generate_safe_samples(n: int) -> tuple[list[list[float]], list[float]]:
    """
    Génère n échantillons synthétiques couvrant TOUT le spectre de risque :
      - Faible  (5–25)  : silo + certifié + saison sèche
      - Modéré  (30–50) : hangar ± certification ± saison humide
      - Élevé   (55–75) : plein air + non certifié + saison humide

    Pourquoi couvrir les 3 niveaux ?
    ─────────────────────────────────
    RASFF contient UNIQUEMENT des rejets (risque élevé).
    Sans exemples synthétiques variés, le modèle ne verrait jamais
    stockage = plein_air ni des lots modérément risqués mais acceptables.
    → Random Forest ne peut créer des splits que sur des valeurs qu'il a vues.

    Distribution des échantillons (seed=42, reproductible) :
      50% faible risque   (silo_ventile, certifié)
      30% risque modéré   (hangar, ± certifié)
      20% risque élevé    (plein_air, non certifié)
    """
    rng = random.Random(42)

    X_syn: list[list[float]] = []
    y_syn: list[float]       = []

    all_months      = list(range(1, 13))
    dry_months      = [11, 12, 1, 2, 3]   # faible pression mycotoxines
    wet_months      = [6, 7, 8, 9, 10]    # forte pression mycotoxines

    n_low     = int(n * 0.50)   # 50% faible risque
    n_medium  = int(n * 0.30)   # 30% risque modéré
    n_high    = n - n_low - n_medium  # 20% risque élevé (plein air)

    # ── 1. Faible risque : silo + certifié + saison sèche ────────────────────
    for _ in range(n_low):
        X_syn.append([
            float(rng.choice(list(CATEGORY_ENCODER.values()))),
            float(rng.choice(list(COUNTRY_ENCODER.values())[:4])),
            float(rng.choice(dry_months)),
            float(HAZARD_ENCODER["unknown"]),
            float(STOCKAGE_ENCODER["silo_ventile"]),
            1.0,   # certifié
            0.0,   # pas d'historique de rejet
        ])
        y_syn.append(round(rng.uniform(5.0, 25.0), 1))

    # ── 2. Risque modéré : hangar ± certification ± mois mixte ───────────────
    for _ in range(n_medium):
        has_cert = float(rng.choice([0, 1]))
        month    = float(rng.choice(all_months))
        # Lot modéré : certifié → 25–45, non certifié → 35–55
        base     = 25.0 if has_cert else 35.0
        spread   = 20.0
        X_syn.append([
            float(rng.choice(list(CATEGORY_ENCODER.values()))),
            float(rng.choice(list(COUNTRY_ENCODER.values())[:4])),
            month,
            float(HAZARD_ENCODER["unknown"]),
            float(STOCKAGE_ENCODER["hangar"]),
            has_cert,
            0.0,
        ])
        y_syn.append(round(rng.uniform(base, base + spread), 1))

    # ── 3. Risque élevé : plein air + non certifié + saison humide ───────────
    # Critique : ces exemples apprennent au modèle que plein_air = risque élevé.
    # Sans eux, Random Forest ne peut pas distinguer hangar(1) de plein_air(2).
    for _ in range(n_high):
        month    = float(rng.choice(wet_months))
        hazard   = float(rng.choice([
            HAZARD_ENCODER["mycotoxin"],
            HAZARD_ENCODER["unknown"],
        ]))
        X_syn.append([
            float(rng.choice(list(CATEGORY_ENCODER.values()))),
            float(rng.choice(list(COUNTRY_ENCODER.values())[:4])),
            month,
            hazard,
            float(STOCKAGE_ENCODER["plein_air"]),
            0.0,   # non certifié
            0.0,   # pas d'historique (lot neuf en plein air)
        ])
        y_syn.append(round(rng.uniform(55.0, 78.0), 1))

    return X_syn, y_syn


def encode_input(
    produit:        str,
    country:        str,
    month:          int,
    stockage:       str,
    certifications: list[str],
    hazard_hint:    str = "unknown",
) -> list[float]:
    """
    Encode les paramètres d'un lot entrant pour la prédiction ML.

    Args:
        produit:        Valeur enum Produit (ex: "noix_de_cajou")
        country:        Code pays ISO-2 (ex: "SN")
        month:          Mois actuel (1–12)
        stockage:       Mode de stockage (ex: "silo_ventile")
        certifications: Liste des certifications déclarées
        hazard_hint:    Famille de danger connue (depuis historique RASFF)

    Returns:
        Vecteur de 7 features prêt pour model.predict()
    """
    # Conversion produit → catégorie produit
    produit_to_cat: dict[str, str] = {
        "arachide": "nuts",
        "mil":      "cereals",
        "sorgho":   "cereals",
        "sesame":   "herbs_spices",
        "cacao":    "cocoa_coffee",
    }
    category_norm = produit_to_cat.get(produit.lower(), "other")

    # Gravité estimée selon l'historique RASFF du lot.
    # Un lot soumis pour évaluation sans rejet connu = 0.0 (aucune notification).
    # Si l'historique RASFF révèle des rejets récents, le scoring engine passe
    # rasff_severity=1.0 (alert) ou 2.0 (border rejection) via hazard_hint.
    #
    # IMPORTANT : ne jamais mettre de valeur fixe par pays ici.
    # Cela biaiserait le modèle vers "High" pour tous les lots SN/GH/NG/CI
    # indépendamment du stockage, des certifications et du danger réel.
    severity_bonus = 0.0  # baseline : lot sans historique de rejet

    has_cert = 1.0 if len(certifications) > 0 else 0.0

    return [
        float(CATEGORY_ENCODER.get(category_norm, 10)),
        float(COUNTRY_ENCODER.get(country.upper(), 4)),
        float(month),
        float(HAZARD_ENCODER.get(hazard_hint, 6)),
        float(STOCKAGE_ENCODER.get(stockage, 1)),
        has_cert,
        severity_bonus,
    ]
