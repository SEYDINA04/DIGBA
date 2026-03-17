/**
 * DIGBA Wizard — Prévisualisation zone : NDVI + Météo côte-à-côte
 */
import type { PreviewResponse } from "../../types/api";
import type { CountryData } from "../../data/countries";

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

function VegeBar({ classes }: { classes: Record<string, number> }) {
  const palette: Record<string, string> = {
    eau_nuages: "bg-blue-400",
    sol_nu: "bg-amber-400",
    vegetation_moderee: "bg-emerald-400",
    vegetation_dense: "bg-emerald-600",
    indisponible: "bg-gray-400",
  };
  const labels: Record<string, string> = {
    eau_nuages: "Eau/Nuages",
    sol_nu: "Sol nu",
    vegetation_moderee: "Vég. modérée",
    vegetation_dense: "Vég. dense",
    indisponible: "N/A",
  };
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

export function LocationPreview({ data, country, onContinue }: LocationPreviewProps) {
  const { ndvi, weather, region } = data;

  const ndviLevel =
    ndvi.ndvi_mean >= 0.5 ? "Dense" :
    ndvi.ndvi_mean >= 0.3 ? "Modérée" :
    ndvi.ndvi_mean >= 0.1 ? "Faible" : "Très faible";

  const ndviColor =
    ndvi.ndvi_mean >= 0.5 ? "text-emerald-300" :
    ndvi.ndvi_mean >= 0.3 ? "text-lime-300" :
    ndvi.ndvi_mean >= 0.1 ? "text-amber-300" : "text-red-300";

  return (
    <div className="space-y-4">
      {/* Zone badge */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-xl">{country.flag}</span>
        <span className="font-medium text-gray-700">{region}, {country.name}</span>
        <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
          Analyse terminée ✓
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
              <span className="text-xs text-white/60">Indice NDVI moyen</span>
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
            <p className="text-xs text-white/50 mb-1.5">Occupation du sol</p>
            <VegeBar classes={ndvi.classes} />
          </div>

          {/* Risk score */}
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Score de risque</span>
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
              <p className="text-xs text-white/50 mt-0.5">wttr.in · {weather.city}</p>
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
              <span className="text-xs text-white/60">Température (°C)</span>
              <span className="text-xs text-white/80 px-2 py-0.5 rounded-full bg-white/10">
                {weather.weather_desc}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { icon: "💧", label: "Humidité",     value: `${weather.humidity}%` },
              { icon: "🌧️", label: "Précipitation", value: `${weather.precip_mm} mm` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="rounded-xl bg-white/10 p-3">
                <p className="text-lg">{icon}</p>
                <p className="text-xs text-white/60 mt-1">{label}</p>
                <p className="text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Risk score */}
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Score de risque</span>
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
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 focus:outline-none"
      >
        <span>📦</span>
        Continuer — Détails du lot
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}
