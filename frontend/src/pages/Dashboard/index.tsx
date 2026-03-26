/**
 * DIGBA — Dashboard : hero + wizard + analyses récentes
 */
import { useState } from "react";
import { BarChart3, ShieldCheck, AlertTriangle, FlaskConical, Clock } from "lucide-react";
import { AnalysisWizard } from "../../components/wizard/AnalysisWizard";
import { useHistoryStore } from "../../store/historyStore";
import type { ScoreResponse, Produit, Stockage } from "../../types/api";
import type { CountryData } from "../../data/countries";
import { COUNTRIES } from "../../data/countries";
import { useLang } from "../../i18n/LangContext";

const NIVEAU_STYLE = {
  Faible: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  Modéré: { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50"   },
  Élevé:  { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50"     },
};

function ScoreDot({ score }: { score: number }) {
  const color =
    score <= 35 ? "text-emerald-600" : score <= 65 ? "text-amber-600" : "text-red-600";
  return (
    <span className={`text-2xl font-black tabular-nums ${color}`}>
      {score}<span className="text-xs font-normal text-gray-400">%</span>
    </span>
  );
}

export default function Dashboard() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { entries, addEntry } = useHistoryStore();
  const { t } = useLang();
  const recent = entries.slice(0, 5);

  const handleSave = (
    result: ScoreResponse,
    meta: {
      country: CountryData;
      region: string;
      produit: Produit;
      fournisseur: string;
      stockage: Stockage;
      certifications: string[];
    }
  ) => {
    addEntry(meta, result);
  };

  const stats = [
    { label: t.dashboard.stats_analyses, value: entries.length,                                                    Icon: BarChart3,    color: "text-sky-300"     },
    { label: t.dashboard.stats_low,      value: entries.filter((e) => e.niveau_risque === "Faible").length,        Icon: ShieldCheck,  color: "text-emerald-300" },
    { label: t.dashboard.stats_at_risk,  value: entries.filter((e) => e.niveau_risque !== "Faible").length,        Icon: AlertTriangle, color: "text-amber-300"  },
  ];

  return (
    <div className="space-y-8">

      {/* ── Hero banner ── */}
      <div id="tour-hero" className="rounded-2xl bg-gradient-to-br from-section-dark via-[hsl(152,35%,12%)] to-primary p-8 text-white shadow-xl overflow-hidden relative">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -right-4  -top-4  h-28 w-28 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
              {t.dashboard.hero_label}
            </p>
            <h1 className="text-2xl font-display font-black tracking-tight">
              {t.dashboard.hero_title}
            </h1>
            <p className="mt-2 text-white/60 text-sm max-w-sm leading-relaxed">
              {t.dashboard.hero_desc}
            </p>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {COUNTRIES.map((c) => (
                <span key={c.code} title={c.name}
                  className="flex items-center gap-1 text-sm bg-white/10 rounded-full px-2.5 py-1 hover:bg-white/20 transition cursor-default"
                >
                  <span>{c.flag}</span>
                  <span className="text-xs text-white/60">{c.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            id="tour-new-analysis"
            type="button"
            onClick={() => setWizardOpen(true)}
            className="flex-shrink-0 group flex items-center gap-3 rounded-2xl bg-secondary px-6 py-4 text-secondary-foreground font-bold shadow-lg hover:shadow-xl hover:brightness-110 hover:scale-105 transition-all duration-200 focus:outline-none"
          >
            <FlaskConical className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
            <div className="text-left">
              <p className="text-sm font-bold">{t.dashboard.cta_title}</p>
              <p className="text-xs text-secondary-foreground/70 font-normal">{t.dashboard.cta_sub}</p>
            </div>
          </button>
        </div>

        {/* Stats row — FB-03 : lucide icons */}
        <div id="tour-stats" className="relative mt-6 grid grid-cols-3 gap-3">
          {stats.map(({ label, value, Icon, color }) => (
            <div key={label} className="rounded-xl bg-white/10 p-3 text-center">
              <Icon className={`h-5 w-5 mx-auto ${color}`} />
              <p className="text-xl font-black mt-1">{value}</p>
              <p className="text-xs text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent analyses ── */}
      <div id="tour-recent">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t.dashboard.recent_title}
          </h2>
          {entries.length > 0 && (
            <a href="/history" className="text-xs text-secondary hover:underline">
              {t.dashboard.see_all} ({entries.length})
            </a>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-foreground font-semibold">{t.dashboard.empty_title}</p>
            <p className="text-muted-foreground text-sm mt-1 mb-5">
              {t.dashboard.empty_desc}
            </p>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition focus:outline-none"
            >
              + {t.dashboard.empty_cta}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((entry) => {
              const style = NIVEAU_STYLE[entry.niveau_risque] ?? NIVEAU_STYLE["Modéré"];
              const countryData = COUNTRIES.find((c) => c.code === entry.country);
              const riskLabel = t.risk[entry.niveau_risque as keyof typeof t.risk] ?? entry.niveau_risque;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <ScoreDot score={entry.score} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{countryData?.flag ?? "🌍"}</span>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.fournisseur}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.products[entry.produit as keyof typeof t.products] ?? entry.produit} · {entry.region}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {riskLabel}
                  </span>
                  <span className="flex-shrink-0 text-xs text-muted-foreground/60 hidden sm:block">
                    {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {wizardOpen && (
        <AnalysisWizard onClose={() => setWizardOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
}
