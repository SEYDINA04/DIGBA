"""
DIGBA — Pipeline NDVI + EVI (Sentinel-2)
Encapsule la logique de ndvi.py dans une fonction callable.

Phases implémentées :
  Phase 1 — Tuiles Sentinel-2 correctes par région (MGRS vérifiées)
  Phase 2 — Masque cropland ESA WorldCover 2021 (classe 40)
  Phase 3 — Détection d'anomalie NDVI vs climatologie MODIS 2003-2023
  Phase 5 — EVI (Enhanced Vegetation Index) via bande B2 (bleu 490nm)
            Formule : EVI = 2.5 × (NIR-RED) / (NIR + 6×RED - 7.5×BLUE + 1)
            Avantages vs NDVI : correction Harmattan (aérosols), pas de saturation,
            meilleure distinction sol/végétation en zone Sahélienne sparse.
"""
import logging
import time
import datetime
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.merge import merge as rio_merge
from rasterio.windows import from_bounds as window_from_bounds
from backend.config.settings import settings
from backend.models.schemas import NdviResult, EudrCheck
from backend.core.pipeline.ndvi.anomaly import compute_anomaly, AnomalyResult

logger = logging.getLogger(__name__)

# Mapping région → tuile Sentinel-2 (MGRS, vérifiée via Copernicus OData)
# Couvertures géographiques vérifiées :
#   28PBB : Lon[-17.79→-16.76] Lat[14.37→15.37] — Dakar, Thiès
#   28PCA : Lon[-16.86→-15.84] Lat[13.47→14.47] — Kaolack
#   28PCU : Lon[-16.84→-16.19] Lat[11.67→12.66] — Ziguinchor
#   28PCC : Lon[-16.87→-15.84] Lat[15.28→16.28] — Saint-Louis
REGION_TO_TILE: dict[str, str] = {
    "Dakar":       "28PBB",
    "Thiès":       "28PBB",
    "Kaolack":     "28PCA",
    "Ziguinchor":  "28PCU",
    "Saint-Louis": "28PCC",
}


def _ndvi_to_score(ndvi_mean: float) -> float:
    """
    Convertit le NDVI moyen en score de risque 0–100.

    Calibré pour l'agriculture ouest-africaine (SN, GH, CI, NG).
    Les seuils européens (0.4+ = bonne végétation) sont inadaptés au Sahel :
    en saison sèche (nov–mars), un NDVI de 0.15–0.25 est NORMAL post-récolte.
    Un NDVI européen de 0.15 indique un stress sévère ; au Sahel, c'est la norme.

    Sources : EFSA 2022 (mycotoxins & climate), FAO/WFP Sahel vegetation reports.

    Seuils recalibrés :
        < 0.05  → eau / nuages / sol complètement nu → score élevé (70)
        0.05–0.15 → stress réel / sécheresse sévère  → score modéré-haut (50)
        0.15–0.30 → végétation sparse, normal post-récolte Sahel → score modéré (30)
        0.30–0.50 → végétation modérée, conditions favorables → score bas (15)
        > 0.50   → végétation dense, saison humide      → score minimal (5)
    """
    if ndvi_mean < 0.05:
        return 70.0
    elif ndvi_mean < 0.15:
        return 50.0
    elif ndvi_mean < 0.30:
        return 30.0
    elif ndvi_mean < 0.50:
        return 15.0
    else:
        return 5.0


def _evi_to_score(evi_mean: float) -> float:
    """
    Convertit l'EVI moyen en score de risque 0–100.

    Calibré pour l'Afrique de l'Ouest. Les seuils EVI sont ~20-30% plus bas
    que NDVI pour la même densité de végétation (EVI = moins biaisé par le sol).

    Sources : Huete et al. 2002 (EVI MODIS); FAO West Africa vegetation reports.

    Seuils recalibrés Sahel :
        < 0.05  → sol nu complet / eau             → score 70
        0.05–0.10 → stress sévère / post-récolte   → score 50
        0.10–0.22 → végétation sparse, normal Sahel → score 30
        0.22–0.40 → végétation modérée              → score 15
        > 0.40   → végétation dense, saison humide  → score 5
    """
    if evi_mean < 0.05:
        return 70.0
    elif evi_mean < 0.10:
        return 50.0
    elif evi_mean < 0.22:
        return 30.0
    elif evi_mean < 0.40:
        return 15.0
    else:
        return 5.0


# Mapping tuile Sentinel-2 → tiles WorldCover qui l'intersectent
TILE_TO_WC: dict[str, list[str]] = {
    "28PBB": ["N12W018.tif", "N15W018.tif"],
    "28PCA": ["N12W018.tif"],
    "28PCC": ["N15W018.tif"],
    "28PCU": ["N12W018.tif"],
}


def check_deforestation(tile_id: str, satellite_dir) -> EudrCheck:
    """
    Vérifie si la zone a subi une déforestation après le 31/12/2020 (EUDR Art. 3).

    Compare ESA WorldCover 2020 (v100) vs 2021 (v200) sur l'emprise de la tuile
    Sentinel-2. Pixels classe 10 (Tree cover) en 2020 mais pas en 2021 = déforestation.

    Retourne EudrCheck avec data_available=False si les tiles 2020 sont absentes.
    """
    wc_dir_2021 = satellite_dir / "worldcover"
    wc_dir_2020 = satellite_dir / "worldcover" / "2020"
    wc_names    = TILE_TO_WC.get(tile_id, [])

    if not wc_names:
        return EudrCheck(
            deforestation_free=True, deforested_pct=0.0,
            forest_pct_2020=0.0, forest_pct_2021=0.0,
            cutoff_date="2020-12-31",
            source="ESA WorldCover — tile non mappée",
            data_available=False,
        )

    # Vérifier que les tiles 2020 sont téléchargées
    missing_2020 = [n for n in wc_names if not (wc_dir_2020 / n).exists()]
    if missing_2020:
        logger.info(f"[EUDR] Tiles 2020 manquantes : {missing_2020} — data_available=False")
        return EudrCheck(
            deforestation_free=True, deforested_pct=0.0,
            forest_pct_2020=0.0, forest_pct_2021=0.0,
            cutoff_date="2020-12-31",
            source="ESA WorldCover 2020 — téléchargement en cours",
            data_available=False,
        )

    # Récupérer l'emprise de la tuile depuis B4.jp2
    b4_path = satellite_dir / tile_id / "B4.jp2"
    if not b4_path.exists():
        return EudrCheck(
            deforestation_free=True, deforested_pct=0.0,
            forest_pct_2020=0.0, forest_pct_2021=0.0,
            cutoff_date="2020-12-31",
            source="ESA WorldCover — B4.jp2 absent",
            data_available=False,
        )

    try:
        import rasterio.warp
        FOREST_CLASS = 10

        def _load_wc_clipped(wc_dir: object, names: list[str], bounds_wgs84) -> np.ndarray:
            """Charge + mosaic + clip les tiles WorldCover à l'emprise donnée (WGS84)."""
            paths = [wc_dir / n for n in names]
            if len(paths) == 1:
                with rasterio.open(paths[0]) as src:
                    win = window_from_bounds(*bounds_wgs84, src.transform)
                    arr = src.read(1, window=win)
                    return arr
            else:
                srcs = [rasterio.open(p) for p in paths]
                mosaic, mosaic_trans = rio_merge(srcs)
                for s in srcs:
                    s.close()
                # Clip mosaic to bounds
                from rasterio.transform import from_bounds as tb_from_bounds
                h, w = mosaic.shape[1], mosaic.shape[2]
                win = window_from_bounds(*bounds_wgs84, mosaic_trans)
                row_off = max(0, int(win.row_off))
                col_off = max(0, int(win.col_off))
                row_end = min(h, int(win.row_off + win.height))
                col_end = min(w, int(win.col_off + win.width))
                return mosaic[0, row_off:row_end, col_off:col_end]

        # Bounds de la tuile en WGS84
        with rasterio.open(b4_path) as src:
            bounds_utm = src.bounds
            bounds_wgs84 = rasterio.warp.transform_bounds(src.crs, "EPSG:4326", *bounds_utm)

        arr_2020 = _load_wc_clipped(wc_dir_2020, wc_names, bounds_wgs84)
        arr_2021 = _load_wc_clipped(wc_dir_2021, wc_names, bounds_wgs84)

        # Aligner les tailles (clip peut donner des shapes légèrement différentes)
        h = min(arr_2020.shape[0], arr_2021.shape[0])
        w = min(arr_2020.shape[1], arr_2021.shape[1])
        arr_2020 = arr_2020[:h, :w]
        arr_2021 = arr_2021[:h, :w]

        total = arr_2020.size
        forest_2020 = arr_2020 == FOREST_CLASS
        forest_2021 = arr_2021 == FOREST_CLASS

        # Pixels déforestés = forêt en 2020 ET plus forêt en 2021
        deforested  = forest_2020 & ~forest_2021
        n_defor     = int(deforested.sum())
        n_for_2020  = int(forest_2020.sum())
        n_for_2021  = int(forest_2021.sum())

        deforested_pct  = round(n_defor  / total * 100, 3)
        forest_pct_2020 = round(n_for_2020 / total * 100, 2)
        forest_pct_2021 = round(n_for_2021 / total * 100, 2)

        logger.info(
            f"[EUDR] {tile_id} | forêt 2020={forest_pct_2020}% → 2021={forest_pct_2021}% "
            f"| déforestation={deforested_pct}%"
        )

        return EudrCheck(
            deforestation_free=deforested_pct < 1.0,
            deforested_pct=deforested_pct,
            forest_pct_2020=forest_pct_2020,
            forest_pct_2021=forest_pct_2021,
            cutoff_date="2020-12-31",
            source="ESA WorldCover 2020 v100 / 2021 v200 — 10m",
            data_available=True,
        )

    except Exception as e:
        logger.warning(f"[EUDR] Erreur check_deforestation({tile_id}): {e}")
        return EudrCheck(
            deforestation_free=True, deforested_pct=0.0,
            forest_pct_2020=0.0, forest_pct_2021=0.0,
            cutoff_date="2020-12-31",
            source=f"ESA WorldCover — erreur : {e}",
            data_available=False,
        )


def _read_band(path, scale: int) -> tuple[np.ndarray, dict, object]:
    """Lit une bande JP2 à résolution réduite."""
    with rasterio.open(path) as src:
        h = src.height // scale
        w = src.width // scale
        data = src.read(
            1,
            out_shape=(h, w),
            resampling=Resampling.average,
        ).astype(np.float32)
        return data, src.profile, src.transform


def _read_cropland_mask(path, scale: int) -> np.ndarray:
    """
    Lit le masque cropland WorldCover à la même résolution que les bandes NDVI.

    Le masque est binaire uint8 (1=agricole, 0=autre).
    On rééchantillonne avec Resampling.nearest pour conserver les valeurs 0/1.
    Retourne un tableau bool de shape (H//scale, W//scale).
    """
    with rasterio.open(path) as src:
        h = src.height // scale
        w = src.width // scale
        data = src.read(
            1,
            out_shape=(h, w),
            resampling=Resampling.nearest,
        ).astype(np.uint8)
    return data == 1  # bool mask


def compute_ndvi(region: str, scale: int | None = None) -> NdviResult:
    """
    Calcule le NDVI pour une région donnée à partir des tuiles Sentinel-2 locales.

    Args:
        region: Région de production (ex: "Kaolack")
        scale:  Facteur de réduction (défaut : settings.sentinel_scale)

    Returns:
        NdviResult avec statistiques, classes de végétation et score de risque.
    """
    if scale is None:
        scale = settings.sentinel_scale

    satellite_dir = settings.data_satellite_dir

    # Résolution de la tuile correcte par région
    tile_id = REGION_TO_TILE.get(region)
    if tile_id:
        tile_dir = satellite_dir / tile_id
        b4_path  = tile_dir / "B4.jp2"
        b8_path  = tile_dir / "B8.jp2"
        if not b4_path.exists() or not b8_path.exists():
            # Fallback sur les fichiers à la racine (compatibilité legacy)
            b4_path = satellite_dir / "B4.jp2"
            b8_path = satellite_dir / "B8.jp2"
            logger.warning(
                f"Tuile {tile_id} absente pour {region} — fallback fichiers racine"
            )
    else:
        # Région inconnue → fichiers racine
        b4_path = satellite_dir / "B4.jp2"
        b8_path = satellite_dir / "B8.jp2"
        logger.warning(f"Région '{region}' non mappée — utilisation tuile par défaut")

    if not b4_path.exists() or not b8_path.exists():
        logger.warning(f"Tuiles Sentinel-2 absentes pour {region} — score NDVI par défaut (50)")
        return NdviResult(
            ndvi_mean=0.25, ndvi_min=0.0, ndvi_max=0.5,
            classes={"indisponible": 100.0},
            score=50.0,
            map_path=None,
        )

    t0 = time.time()
    logger.info(f"Calcul NDVI | region={region} | tile={tile_id or 'legacy'} | scale=1/{scale}")

    RED, profile, transform = _read_band(b4_path, scale)
    NIR, _, _               = _read_band(b8_path, scale)

    # ── Phase 5 : EVI (Enhanced Vegetation Index) ────────────────────────────
    # Nécessite B2.jp2 (bande bleue 490nm). Si absent : EVI skippé gracieusement.
    # Formule (Huete et al. 2002) :
    #   EVI = 2.5 × (NIR - RED) / (NIR + 6×RED - 7.5×BLUE + 1)
    # Les réflectances Sentinel-2 L2A sont en DN/10000 → on divise avant calcul.
    # Avantages pour l'Afrique de l'Ouest :
    #   1. Correction aérosols Harmattan (terme BLUE dans dénominateur)
    #   2. Pas de saturation à haute végétation (saison des pluies Casamance)
    #   3. Meilleure séparation sol/végétation en zone Sahélienne sparse
    EVI       = None
    evi_mean  = None
    b2_path   = tile_dir / "B2.jp2" if tile_id else None

    if b2_path and b2_path.exists():
        BLUE, _, _ = _read_band(b2_path, scale)
        # Passage en réflectance physique (0–1) depuis DN Sentinel-2 (×10000)
        NIR_r  = NIR  / 10000.0
        RED_r  = RED  / 10000.0
        BLUE_r = BLUE / 10000.0
        np.seterr(divide="ignore", invalid="ignore")
        denom = NIR_r + 6.0 * RED_r - 7.5 * BLUE_r + 1.0
        EVI   = np.where(denom != 0, 2.5 * (NIR_r - RED_r) / denom, np.nan)
        EVI   = np.clip(EVI, -1, 1).astype(np.float32)
        del BLUE, NIR_r, RED_r, BLUE_r, denom
        logger.info(f"EVI calculé (B2 disponible)")
    else:
        np.seterr(divide="ignore", invalid="ignore")
        logger.info("B2.jp2 absent — EVI skippé (Phase 5 non active)")

    NDVI = (NIR - RED) / (NIR + RED)
    NDVI = np.clip(NDVI, -1, 1)
    del RED, NIR

    total = NDVI.size

    # ── Phase 2 : Masque cropland WorldCover ────────────────────────────────
    # On limite l'analyse aux pixels classifiés "Cropland" (classe 40)
    # par ESA WorldCover 2021. Cela élimine eau, mangroves, zones urbaines
    # et forêts qui n'ont aucun lien avec le risque alimentaire.
    # Sans masque : une tuile côtière ou forestière biaise la moyenne NDVI.
    use_cropland  = False
    cropland_info = "aucun masque"

    if tile_id:
        mask_path = satellite_dir / tile_id / "cropland_mask.tif"
        if mask_path.exists():
            crop_mask       = _read_cropland_mask(mask_path, scale)
            n_crop          = int(crop_mask.sum())
            crop_pct        = n_crop / total * 100
            cropland_info   = f"{crop_pct:.1f}% pixels agricoles"

            if n_crop > total * 0.01:
                # Au moins 1% de pixels agricoles → masque utile
                use_cropland = True
                logger.info(f"Masque cropland appliqué : {cropland_info}")
            else:
                logger.warning(
                    f"Masque cropland trop sparse ({cropland_info}) — "
                    f"fallback filtre NDVI≥0"
                )

    # ── Filtrage des pixels d'analyse ────────────────────────────────────────
    # Priorité : pixels agricoles (cropland_mask) si disponibles.
    # Sinon fallback sur pixels terrestres (NDVI ≥ 0) pour exclure eau/nuages.
    land_mask = NDVI >= 0.0
    water_pct = float((~land_mask).sum() / total * 100)

    if use_cropland:
        # Intersect : pixel agricole ET NDVI valide (pas eau/nuage)
        analysis_mask  = crop_mask & land_mask
        analysis_label = "cropland"
    else:
        analysis_mask  = land_mask
        analysis_label = "terre (fallback)"

    land_pixels = NDVI[analysis_mask]

    if land_pixels.size < total * 0.05:
        # Moins de 5% de pixels d'analyse → données non représentatives.
        # (tuile majoritairement océan, nuageuse, ou pas assez de cropland)
        logger.warning(
            f"NDVI : seulement {land_pixels.size/total*100:.0f}% pixels "
            f"{analysis_label} — score neutre 50 appliqué"
        )
        ndvi_mean = 0.25  # végétation faible → score neutre (50)
        ndvi_min  = float(np.nanmin(NDVI))
        ndvi_max  = float(np.nanmax(NDVI))
    else:
        # Statistiques sur pixels d'analyse uniquement
        ndvi_mean = float(np.nanmean(land_pixels))
        ndvi_min  = float(np.nanmin(land_pixels))
        ndvi_max  = float(np.nanmax(land_pixels))

    # Occupation du sol — uniquement les 4 classes de couverture (%)
    # cropland_pct est un champ séparé dans NdviResult, PAS ici
    classes = {
        "eau_nuages":         round(water_pct, 1),
        "sol_nu":             float(((NDVI >= 0.0) & (NDVI < 0.2)).sum() / total * 100),
        "vegetation_moderee": float(((NDVI >= 0.2) & (NDVI < 0.5)).sum() / total * 100),
        "vegetation_dense":   float((NDVI >= 0.5).sum() / total * 100),
    }
    cropland_pct_val = round(land_pixels.size / total * 100, 1)

    # Export PNG
    map_path = None
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        output_dir = settings.data_outputs_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        png_path = output_dir / f"ndvi_{region.lower()}.png"

        fig, ax = plt.subplots(figsize=(10, 8))
        im = ax.imshow(NDVI, cmap="RdYlGn", vmin=-1, vmax=1)
        plt.colorbar(im, ax=ax, label="NDVI")
        ax.set_title(f"NDVI — {region} (1/{scale})")
        ax.axis("off")
        plt.tight_layout()
        plt.savefig(png_path, dpi=150, bbox_inches="tight")
        plt.close()
        map_path = str(png_path)
    except Exception as e:
        logger.warning(f"Export PNG NDVI échoué : {e}")

    # ── Phase 3 : Anomalie NDVI vs climatologie MODIS ────────────────────────
    # Compare le NDVI courant au NDVI historique (2003-2023) pour le même mois.
    # Un NDVI de 0.08 en mars est NORMAL pour Kaolack (mu=0.08), mais le même
    # 0.08 en août serait une catastrophe (mu=0.52 → z=-5.5 = sécheresse grave).
    # Le z-score capture ce contexte saisonnier que le score absolu ignore.
    current_month = datetime.datetime.now().month
    anomaly: AnomalyResult = compute_anomaly(
        region    = region,
        ndvi_mean = ndvi_mean,
        month     = current_month,
    )

    # ── Phase 5 : Moyenne EVI sur pixels d'analyse ───────────────────────────
    if EVI is not None and land_pixels.size >= total * 0.05:
        evi_pixels = EVI[analysis_mask]
        evi_valid  = evi_pixels[~np.isnan(evi_pixels)]
        if evi_valid.size > 0:
            evi_mean = float(np.nanmean(evi_valid))

    # Score final = score absolu + pénalité d'anomalie, clampé dans [0, 100]
    # Si EVI disponible, le score devient composite : 0.6×NDVI + 0.4×EVI
    score_ndvi_abs = _ndvi_to_score(ndvi_mean)
    if evi_mean is not None:
        score_evi_abs  = _evi_to_score(evi_mean)
        score_absolute = round(0.6 * score_ndvi_abs + 0.4 * score_evi_abs, 1)
        logger.info(
            f"Score composite NDVI+EVI | ndvi={ndvi_mean:.3f}(→{score_ndvi_abs}) "
            f"evi={evi_mean:.3f}(→{score_evi_abs}) composite={score_absolute}"
        )
    else:
        score_absolute = score_ndvi_abs

    score_final = float(np.clip(score_absolute + anomaly.penalty, 0.0, 100.0))

    logger.info(
        f"✓ NDVI calculé en {time.time()-t0:.1f}s | mean={ndvi_mean:.3f} | "
        f"score_absolu={score_absolute} | anomalie={anomaly.label} "
        f"(z={anomaly.z_score:+.2f}, +{anomaly.penalty}pts) | "
        f"score_final={score_final} | masque={cropland_info}"
    )

    # classes = occupation du sol uniquement (4 classes, tous floats, affichés en %)
    # cropland_pct est dans NdviResult.cropland_pct — PAS dans ce dict
    land_classes = {
        "eau_nuages":         round(classes["eau_nuages"], 1),
        "sol_nu":             round(classes["sol_nu"], 1),
        "vegetation_moderee": round(classes["vegetation_moderee"], 1),
        "vegetation_dense":   round(classes["vegetation_dense"], 1),
    }

    # anomaly = champ séparé — NdviAnomaly (non affiché dans Occupation du sol)
    from backend.models.schemas import NdviAnomaly
    ndvi_anomaly = NdviAnomaly(
        z_score   = round(anomaly.z_score, 2),
        mu        = round(anomaly.mu, 3),
        sigma     = round(anomaly.sigma, 3),
        penalty   = anomaly.penalty,
        label     = anomaly.label,
        available = anomaly.available,
    ) if anomaly.available else None

    # ── EUDR : Vérification déforestation (WorldCover 2020 vs 2021) ─────────────
    eudr_check = None
    if tile_id:
        eudr_check = check_deforestation(tile_id, satellite_dir)

    return NdviResult(
        ndvi_mean=round(ndvi_mean, 4),
        ndvi_min=round(ndvi_min, 4),
        ndvi_max=round(ndvi_max, 4),
        classes=land_classes,
        cropland_pct=cropland_pct_val,
        score=score_final,
        anomaly=ndvi_anomaly,
        eudr=eudr_check,
        evi_mean=round(evi_mean, 4) if evi_mean is not None else None,
        evi_available=evi_mean is not None,
        map_path=map_path,
    )
