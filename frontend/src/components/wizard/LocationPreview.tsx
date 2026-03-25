/**
 * DIGBA Wizard — Prévisualisation zone : NDVI + Météo côte-à-côte
 */
import type { PreviewResponse } from "../../types/api";
import type { CountryData } from "../../data/countries";
import { useLang } from "../../i18n/LangContext";

interface LocationPreviewProps {
  data: PreviewResponse;
  country: CountryData;
  onContinue: () => void;
}

function RiskBar({ score }: { score: number }) {
  const color =
    score <= 35 ? "bg-emerald-400" : score <= 65 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
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
      {/* Stacked bar */}
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
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {entries.map(([key, val]) => (
          <span key={key} className="flex items-center gap-1 text-xs text-white/70">
            <span className={`inline-block h-2 w-2 rounded-full ${palette[key] ?? "bg-gray-400"}`} />
            {labels[key] ?? key} {val.toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function WeatherIcon({ desc }: { desc: string }) {
  const d = desc.toLowerCase();
  if (d.includes("rain") || d.includes("pluie") || d.includes("drizzle")) return "🌧️";
  if (d.includes("cloud") || d.includes("nuage") || d.includes("overcast")) return "☁️";
  if (d.includes("thunder") || d.includes("storm")) return "⛈️";
  if (d.includes("fog") || d.includes("brouillard")) return "🌫️";
  if (d.includes("snow") || d.includes("neige")) return "❄️";
  if (d.includes("partly")) return "⛅";
  return "☀️";
}

const VEG_PALETTE: Record<string, string> = {
  eau_nuages: "bg-blue-400",
  sol_nu: "bg-amber-400",
  vegetation_moderee: "bg-emerald-400",
  vegetation_dense: "bg-emerald-600",
  indisponible: "bg-gray-400",
};

export function LocationPreview({ data, country, onContinue }: LocationPreviewProps) {
  const { t } = useLang();
  const { ndvi, weather, region } = data;

  const ndviLevel =
    ndvi.ndvi_mean >= 0.5 ? t.wizard.ndvi_levels.dense :
    ndvi.ndvi_mean >= 0.3 ? t.wizard.ndvi_levels.moderate :
    ndvi.ndvi_mean >= 0.1 ? t.wizard.ndvi_levels.low : t.wizard.ndvi_levels.very_low;

  const ndviColor =
    ndvi.ndvi_mean >= 0.5 ? "text-emerald-300" :
    ndvi.ndvi_mean >= 0.3 ? "text-lime-300" :
    ndvi.ndvi_mean >= 0.1 ? "text-amber-300" : "text-red-300";

  return (
    <div className="space-y-4">
      {/* Zone badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-xl">{country.flag}</span>
        <span className="font-medium text-foreground">{region}, {country.name}</span>
        <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
          {t.wizard.analysis_done}
        </span>
      </div>

      {/* Two cards side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── NDVI Card ── */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-5 text-white shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80">
                NDVI Satellite
              </p>
              <p className="text-xs text-white/50 mt-0.5">Sentinel-2 · {region}</p>
            </div>
            <span className="text-2xl">🛰️</span>
          </div>

          {/* Big NDVI number */}
          <div className="mb-4">
            <span className={`text-5xl font-black tabular-nums ${ndviColor}`}>
              {ndvi.ndvi_mean.toFixed(3)}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/60">{t.wizard.ndvi_mean}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 ${ndviColor}`}>
                {ndviLevel}
              </span>
            </div>
          </div>

          {/* Min/Max */}
          <div className="flex gap-4 mb-4 text-xs text-white/60">
            <span>Min <span className="text-white font-medium">{ndvi.ndvi_min.toFixed(2)}</span></span>
            <span>Max <span className="text-white font-medium">{ndvi.ndvi_max.toFixed(2)}</span></span>
          </div>

          {/* Vegetation breakdown */}
          <div className="mb-3">
            <p className="text-xs text-white/50 mb-1.5">{t.wizard.land_cover}</p>
            <VegeBar classes={ndvi.classes} labels={t.wizard.vege_labels} palette={VEG_PALETTE} />
          </div>

          {/* Cropland % — champ séparé, affiché sous la barre */}
          {ndvi.cropland_pct !== undefined && (
            <div className="mb-3 flex items-center gap-2 text-xs text-white/60">
              <span className="text-emerald-400">🌾</span>
              <span>
                Terres agricoles analysées :{" "}
                <span className="text-white font-semibold">{ndvi.cropland_pct.toFixed(1)}%</span>
                {ndvi.cropland_pct < 5 && (
                  <span className="ml-1 text-amber-400">(zone peu agricole)</span>
                )}
              </span>
            </div>
          )}

          {/* Risk score */}
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>{t.wizard.risk_score}</span>
              <span className="text-white font-semibold">{ndvi.score.toFixed(0)}/100</span>
            </div>
            <RiskBar score={ndvi.score} />
          </div>
        </div>

        {/* ── Weather Card ── */}
        <div className="rounded-2xl bg-gradient-to-br from-sky-800 via-blue-700 to-indigo-700 p-5 text-white shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-300/80">
                Météo
              </p>
              <p className="text-xs text-white/50 mt-0.5">Open-Meteo · {weather.city}</p>
            </div>
            <span className="text-2xl">
              <WeatherIcon desc={weather.weather_desc} />
            </span>
          </div>

          {/* Big temperature */}
          <div className="mb-4">
            <span className="text-5xl font-black text-sky-200 tabular-nums">
              {weather.temp_c}°
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/60">{t.wizard.temp_c}</span>
              <span className="text-xs text-white/80 px-2 py-0.5 rounded-full bg-white/10">
                {weather.weather_desc}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { icon: "💧", label: t.wizard.humidity,      value: `${weather.humidity}%` },
              { icon: "🌧️", label: t.wizard.precipitation, value: `${weather.precip_mm} mm` },
              { icon: "💨", label: "Vent",                 value: `${weather.wind_speed?.toFixed(1) ?? "—"} km/h` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="rounded-xl bg-white/10 p-3">
                <p className="text-lg">{icon}</p>
                <p className="text-xs text-white/60 mt-1">{label}</p>
                <p className="text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Anomalie climatologique ERA5 */}
          {weather.anomaly && (
            <div className="mb-4 rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Vs normale historique ERA5
              </p>
              <p className="text-xs text-white/80">{weather.anomaly.temp_label}</p>
              <p className="text-xs text-white/80">{weather.anomaly.precip_label}</p>
              {weather.anomaly.penalty > 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  +{weather.anomaly.penalty} pts pénalité anomalie
                </p>
              )}
            </div>
          )}

          {/* Risk score */}
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>{t.wizard.risk_score}</span>
              <span className="text-white font-semibold">{weather.score.toFixed(0)}/100</span>
            </div>
            <RiskBar score={weather.score} />
          </div>
        </div>
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:brightness-110 transition-all duration-200 focus:outline-none"
      >
        <span>📦</span>
        {t.wizard.btn_continue}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}
