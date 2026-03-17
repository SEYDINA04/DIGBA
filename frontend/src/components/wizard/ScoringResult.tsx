/**
 * DIGBA Wizard — Résultat final : score animé + RASFF + Opérateur
 */
import { useEffect, useState } from "react";
import type { ScoreResponse } from "../../types/api";
import type { CountryData } from "../../data/countries";

interface ScoringResultProps {
  result: ScoreResponse;
  country: CountryData;
  region: string;
  onDone: () => void;
}

/** Count-up animation hook */
function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, durationMs]);
  return value;
}

const NIVEAU_CONFIG = {
  Faible: {
    gradient: "from-emerald-600 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-500",
    icon: "✅",
  },
  Modéré: {
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-500",
    icon: "⚠️",
  },
  Élevé: {
    gradient: "from-red-600 to-rose-500",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-500",
    icon: "🚫",
  },
} as const;

export function ScoringResult({ result, country, region, onDone }: ScoringResultProps) {
  const { score, niveau_risque, decision, details } = result;
  const { rasff, operator } = details;
  const cfg = NIVEAU_CONFIG[niveau_risque] ?? NIVEAU_CONFIG["Modéré"];
  const displayScore = useCountUp(score);

  return (
    <div className="space-y-5">

      {/* ── Score hero ── */}
      <div className={`rounded-2xl bg-gradient-to-br ${cfg.gradient} p-6 text-white text-center shadow-xl`}>
        {/* Zone badge */}
        <p className="text-xs text-white/70 mb-3">
          {country.flag} {region}, {country.name}
        </p>

        {/* Animated score */}
        <div className="relative inline-block">
          <span className="text-8xl font-black tabular-nums leading-none">
            {displayScore}
          </span>
          <span className="text-3xl font-light text-white/70">%</span>
        </div>
        <p className="text-sm text-white/70 mt-1">Score de risque DIGBA</p>

        {/* Risk badge */}
        <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm`}>
          <span>{cfg.icon}</span>
          <span className="font-bold text-sm">Risque {niveau_risque}</span>
        </div>

        {/* Score bar */}
        <div className="mt-4 h-2 w-full bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-1000"
            style={{ width: `${displayScore}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/50 mt-1">
          <span>0</span>
          <span>Faible ←→ Modéré ←→ Élevé</span>
          <span>100</span>
        </div>
      </div>

      {/* ── Decision banner ── */}
      <div className={`rounded-xl border-2 p-4 ${cfg.bg} ${cfg.border}`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
          Recommandation
        </p>
        <p className={`text-sm font-medium leading-relaxed ${cfg.text}`}>
          {cfg.icon} {decision}
        </p>
      </div>

      {/* ── RASFF + Operator cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* RASFF */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-900 to-purple-700 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-300/80">
                RASFF EU
              </p>
              <p className="text-xs text-white/50 mt-0.5">Historique rejets</p>
            </div>
            <span className="text-2xl">🇪🇺</span>
          </div>

          <div className="text-4xl font-black tabular-nums mb-1">
            {rasff.score.toFixed(0)}
            <span className="text-xl font-normal text-white/50">/100</span>
          </div>
          <p className="text-xs text-white/60 mb-4">Score de risque RASFF</p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Rejets fournisseur (24m)</span>
              <span className="font-bold">{rasff.nb_rejets_24m}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Rejets région (24m)</span>
              <span className="font-bold">{rasff.nb_rejets_region}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Blacklisté</span>
              {rasff.blackliste ? (
                <span className="font-bold text-red-300">Oui ⚠️</span>
              ) : (
                <span className="font-bold text-emerald-300">Non ✓</span>
              )}
            </div>
          </div>

          {rasff.derniers_dangers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {rasff.derniers_dangers.slice(0, 3).map((d) => (
                <span
                  key={d}
                  className="text-xs bg-white/15 px-2 py-0.5 rounded-full text-white/80"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Operator */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-gray-700 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-300/80">
                Opérateur
              </p>
              <p className="text-xs text-white/50 mt-0.5">Profil terrain</p>
            </div>
            <span className="text-2xl">👤</span>
          </div>

          <div className="text-4xl font-black tabular-nums mb-1">
            {operator.score.toFixed(0)}
            <span className="text-xl font-normal text-white/50">/100</span>
          </div>
          <p className="text-xs text-white/60 mb-4">Score de risque opérateur</p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Stockage</span>
              <span className="font-bold capitalize">{operator.stockage.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Certifications</span>
              <span className="font-bold">
                {operator.certifications.length > 0
                  ? operator.certifications.length
                  : "Aucune"}
              </span>
            </div>
          </div>

          {Object.keys(operator.facteurs).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {Object.values(operator.facteurs).map((label, i) => (
                <span
                  key={i}
                  className="text-xs bg-white/15 px-2 py-0.5 rounded-full text-white/80"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Done button ── */}
      <button
        type="button"
        onClick={onDone}
        className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${cfg.gradient} py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:opacity-90 focus:outline-none`}
      >
        <span>💾</span>
        Sauvegarder dans l'historique
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}
