/**
 * DIGBA — Types TypeScript
 * Miroir exact des schémas Pydantic du backend (models/schemas.py).
 */

// ── Enums ──────────────────────────────────────────────────────────────────

// noix_de_cajou retiré — FB-01
export type Produit = "arachide" | "mil" | "sorgho" | "sesame" | "cacao";
export type Stockage = "silo_ventile" | "hangar" | "plein_air";
export type NiveauRisque = "Faible" | "Modéré" | "Élevé";

// ── Request ────────────────────────────────────────────────────────────────

export interface ScoreRequest {
  produit: Produit;
  region: string;
  country: string;
  fournisseur: string;
  stockage: Stockage;
  certifications: string[];
}

// ── Pipeline results ───────────────────────────────────────────────────────

export interface NdviAnomaly {
  z_score: number;
  mu: number;
  sigma: number;
  penalty: number;
  label: string;
  available: boolean;
}

export interface NdviResult {
  score: number;
  ndvi_mean: number;
  ndvi_min: number;
  ndvi_max: number;
  classes: {                      // occupation du sol uniquement (4 clés fixes)
    eau_nuages: number;
    sol_nu: number;
    vegetation_moderee: number;
    vegetation_dense: number;
  };
  cropland_pct: number;           // % pixels agricoles analysés (WorldCover)
  anomaly: NdviAnomaly | null;    // Phase 3 — anomalie vs climatologie MODIS
  evi_mean: number | null;        // Phase 5 — EVI (null si B2 absent)
  evi_available: boolean;
  map_path: string | null;
}

export interface WeatherAnomaly {
  temp_z: number;
  precip_z: number;
  temp_mu: number;
  precip_mu: number;
  temp_label: string;
  precip_label: string;
  penalty: number;
}

export interface WeatherResult {
  score: number;
  city: string;
  lat: number;
  lon: number;
  humidity: number;
  temp_c: number;
  precip_mm: number;
  wind_speed: number;
  weather_desc: string;
  humidity_score: number;
  temp_score: number;
  anomaly: WeatherAnomaly | null;
}

export interface RasffResult {
  score: number;
  nb_rejets_24m: number;
  nb_rejets_region: number;
  blackliste: boolean;
  derniers_dangers: string[];
}

export interface OperatorResult {
  score: number;
  stockage: string;
  certifications: string[];
  facteurs: Record<string, string>;
}

export interface ScoreDetailsData {
  ndvi: NdviResult;
  weather: WeatherResult;
  rasff: RasffResult;
  operator: OperatorResult;
}

// ── Preview (wizard step 1) ────────────────────────────────────────────────

export interface PreviewResponse {
  region: string;
  country: string;
  ndvi: NdviResult;
  weather: WeatherResult;
}

// ── Score response ─────────────────────────────────────────────────────────

export interface ScoreResponse {
  score: number;
  niveau_risque: NiveauRisque;
  decision: string;
  details: ScoreDetailsData;
}

// ── RASFF stats ────────────────────────────────────────────────────────────

export interface RasffStatsDanger {
  danger: string;
  categorie_danger: string;
  nb_rejets: number;
  dernier_rejet: string;
}

export interface RasffStatsFournisseur {
  fournisseur: string;
  nb_rejets: number;
  dernier_rejet: string;
  dangers: string;
}

// ── History (localStorage) ─────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  date: string;
  produit: Produit;
  region: string;
  country: string;
  fournisseur: string;
  stockage: Stockage;
  certifications: string[];
  score: number;
  niveau_risque: NiveauRisque;
}
