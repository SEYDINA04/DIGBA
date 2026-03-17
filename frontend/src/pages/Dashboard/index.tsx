/**
 * DIGBA — Dashboard : hero + wizard + analyses récentes
 */
import { useState } from "react";
import { AnalysisWizard } from "../../components/wizard/AnalysisWizard";
import { useHistoryStore } from "../../store/historyStore";
import type { ScoreResponse, Produit, Stockage } from "../../types/api";
import type { CountryData } from "../../data/countries";
import { COUNTRIES } from "../../data/countries";

const NIVEAU_STYLE = {
  Faible: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  Modéré: { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50"   },
  Élevé:  { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50"     },
};

const PRODUIT_LABELS: Record<string, string> = {
  noix_de_cajou: "🥜 Noix de cajou",
  arachide:      "🥜 Arachide",
  mil:           "🌾 Mil",
  sorgho:        "🌾 Sorgho",
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

  return (
    <div className="space-y-8">

      {/* ── Hero banner ── */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-8 text-white shadow-xl overflow-hidden relative">
        {/* Decorative circles */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-1">
              DIGBA · Food Safety Risk Scoring
            </p>
            <h1 className="text-2xl font-black tracking-tight">
              Analyse de risque alimentaire
            </h1>
            <p className="mt-2 text-blue-200 text-sm max-w-sm leading-relaxed">
              Pipeline multi-sources : NDVI Sentinel-2 · Météo wttr.in · RASFF EU · Scoring opérateur
            </p>

            {/* Country flags */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {COUNTRIES.map((c) => (
                <span key={c.code} title={c.name}
                  className="flex items-center gap-1 text-sm bg-white/10 rounded-full px-2.5 py-1 hover:bg-white/20 transition cursor-default"
                >
                  <span>{c.flag}</span>
                  <span className="text-xs text-blue-200">{c.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="flex-shrink-0 group flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-blue-700 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none"
          >
            <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">🔬</span>
            <div className="text-left">
              <p className="text-sm font-bold">Nouvelle analyse</p>
              <p className="text-xs text-blue-400 font-normal">Wizard guidé · 2 étapes</p>
            </div>
          </button>
        </div>

        {/* Stats row */}
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Analyses",  value: entries.length, icon: "📊" },
            { label: "Faible",   value: entries.filter((e) => e.niveau_risque === "Faible").length, icon: "✅" },
            { label: "À risque", value: entries.filter((e) => e.niveau_risque !== "Faible").length, icon: "⚠️" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl bg-white/10 p-3 text-center">
              <p className="text-xl">{icon}</p>
              <p className="text-xl font-black mt-1">{value}</p>
              <p className="text-xs text-blue-200">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent analyses ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span>🕒</span> Analyses récentes
          </h2>
          {entries.length > 0 && (
            <a href="/history" className="text-xs text-blue-500 hover:underline">
              Voir tout ({entries.length})
            </a>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <p className="text-5xl mb-3">🔬</p>
            <p className="text-gray-600 font-semibold">Aucune analyse effectuée</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">
              Utilisez le wizard pour analyser votre premier lot
            </p>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition focus:outline-none"
            >
              <span>+</span> Lancer une analyse
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((entry) => {
              const style = NIVEAU_STYLE[entry.niveau_risque] ?? NIVEAU_STYLE["Modéré"];
              const countryData = COUNTRIES.find((c) => c.code === entry.country);
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <ScoreDot score={entry.score} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{countryData?.flag ?? "🌍"}</span>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {entry.fournisseur}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {PRODUIT_LABELS[entry.produit] ?? entry.produit} · {entry.region}
                    </p>
                  </div>

                  <span className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {entry.niveau_risque}
                  </span>

                  <span className="flex-shrink-0 text-xs text-gray-300 hidden sm:block">
                    {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wizard modal */}
      {wizardOpen && (
        <AnalysisWizard
          onClose={() => setWizardOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
