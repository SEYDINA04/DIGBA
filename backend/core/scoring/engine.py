"""
DIGBA — Moteur de scoring
Combine les 5 sous-scores en un score de risque final 0–100%.

Pondérations (Phase 4) :
    0.30 × NDVI        (satellite + anomalie historique)
    0.20 × Weather     (météo courant)
    0.25 × RASFF       (historique rejets douaniers)
    0.15 × Operator    (stockage + certifications)
    0.10 × Phenology   (stade cultural courant)
    ─────
    1.00
"""
import logging
from backend.config.settings import settings
from backend.models.schemas import (
    NdviResult, WeatherResult, RasffResult, OperatorResult,
    PhenologyResult, ScoreResponse, ScoreDetails,
)

logger = logging.getLogger(__name__)

# Mycotoxine principale par produit (limite EU en référence)
_MYCOTOXIN: dict[str, str] = {
    "arachide":     "aflatoxine B1 (limite EU : 2 ppb grains, 8 ppb aliments animaux)",
    "mil":          "fumonisines B1+B2 et aflatoxines (limite EU : 1 000 ppb fumonisines)",
    "sorgho":       "fumonisines et déoxynivalénol DON (limite EU : 750 ppb DON céréales)",
    "sesame":       "ochratoxine A – OTA (limite EU : 15 ppb épices)",
    "cacao":        "ochratoxine A – OTA et cadmium (limite EU : 2 ppb OTA, 0.8 mg/kg Cd)",
}

# Test recommandé par mycotoxine
_TEST: dict[str, str] = {
    "arachide": "HPLC-FLD ou ELISA rapide aflatoxine B1",
    "mil":      "ELISA fumonisines + bandelette aflatoxine",
    "sorgho":   "HPLC DON + bandelette fumonisines",
    "sesame":   "HPLC-MS ochratoxine A",
    "cacao":    "HPLC-MS OTA + spectrométrie cadmium (ICP-MS)",
}

# Stades phénologiques à risque élevé
_HIGH_RISK_STADES = {"harvest", "post_harvest_drying", "storage_medium", "grain_fill", "flowering"}


def generate_recommendation(
    score:     float,
    niveau:    str,
    ndvi:      NdviResult,
    weather:   WeatherResult,
    rasff:     RasffResult,
    operator:  OperatorResult,
    phenology: PhenologyResult | None,
    produit:   str,
) -> str:
    """
    Génère une recommandation contextuelle expliquant les facteurs dominants du score.

    Structure :
        Score X/100 — Niveau.
        Facteurs dominants : [liste des causes identifiées].
        Risque principal : [mycotoxine spécifique au produit].
        Action : [mesure concrète adaptée au niveau].
    """
    parts: list[str] = []

    # ── 1. Facteurs dominants ─────────────────────────────────────────────────
    factors: list[str] = []

    # Satellite / végétation
    if ndvi.score >= 55:
        factors.append(f"stress végétatif satellite (NDVI={ndvi.ndvi_mean:.2f})")
    if ndvi.anomaly and ndvi.anomaly.available and ndvi.anomaly.z_score < -1.5:
        factors.append(f"déficit NDVI anormal ({ndvi.anomaly.z_score:+.1f}σ vs climatologie)")

    # Météo / ERA5
    if weather.anomaly:
        z_t = weather.anomaly.temp_z
        z_p = weather.anomaly.precip_z
        if z_t > 1.5:
            factors.append(f"canicule ERA5 ({z_t:+.1f}σ au-dessus de la normale)")
        elif z_t < -1.5:
            factors.append(f"fraîcheur anormale ERA5 ({z_t:+.1f}σ)")
        if z_p > 1.5:
            factors.append(f"excès pluviométrique ERA5 ({z_p:+.1f}σ)")
        elif z_p < -1.5:
            factors.append(f"sécheresse ERA5 ({z_p:+.1f}σ)")
    elif weather.score >= 55:
        factors.append(f"conditions météo défavorables (humidité {weather.humidity}%, {weather.temp_c:.0f}°C)")

    # RASFF
    if rasff.blackliste:
        factors.append("fournisseur BLACKLISTÉ dans la base RASFF EU")
    elif rasff.nb_rejets_24m > 0:
        factors.append(f"{rasff.nb_rejets_24m} rejet(s) RASFF EU sur ce fournisseur (24 mois)")
        if rasff.derniers_dangers:
            factors.append(f"dangers signalés : {', '.join(rasff.derniers_dangers[:2])}")
    if rasff.nb_rejets_region > 3:
        factors.append(f"{rasff.nb_rejets_region} rejets RASFF dans la région (24 mois)")

    # Opérateur
    op_issues: list[str] = []
    if operator.stockage == "plein_air":
        op_issues.append("stockage plein air (exposition humidité/insectes)")
    if not operator.certifications:
        op_issues.append("aucune certification qualité")
    if op_issues:
        factors.append(" + ".join(op_issues))

    # Phénologie
    if phenology and phenology.stade in _HIGH_RISK_STADES:
        pheno_labels = {
            "harvest":             "récolte en cours (manipulation critique)",
            "post_harvest_drying": "séchage post-récolte (humidité critique)",
            "storage_medium":      "stockage prolongé > 3 mois",
            "grain_fill":          "remplissage des grains (accumulation max mycotoxines)",
            "flowering":           "floraison (fenêtre critique mycotoxines)",
        }
        factors.append(f"stade phénologique critique : {pheno_labels.get(phenology.stade, phenology.stade)}")

    if factors:
        parts.append(f"Facteurs dominants : {' · '.join(factors)}.")
    else:
        parts.append("Aucun facteur de risque majeur détecté sur cette période.")

    # ── 2. Risque mycotoxine spécifique ───────────────────────────────────────
    mycotoxin = _MYCOTOXIN.get(produit.lower(), "mycotoxines (produit non référencé)")
    parts.append(f"Risque principal pour {produit} : {mycotoxin}.")

    # ── 3. Action concrète selon le niveau ────────────────────────────────────
    test = _TEST.get(produit.lower(), "test laboratoire accrédité")

    if niveau == "Faible":
        parts.append(
            f"Action : achat possible — exiger le certificat phytosanitaire d'origine "
            f"et conserver un échantillon de référence (min. 500g). "
            f"Test {test} recommandé si stockage > 2 mois."
        )
    elif niveau == "Modéré":
        parts.append(
            f"Action : achat conditionnel — {test} obligatoire avant engagement financier. "
            f"Négocier une clause de déclassement si résultat > 50% de la limite EU. "
            f"Inspection visuelle du lot (couleur, odeur, humidité) requise."
        )
    else:  # Élevé
        if rasff.blackliste:
            parts.append(
                f"Action : refus immédiat recommandé — fournisseur blacklisté RASFF EU. "
                f"Si achat impératif : {test} + audit complet du site de stockage "
                f"+ clause pénale contractuelle (remboursement si > limite EU)."
            )
        else:
            parts.append(
                f"Action : refus ou renégociation — {test} obligatoire + audit site. "
                f"Intégrer le coût du test ({test.split()[0]}) dans le prix d'achat. "
                f"Exiger traçabilité parcelle complète (GPS + date récolte)."
            )

    return f"Score {score:.0f}/100 — {niveau}. " + " ".join(parts)


def generate_eudr_recommendation(ndvi: NdviResult, region: str, lat: float, lon: float) -> str:
    """
    Generates a bilingual (EN/FR) EUDR compliance recommendation grounded in
    EU Regulation 2023/1115 article excerpts.

    3 cases:
    - data_available + deforestation_free  → compliant, submission steps
    - data_available + !deforestation_free → non-compliant, corrective actions
    - !data_available                      → unverified, do not export without check
    """
    eudr = ndvi.eudr
    gps  = f"{abs(lat):.6f}°{'N' if lat >= 0 else 'S'}, {abs(lon):.6f}°{'W' if lon < 0 else 'E'}"

    # ── Case 1 : Data not yet available ───────────────────────────────────────
    if eudr is None or not eudr.data_available:
        return (
            "[EN] EUDR compliance unverified — reference forest data (WorldCover 2020) "
            f"not yet available for {region}. "
            "Under Art. 4(1)(b) of EU Reg. 2023/1115, operators must collect sufficient "
            "information to carry out due diligence, including geolocation of all plots. "
            "Under Art. 9(d), GPS coordinates at parcel level are mandatory. "
            "Do not export to the EU market until EUDR status is confirmed. "
            "Re-run this analysis in 24h for a complete verification. "
            "|| "
            "[FR] Conformité EUDR non vérifiable — données de référence forestière "
            f"(WorldCover 2020) non disponibles pour {region}. "
            "Conformément à l'Art. 4(1)(b) du Règlement UE 2023/1115, l'opérateur doit "
            "collecter des informations suffisantes, y compris la géolocalisation des parcelles. "
            "Ne pas exporter vers l'UE sans confirmation du statut EUDR."
        )

    # ── Case 2 : Deforestation-free ✅ ────────────────────────────────────────
    if eudr.deforestation_free:
        return (
            "[EN] EUDR COMPLIANT — Deforestation-free zone verified. "
            f"Forest cover 2020: {eudr.forest_pct_2020}% → 2021: {eudr.forest_pct_2021}% — "
            "no conversion detected after the reference date. "
            "Under Art. 3(1) of EU Reg. 2023/1115: 'Relevant commodities and products "
            "shall not be placed on the Union market [...] unless they are deforestation-free.' "
            "This lot satisfies Art. 3(1). "
            "Next steps: "
            "(1) Art. 4 — Download your DIGBA due diligence statement and retain it. "
            f"(2) Art. 9(d) — Submit GPS coordinates ({gps}) with your EU customs declaration. "
            "(3) Art. 5 — Operators must make due diligence statements available to "
            "competent authorities for at least 5 years. Keep this satellite proof. "
            "|| "
            "[FR] CONFORME EUDR — Zone déforestation-free vérifiée par satellite. "
            f"Forêt 2020 : {eudr.forest_pct_2020}% → 2021 : {eudr.forest_pct_2021}%. "
            "Selon l'Art. 3(1) du Règlement UE 2023/1115, ce lot est éligible au marché européen. "
            "Art. 4 : téléchargez la déclaration de diligence raisonnée DIGBA. "
            f"Art. 9(d) : coordonnées GPS ({gps}) à soumettre au dossier douanier. "
            "Art. 5 : conservez cette preuve 5 ans."
        )

    # ── Case 3 : Deforestation detected ❌ ────────────────────────────────────
    return (
        "[EN] EUDR NON-COMPLIANT — Deforestation detected. "
        f"{eudr.deforested_pct:.2f}% forest-to-other conversion identified after "
        f"{eudr.cutoff_date} in {region} ({eudr.source}). "
        "Under Art. 3(1) of EU Reg. 2023/1115: operators shall not place on the Union market "
        "commodities produced on land subject to deforestation after December 31, 2020. "
        "Under Art. 4(2)(c), where a risk is identified, operators must take "
        "adequate and proportionate measures to mitigate it before placing products on the market. "
        "Required actions: "
        f"(1) Art. 9 — Field verification and precise parcel geolocation (current GPS: {gps}). "
        "(2) Art. 4(2)(c) — Implement corrective measures or withdraw the lot from the EU supply chain. "
        "(3) If land-use change was legally authorized under national law, provide "
        "official authorization documents to the EU buyer (Art. 2(9) definition of 'legal'). "
        "(4) Seek legal counsel before any commercial commitment. "
        "|| "
        "[FR] NON CONFORME EUDR — Déforestation détectée. "
        f"{eudr.deforested_pct:.2f}% de conversion forêt après le {eudr.cutoff_date} "
        f"sur la zone {region}. "
        "Art. 3(1) Règlement UE 2023/1115 : ce lot ne peut légalement être placé sur le marché UE. "
        "Art. 4(2)(c) : mesures correctives obligatoires ou retrait du lot de la filière UE. "
        "Art. 9 : vérification terrain + géolocalisation précise à la parcelle. "
        "Consultez un juriste avant tout engagement commercial."
    )


def compute_score(
    ndvi:      NdviResult,
    weather:   WeatherResult,
    rasff:     RasffResult,
    operator:  OperatorResult,
    phenology: PhenologyResult | None = None,
    produit:   str = "arachide",
    region:    str = "",
) -> ScoreResponse:
    """
    Calcule le score de risque final DIGBA.

    Formule (Phase 4) :
        score = 0.30×ndvi + 0.20×weather + 0.25×rasff + 0.15×operator + 0.10×phenology

    Si phenology est None (non fourni), on redistribue son poids sur ndvi :
        score = 0.35×ndvi + 0.20×weather + 0.25×rasff + 0.15×operator + 0.05 bonus neutre

    Args:
        ndvi, weather, rasff, operator : résultats des 4 pipelines existants
        phenology : résultat du pipeline phénologique (optionnel)

    Returns:
        ScoreResponse avec score final, niveau de risque et décision.
    """
    if phenology is not None:
        # Formule complète Phase 4 — 5 composantes
        raw_score = (
            0.30 * ndvi.score
            + 0.20 * weather.score
            + 0.25 * rasff.score
            + 0.15 * operator.score
            + 0.10 * phenology.score
        )
        pheno_info = f"phenology={phenology.score}({phenology.stade})"
    else:
        # Formule legacy — 4 composantes (poids settings)
        raw_score = (
            settings.weight_ndvi     * ndvi.score
            + settings.weight_weather  * weather.score
            + settings.weight_rasff    * rasff.score
            + settings.weight_operator * operator.score
        )
        pheno_info = "phenology=N/A"

    score  = round(min(max(raw_score, 0.0), 100.0), 1)
    niveau = "Faible" if score <= settings.score_low_max else ("Modéré" if score <= settings.score_medium_max else "Élevé")

    decision = generate_recommendation(
        score=score, niveau=niveau,
        ndvi=ndvi, weather=weather, rasff=rasff,
        operator=operator, phenology=phenology,
        produit=produit,
    )

    logger.info(
        f"Score DIGBA : {score:.1f}% ({niveau}) | "
        f"ndvi={ndvi.score} weather={weather.score} "
        f"rasff={rasff.score} operator={operator.score} {pheno_info}"
    )

    eudr_decision = generate_eudr_recommendation(
        ndvi=ndvi,
        region=region,
        lat=weather.lat,
        lon=weather.lon,
    )

    return ScoreResponse(
        score=score,
        niveau_risque=niveau,
        decision=decision,
        eudr_decision=eudr_decision,
        details=ScoreDetails(
            ndvi=ndvi,
            weather=weather,
            rasff=rasff,
            operator=operator,
            phenology=phenology,
        ),
    )
