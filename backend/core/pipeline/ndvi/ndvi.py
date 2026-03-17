import time
from pathlib import Path
import numpy as np
import rasterio
from rasterio.enums import Resampling
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ── Chemins des dossiers de données ──────────────────────
_ROOT      = Path(__file__).parents[4]          # DIGBA/backend/
DATA_DIR   = _ROOT / "data" / "satellite"       # backend/data/satellite/
OUTPUT_DIR = _ROOT / "data" / "outputs"         # backend/data/outputs/
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def log(msg, t0=None):
    elapsed = f" ({time.time()-t0:.1f}s)" if t0 else ""
    print(f"[{time.strftime('%H:%M:%S')}] {msg}{elapsed}", flush=True)

# ── Paramètre clé : facteur de réduction ─────────────────
# SCALE=4 → 2745x2745px  ~45MB RAM   (rapide, recommandé)
# SCALE=2 → 5490x5490px  ~180MB RAM  (meilleur détail)
# SCALE=1 → 10980x10980  ~960MB RAM  (pleine résolution)
SCALE = 4

start = time.time()
log(f"=== NDVI | scale 1/{SCALE} ===")

def read_band(path):
    with rasterio.open(path) as src:
        h, w = src.height // SCALE, src.width // SCALE
        log(f"  → {path} : lecture {h}x{w} px")
        data = src.read(
            1,
            out_shape=(h, w),
            resampling=Resampling.average
        ).astype(np.float32)  # float32 = moitié RAM vs float64
        return data, src.profile, src.transform

log("Lecture B4 (RED)...")
t = time.time()
RED, profile, transform = read_band(DATA_DIR / "B4.jp2")
log("✓ B4 chargé", t)

log("Lecture B8 (NIR)...")
t = time.time()
NIR, _, _ = read_band(DATA_DIR / "B8.jp2")
log("✓ B8 chargé", t)

log(f"RAM utilisée (approx) : {(RED.nbytes + NIR.nbytes) / 1e6:.0f} MB")

# ── Calcul NDVI ───────────────────────────────────────────
log("Calcul NDVI...")
t = time.time()
np.seterr(divide='ignore', invalid='ignore')
NDVI = (NIR - RED) / (NIR + RED)
NDVI = np.clip(NDVI, -1, 1)
del RED, NIR  # libère RAM immédiatement
log("✓ NDVI calculé", t)
log(f"  → min: {NDVI.min():.3f} | max: {NDVI.max():.3f} | mean: {np.nanmean(NDVI):.3f}")

# ── Analyse par classe ────────────────────────────────────
total = NDVI.size
classes = {
    "Eau / nuages      (< 0.0) ": NDVI < 0.0,
    "Sol nu            (0.0–0.2)": (NDVI >= 0.0) & (NDVI < 0.2),
    "Végétation éparse (0.2–0.5)": (NDVI >= 0.2) & (NDVI < 0.5),
    "Végétation dense  (>= 0.5)": NDVI >= 0.5,
}
for label, mask in classes.items():
    print(f"  {label} : {mask.sum()/total*100:.1f}%")
    
# ── Export GeoTIFF ────────────────────────────────────────
log("Export GeoTIFF...")
t = time.time()
nrows = int(NDVI.shape[0])
ncols = int(NDVI.shape[1])
from rasterio.transform import Affine
new_transform = Affine(
    transform.a * SCALE, transform.b, transform.c,
    transform.d, transform.e * SCALE, transform.f
)
profile.update(
    dtype='float32',
    count=1,
    driver='GTiff',
    height=nrows,
    width=ncols,
    transform=new_transform,
    compress='lzw'
)
with rasterio.open(OUTPUT_DIR / "ndvi_output.tif", "w", **profile) as dst:
    dst.write(NDVI.astype(np.float32), 1)
log("✓ ndvi_output.tif sauvegardé", t)

# ── Visualisation ─────────────────────────────────────────
log("Génération carte PNG...")
t = time.time()
fig, ax = plt.subplots(figsize=(10, 8))
im = ax.imshow(NDVI, cmap='RdYlGn', vmin=-1, vmax=1)
plt.colorbar(im, ax=ax, label='NDVI')
ax.set_title(f'NDVI - Sentinel-2 | 28PBV | 2024-01-12 (1/{SCALE})')
ax.axis('off')
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "ndvi_map.png", dpi=150, bbox_inches='tight')
plt.close()
log("✓ ndvi_map.png sauvegardé", t)

log(f"=== Terminé en {time.time()-start:.1f}s ===")
