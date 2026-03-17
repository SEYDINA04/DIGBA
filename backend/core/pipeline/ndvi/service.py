"""
DIGBA — Pipeline NDVI (Sentinel-2)
Encapsule la logique de ndvi.py dans une fonction callable.
"""
import logging
import time
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import Affine
from backend.config.settings import settings
from backend.models.schemas import NdviResult

logger = logging.getLogger(__name__)

# Mapping région → tuile Sentinel-2
REGION_TO_TILE: dict[str, str] = {
    "Kaolack":    "28PBV",
    "Thiès":      "28PBV",
    "Dakar":      "28PBV",
    "Ziguinchor": "28PCQ",
    "Saint-Louis": "28QCE",
}


def _ndvi_to_score(ndvi_mean: float) -> float:
    """Convertit la valeur NDVI moyenne en score de risque 0–100."""
    if ndvi_mean < 0:
        return 100.0
    elif ndvi_mean < 0.2:
        return 80.0
    elif ndvi_mean < 0.4:
        return 50.0
    elif ndvi_mean < 0.6:
        return 20.0
    else:
        return 5.0


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
    b4_path = satellite_dir / "B4.jp2"
    b8_path = satellite_dir / "B8.jp2"

    if not b4_path.exists() or not b8_path.exists():
        logger.warning("Tuiles Sentinel-2 absentes — score NDVI par défaut (50)")
        return NdviResult(
            ndvi_mean=0.25, ndvi_min=0.0, ndvi_max=0.5,
            classes={"indisponible": 100.0},
            score=50.0,
            map_path=None,
        )

    t0 = time.time()
    logger.info(f"Calcul NDVI | region={region} | scale=1/{scale}")

    RED, profile, transform = _read_band(b4_path, scale)
    NIR, _, _               = _read_band(b8_path, scale)

    np.seterr(divide="ignore", invalid="ignore")
    NDVI = (NIR - RED) / (NIR + RED)
    NDVI = np.clip(NDVI, -1, 1)
    del RED, NIR

    # Statistiques globales
    ndvi_mean = float(np.nanmean(NDVI))
    ndvi_min  = float(np.nanmin(NDVI))
    ndvi_max  = float(np.nanmax(NDVI))
    total     = NDVI.size

    classes = {
        "eau_nuages":          float((NDVI < 0.0).sum() / total * 100),
        "sol_nu":              float(((NDVI >= 0.0) & (NDVI < 0.2)).sum() / total * 100),
        "vegetation_moderee":  float(((NDVI >= 0.2) & (NDVI < 0.5)).sum() / total * 100),
        "vegetation_dense":    float((NDVI >= 0.5).sum() / total * 100),
    }

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

    score = _ndvi_to_score(ndvi_mean)
    logger.info(f"✓ NDVI calculé en {time.time()-t0:.1f}s | mean={ndvi_mean:.3f} | score={score}")

    return NdviResult(
        ndvi_mean=round(ndvi_mean, 4),
        ndvi_min=round(ndvi_min, 4),
        ndvi_max=round(ndvi_max, 4),
        classes={k: round(v, 1) for k, v in classes.items()},
        score=score,
        map_path=map_path,
    )
