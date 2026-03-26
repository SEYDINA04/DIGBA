/**
 * DIGBA Wizard — Résultat final : score animé + RASFF + Opérateur
 */
import { useEffect, useState } from "react";
import {
  ShieldCheck, AlertTriangle, Ban, User, Save,
  Globe, CheckCircle, XCircle, FileDown,
} from "lucide-react";
import type { ScoreResponse } from "../../types/api";
import type { CountryData } from "../../data/countries";
import { useLang } from "../../i18n/LangContext";
import { generateEudrPdf } from "../../utils/generateEudrPdf";

interface ScoringResultProps {
  result: ScoreResponse;
  country: CountryData;
  region: string;
  produit: string;
  fournisseur: string;
  stockage: string;
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
    barColor: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    scoreColor: "text-emerald-600",
    Icon: ShieldCheck,
  },
  Modéré: {
    barColor: "bg-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    scoreColor: "text-amber-600",
    Icon: AlertTriangle,
  },
  Élevé: {
    barColor: "bg-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700 border-red-200",
    scoreColor: "text-red-600",
    Icon: Ban,
  },
} as const;

export function ScoringResult({ result, country, region, produit, fournisseur, stockage, onDone }: ScoringResultProps) {
  const { t, lang } = useLang();
  const { score, niveau_risque, decision, details } = result;
  const { rasff, operator } = details;
  const cfg = NIVEAU_CONFIG[niveau_risque] ?? NIVEAU_CONFIG["Modéré"];
  const displayScore = useCountUp(score);
  const riskLabel = t.risk[niveau_risque as keyof typeof t.risk] ?? niveau_risque;
  const { Icon: RiskIcon } = cfg;

  return (
    <div className="space-y-5">

      {/* ── Score hero — FB-04 : épuré, fond neutre + accent ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className={`h-1.5 ${cfg.barColor}`} />
        <div className="p-6 text-center">
          {/* Zone badge */}
          <p className="text-xs text-muted-foreground mb-4">
            {country.flag} {region}, {country.name}
          </p>

          {/* Animated score */}
          <div className="mb-2">
            <span className={`text-8xl font-black tabular-nums leading-none ${cfg.scoreColor}`}>
              {displayScore}
            </span>
            <span className="text-3xl font-light text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t.wizard.score_label}</p>

          {/* Risk badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold ${cfg.badge}`}>
            <RiskIcon className="h-4 w-4" />
            {t.wizard.risk_label(riskLabel)}
          </div>

          {/* Score bar */}
          <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${cfg.barColor}`}
              style={{ width: `${displayScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground/60 mt-1">
            <span>0</span>
            <span>{t.wizard.scale_label}</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* ── Food Safety Recommendation ── */}
      <div className={`rounded-xl border-2 p-4 ${cfg.bg} ${cfg.border}`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {t.wizard.recommendation}
        </p>
        <div className={`flex items-start gap-2 text-sm font-medium leading-relaxed ${cfg.text}`}>
          <RiskIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{decision}</span>
        </div>
      </div>

      {/* ── EUDR Recommendation ── */}
      {result.eudr_decision && (() => {
        const raw        = result.eudr_decision;
        const isCompliant = raw.includes("EUDR COMPLIANT") || raw.includes("CONFORME EUDR");
        const isPending   = raw.includes("unverified") || raw.includes("non vérifiable");

        const borderColor = isCompliant ? "border-emerald-400" : isPending ? "border-amber-400" : "border-red-400";
        const bgColor     = isCompliant ? "bg-emerald-50 dark:bg-emerald-950/30" : isPending ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
        const textColor   = isCompliant ? "text-emerald-800 dark:text-emerald-300" : isPending ? "text-amber-800 dark:text-amber-300" : "text-red-800 dark:text-red-300";
        const labelColor  = isCompliant ? "text-emerald-600" : isPending ? "text-amber-600" : "text-red-600";
        const EudrIcon    = isCompliant ? CheckCircle : isPending ? Globe : XCircle;

        // Pick only the language matching user preference
        const parts = raw.split("||").map(s => s.trim());
        const enRaw = parts.find(p => p.startsWith("[EN]")) ?? parts[0] ?? raw;
        const frRaw = parts.find(p => p.startsWith("[FR]")) ?? parts[1] ?? raw;
        const text = (lang === "en" ? enRaw : frRaw)
          .replace(/^\[(EN|FR)\]\s*/, "");

        return (
          <div className={`rounded-xl border-2 p-4 space-y-3 ${bgColor} ${borderColor}`}>
            <div className="flex items-center gap-2">
              <EudrIcon className={`h-4 w-4 shrink-0 ${labelColor}`} />
              <p className={`text-xs font-semibold uppercase tracking-widest ${labelColor}`}>
                EUDR — EU Regulation 2023/1115
              </p>
            </div>
            <div className={`text-sm font-medium leading-relaxed ${textColor}`}>
              {text}
            </div>
          </div>
        );
      })()}

      {/* ── RASFF + Operator cards — FB-04 : fond neutre ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* RASFF */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-violet-500" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm leading-none">🇪🇺</span>
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                    RASFF EU
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Historique rejets</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tabular-nums text-foreground">
                  {rasff.score.toFixed(0)}
                  <span className="text-lg font-normal text-muted-foreground">/100</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t.wizard.rasff_score}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.wizard.rasff_rejets}</span>
                <span className="font-bold text-foreground">{rasff.nb_rejets_24m}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.wizard.rasff_region}</span>
                <span className="font-bold text-foreground">{rasff.nb_rejets_region}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.wizard.rasff_blacklist}</span>
                {rasff.blackliste ? (
                  <span className="flex items-center gap-1 font-bold text-red-600">
                    <XCircle className="h-3.5 w-3.5" /> {t.wizard.rasff_yes}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle className="h-3.5 w-3.5" /> {t.wizard.rasff_no}
                  </span>
                )}
              </div>
            </div>

            {rasff.derniers_dangers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {rasff.derniers_dangers.slice(0, 3).map((d) => (
                  <span key={d} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operator */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-slate-500" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <User className="h-3.5 w-3.5 text-slate-600" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Opérateur
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Profil terrain</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tabular-nums text-foreground">
                  {operator.score.toFixed(0)}
                  <span className="text-lg font-normal text-muted-foreground">/100</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t.wizard.op_score}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.wizard.op_storage}</span>
                <span className="font-bold text-foreground capitalize">
                  {t.storage[operator.stockage as keyof typeof t.storage] ?? operator.stockage.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.wizard.op_certs}</span>
                <span className="font-bold text-foreground">
                  {operator.certifications.length > 0
                    ? operator.certifications.length
                    : t.wizard.op_none}
                </span>
              </div>
            </div>

            {Object.keys(operator.facteurs).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {Object.values(operator.facteurs).map((label, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EUDR Export button ── */}
      <button
        type="button"
        onClick={() => generateEudrPdf(result, {
          region,
          countryName: country.name,
          countryCode: country.code,
          produit,
          fournisseur,
          stockage,
          lat: result.details.weather.lat,
          lon: result.details.weather.lon,
        })}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-muted focus:outline-none"
      >
        <FileDown className="h-4 w-4 text-emerald-600" />
        Export EUDR Declaration (PDF)
      </button>

      {/* ── Done button ── */}
      <button
        type="button"
        onClick={onDone}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:brightness-110 focus:outline-none"
      >
        <Save className="h-4 w-4" />
        {t.wizard.save_btn}
        <CheckCircle className="h-4 w-4" />
      </button>
    </div>
  );
}
