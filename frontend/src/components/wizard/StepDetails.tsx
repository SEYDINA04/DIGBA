/**
 * DIGBA Wizard — Étape 2 : Produit & Opérateur
 */
import { useState } from "react";
import { PRODUITS, STOCKAGES, CERTIFICATIONS } from "../../data/countries";
import type { Produit, Stockage } from "../../types/api";

interface StepDetailsValues {
  produit: Produit;
  fournisseur: string;
  stockage: Stockage;
  certifications: string[];
}

interface StepDetailsProps {
  onSubmit: (values: StepDetailsValues) => void;
}

const RISK_COLOR: Record<string, string> = {
  Faible: "text-emerald-600 bg-emerald-50 border-emerald-200",
  Modéré: "text-amber-600 bg-amber-50 border-amber-200",
  Élevé: "text-red-600 bg-red-50 border-red-200",
};

export function StepDetails({ onSubmit }: StepDetailsProps) {
  const [produit, setProduit] = useState<Produit | "">("");
  const [fournisseur, setFournisseur] = useState("");
  const [stockage, setStockage] = useState<Stockage | "">("");
  const [certifications, setCertifications] = useState<string[]>([]);

  const toggleCert = (cert: string) =>
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );

  const canSubmit =
    produit !== "" && fournisseur.trim().length >= 2 && stockage !== "";

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      produit: produit as Produit,
      fournisseur: fournisseur.trim(),
      stockage: stockage as Stockage,
      certifications,
    });
  };

  return (
    <div className="space-y-6">

      {/* ── Produit ── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Type de produit
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRODUITS.map((p) => {
            const selected = produit === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setProduit(p.value)}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150 focus:outline-none ${
                  selected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-800"}`}>
                    {p.label}
                  </p>
                  <p className="text-xs text-gray-400">{p.desc}</p>
                </div>
                {selected && (
                  <div className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Fournisseur ── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Nom de l'exportateur / fournisseur
        </p>
        <input
          type="text"
          placeholder="ex : Export Cashew SN, Delta Export…"
          value={fournisseur}
          onChange={(e) => setFournisseur(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-300 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </section>

      {/* ── Stockage ── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Mode de stockage
        </p>
        <div className="grid grid-cols-3 gap-2">
          {STOCKAGES.map((s) => {
            const selected = stockage === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStockage(s.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all duration-150 focus:outline-none ${
                  selected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">{s.icon}</span>
                <p className={`text-xs font-semibold leading-tight ${selected ? "text-blue-700" : "text-gray-700"}`}>
                  {s.label}
                </p>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
                    RISK_COLOR[s.risk] ?? "text-gray-500"
                  }`}
                >
                  {s.risk}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Certifications ── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Certifications qualité
          <span className="ml-2 normal-case text-gray-400 font-normal">(optionnel — réduction du score)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {CERTIFICATIONS.map((cert) => {
            const selected = certifications.includes(cert.value);
            return (
              <button
                key={cert.value}
                type="button"
                onClick={() => toggleCert(cert.value)}
                className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-150 focus:outline-none ${
                  selected
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                {selected ? "✓" : "+"} {cert.label}
                <span className={`font-normal text-xs ${selected ? "text-emerald-100" : "text-gray-400"}`}>
                  −{cert.reduction}pts
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Submit ── */}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 focus:outline-none ${
          canSubmit
            ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-blue-700"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {canSubmit ? (
          <>
            <span>🎯</span>
            Calculer le score de risque DIGBA
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        ) : (
          "Complétez le formulaire pour continuer"
        )}
      </button>
    </div>
  );
}
