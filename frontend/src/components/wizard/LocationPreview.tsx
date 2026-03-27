/**
 * DIGBA Wizard — Prévisualisation zone : NDVI + Météo côte-à-côte
 */
import {
  Satellite, Wheat, Droplets, CloudRain, Wind,
  Sun, Cloud, CloudLightning, Snowflake, CloudSun, CloudFog,
  MapPin, Package, ArrowRight, CheckCircle,
  Thermometer, Check, AlertTriangle, TreePine,
} from "lucide-react";
import type { PreviewResponse } from "../../types/api";
import type { CountryData } from "../../data/countries";
import { REGION_COORDS } from "../../data/countries";
import { useLang } from "../../i18n/LangContext";

interface LocationPreviewProps {
  data: PreviewResponse;
  country: CountryData;
  onContinue: () => void;
}

function RiskBar({ score }: { score: number }) {
  const color =
    score <= 35 ? "bg-emerald-500" : score <= 65 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function VegeBar({ classes, labels, palette }: {
  classes: Record<string, number>;
  labels: Record<string, string>;
  palette: Record<string, string>;
}) {
  const entries = Object.entries(classes).filter(([, v]) => v > 0);
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full gap-px">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className={`${palette[key] ?? "bg-gray-400"} h-full transition-all duration-1000`}
            style={{ width: `${val}%` }}
            title={`${labels[key] ?? key}: ${val.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {entries.map(([key, val]) => (
          <span key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`inline-block h-2 w-2 rounded-full ${palette[key] ?? "bg-gray-400"}`} />
            {labels[key] ?? key} {val.toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function WeatherIcon({ desc, className }: { desc: string; className?: string }) {
  const d = desc.toLowerCase();
  const cls = className ?? "h-5 w-5";
  if (d.includes("thunder") || d.includes("storm"))          return <CloudLightning className={`${cls} text-yellow-500`} />;
  if (d.includes("rain") || d.includes("pluie") || d.includes("drizzle")) return <CloudRain className={`${cls} text-sky-500`} />;
  if (d.includes("fog") || d.includes("brouillard"))         return <CloudFog className={`${cls} text-gray-400`} />;
  if (d.includes("snow") || d.includes("neige"))             return <Snowflake className={`${cls} text-blue-400`} />;
  if (d.includes("partly"))                                   return <CloudSun className={`${cls} text-amber-500`} />;
  if (d.includes("cloud") || d.includes("nuage") || d.includes("overcast")) return <Cloud className={`${cls} text-slate-400`} />;
  return <Sun className={`${cls} text-amber-500`} />;
}

/** Picks the right language part from a bilingual [EN]...[FR]... label */
function parseBilingual(raw: string, lang: string): string {
  const parts = raw.split("||").map(s => s.trim());
  const enRaw = parts.find(p => p.startsWith("[EN]")) ?? parts[0] ?? raw;
  const frRaw = parts.find(p => p.startsWith("[FR]")) ?? parts[1] ?? raw;
  return (lang === "en" ? enRaw : frRaw).replace(/^\[(EN|FR)\]\s*/, "");
}

/** Associe une icône lucide à un label d'anomalie météo bilingue */
function AnomalyRow({ label, lang }: { label: string; lang: string }) {
  const text = parseBilingual(label, lang);
  const l = text.toLowerCase();
  let Icon = Check;
  let color = "text-emerald-600";

  if (l.includes("heat wave") || l.includes("canicule") || l.includes("abnormal heat") || l.includes("chaleur")) {
    Icon = Thermometer; color = "text-red-500";
  } else if (l.includes("cold") || l.includes("fraîcheur") || l.includes("fraicheur")) {
    Icon = Snowflake;   color = "text-blue-500";
  } else if (l.includes("rainfall") || l.includes("excess") || l.includes("excès") || l.includes("pluies")) {
    Icon = CloudRain;   color = "text-sky-500";
  } else if (l.includes("drought") || l.includes("deficit") || l.includes("sécheresse") || l.includes("déficit")) {
    Icon = Sun;         color = "text-amber-500";
  }

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className="text-xs text-foreground/80">{text}</span>
    </div>
  );
}

const VEG_PALETTE: Record<string, string> = {
  eau_nuages:         "bg-blue-400",
  sol_nu:             "bg-amber-400",
  vegetation_moderee: "bg-emerald-400",
  vegetation_dense:   "bg-emerald-600",
  indisponible:       "bg-gray-300",
};

export function LocationPreview({ data, country, onContinue }: LocationPreviewProps) {
  const { t, lang } = useLang();
  const { ndvi, weather, region } = data;
  const coords = REGION_COORDS[region];

  const ndviLevel =
    ndvi.ndvi_mean >= 0.5 ? t.wizard.ndvi_levels.dense :
    ndvi.ndvi_mean >= 0.3 ? t.wizard.ndvi_levels.moderate :
    ndvi.ndvi_mean >= 0.1 ? t.wizard.ndvi_levels.low : t.wizard.ndvi_levels.very_low;

  const ndviColor =
    ndvi.ndvi_mean >= 0.5 ? "text-emerald-600" :
    ndvi.ndvi_mean >= 0.3 ? "text-lime-600" :
    ndvi.ndvi_mean >= 0.1 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-4">

      {/* Zone badge — FB-02 : GPS coords */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-xl">{country.flag}</span>
        <span className="font-semibold text-foreground">{region}, {country.name}</span>
        {coords && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-full">
            <MapPin className="h-3 w-3 text-primary shrink-0" />
            {Math.abs(coords.lat).toFixed(6)}°{coords.lat >= 0 ? "N" : "S"}&nbsp;
            {Math.abs(coords.lon).toFixed(6)}°{coords.lon < 0 ? "W" : "E"}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
          <CheckCircle className="h-3 w-3" />
          {t.wizard.analysis_done}
        </span>
      </div>

      {/* Two cards — FB-04 : design épuré (fond neutre, accent couleur) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── NDVI Card ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Satellite className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                    NDVI Satellite
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Sentinel-2 · {region}</p>
              </div>
              <span className={`text-3xl font-black tabular-nums ${ndviColor}`}>
                {ndvi.ndvi_mean.toFixed(3)}
              </span>
            </div>

            {/* NDVI label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground">{t.wizard.ndvi_mean}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-muted ${ndviColor}`}>
                {ndviLevel}
              </span>
            </div>

            {/* Min/Max */}
            <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
              <span>Min <span className="text-foreground font-medium">{ndvi.ndvi_min.toFixed(2)}</span></span>
              <span>Max <span className="text-foreground font-medium">{ndvi.ndvi_max.toFixed(2)}</span></span>
            </div>

            {/* Vegetation breakdown */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1.5">{t.wizard.land_cover}</p>
              <VegeBar classes={ndvi.classes} labels={t.wizard.vege_labels} palette={VEG_PALETTE} />
            </div>

            {/* Cropland % */}
            {ndvi.cropland_pct !== undefined && (
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Wheat className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  {t.wizard.cropland}:{" "}
                  <span className="text-foreground font-semibold">{ndvi.cropland_pct.toFixed(1)}%</span>
                  {ndvi.cropland_pct < 5 && (
                    <span className="ml-1 text-amber-500">{t.wizard.low_agri_zone}</span>
                  )}
                </span>
              </div>
            )}

            {/* EUDR Deforestation Check */}
            {ndvi.eudr && (
              <div className={`mb-3 rounded-lg border p-2.5 ${
                !ndvi.eudr.data_available
                  ? "bg-muted/30 border-border"
                  : ndvi.eudr.deforestation_free
                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                    : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TreePine className={`h-3.5 w-3.5 shrink-0 ${
                    !ndvi.eudr.data_available ? "text-muted-foreground"
                    : ndvi.eudr.deforestation_free ? "text-emerald-600" : "text-red-500"
                  }`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    !ndvi.eudr.data_available ? "text-muted-foreground"
                    : ndvi.eudr.deforestation_free ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"
                  }`}>EUDR</span>
                </div>
                {!ndvi.eudr.data_available ? (
                  <p className="text-xs text-muted-foreground">{ndvi.eudr.source}</p>
                ) : (
                  <>
                    <p className={`text-xs font-medium ${ndvi.eudr.deforestation_free ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
                      {ndvi.eudr.deforestation_free
                        ? `Deforestation-free after ${ndvi.eudr.cutoff_date}`
                        : `⚠ ${ndvi.eudr.deforested_pct.toFixed(2)}% deforested after ${ndvi.eudr.cutoff_date}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Forest 2020: {ndvi.eudr.forest_pct_2020}% → 2021: {ndvi.eudr.forest_pct_2021}%
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Risk score */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{t.wizard.risk_score}</span>
                <span className="text-foreground font-semibold">{ndvi.score.toFixed(0)}/100</span>
              </div>
              <RiskBar score={ndvi.score} />
            </div>
          </div>
        </div>

        {/* ── Weather Card ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-sky-500 to-indigo-400" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <WeatherIcon desc={weather.weather_desc} className="h-3.5 w-3.5" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
                    {t.wizard.weather}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Open-Meteo · {weather.city}</p>
                {weather.lat !== 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <p className="text-xs text-muted-foreground/60 tabular-nums font-mono">
                      {Math.abs(weather.lat).toFixed(6)}°{weather.lat >= 0 ? "N" : "S"}&nbsp;
                      {Math.abs(weather.lon).toFixed(6)}°{weather.lon < 0 ? "W" : "E"}
                    </p>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-sky-600 tabular-nums">
                  {weather.temp_c}°
                </span>
                <p className="text-xs text-muted-foreground">{t.wizard.temp_c}</p>
              </div>
            </div>

            {/* Weather desc badge */}
            <div className="mb-4">
              <span className="inline-block text-xs text-foreground/80 px-2 py-0.5 rounded-full bg-muted">
                {weather.weather_desc}
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { Icon: Droplets,  label: t.wizard.humidity,      value: `${weather.humidity}%` },
                { Icon: CloudRain, label: t.wizard.precipitation,  value: `${weather.precip_mm} mm` },
                { Icon: Wind,      label: t.wizard.wind,            value: `${weather.wind_speed?.toFixed(1) ?? "—"} km/h` },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="rounded-lg bg-muted/50 p-2.5">
                  <Icon className="h-4 w-4 text-sky-500 mb-1" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Anomalie ERA5 */}
            {weather.anomaly && (
              <div className="mb-4 rounded-lg bg-muted/40 border border-border p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t.wizard.era5_baseline}
                </p>
                <AnomalyRow label={weather.anomaly.temp_label} lang={lang} />
                <AnomalyRow label={weather.anomaly.precip_label} lang={lang} />
                {weather.anomaly.penalty > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 font-semibold">
                      {t.wizard.anomaly_penalty(weather.anomaly.penalty)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Risk score */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{t.wizard.risk_score}</span>
                <span className="text-foreground font-semibold">{weather.score.toFixed(0)}/100</span>
              </div>
              <RiskBar score={weather.score} />
            </div>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:brightness-110 transition-all duration-200 focus:outline-none"
      >
        <Package className="h-4 w-4" />
        {t.wizard.btn_continue}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
