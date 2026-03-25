/**
 * DIGBA Wizard — Étape 2 : Produit & Opérateur
 */
import { useState } from "react";
import { Factory, Warehouse, Leaf, Wheat, Sprout, Target, ArrowRight } from "lucide-react";
import { PRODUITS, STOCKAGES, CERTIFICATIONS } from "../../data/countries";
import type { Produit, Stockage } from "../../types/api";
import { useLang } from "../../i18n/LangContext";

import imgPeanuts from "../../assets/images/peanuts.webp";
import imgMillet  from "../../assets/images/millet-grain.avif";
import imgSorghum from "../../assets/images/sorghum.avif";
import imgSesame  from "../../assets/images/sesame-seeds.avif";
import imgCocoa   from "../../assets/images/cocoa-beans.webp";

const PRODUCT_IMAGES: Record<string, string> = {
  arachide: imgPeanuts,
  mil:      imgMillet,
  sorgho:   imgSorghum,
  sesame:   imgSesame,
  cacao:    imgCocoa,
};

// Fallback icon when no image available
const PRODUCT_ICONS: Record<string, React.ElementType> = {
  arachide: Sprout,
  mil:      Wheat,
  sorgho:   Wheat,
  sesame:   Leaf,
  cacao:    Leaf,
};

const STORAGE_ICONS: Record<string, React.ElementType> = {
  silo_ventile: Factory,
  hangar:       Warehouse,
  plein_air:    Leaf,
};

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
  Élevé:  "text-red-600 bg-red-50 border-red-200",
};

export function StepDetails({ onSubmit }: StepDetailsProps) {
  const { t } = useLang();
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
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t.wizard.product_label}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRODUITS.map((p) => {
            const selected = produit === p.value;
            const translatedLabel = t.products[p.value as keyof typeof t.products] ?? p.label;
            const img = PRODUCT_IMAGES[p.value];
            const FallbackIcon = PRODUCT_ICONS[p.value] ?? Leaf;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setProduit(p.value)}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150 focus:outline-none ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {img ? (
                  <img
                    src={img}
                    alt={translatedLabel}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FallbackIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
                    {translatedLabel}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.desc}</p>
                </div>
                {selected && (
                  <div className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t.wizard.supplier_label}
        </p>
        <input
          type="text"
          placeholder={t.wizard.supplier_placeholder}
          value={fournisseur}
          onChange={(e) => setFournisseur(e.target.value)}
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10 bg-card"
        />
      </section>

      {/* ── Stockage ── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t.wizard.storage_label}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {STOCKAGES.map((s) => {
            const selected = stockage === s.value;
            const translatedLabel = t.storage[s.value as keyof typeof t.storage] ?? s.label;
            const translatedRisk = t.risk[s.risk as keyof typeof t.risk] ?? s.risk;
            const StorageIcon = STORAGE_ICONS[s.value] ?? Warehouse;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStockage(s.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all duration-150 focus:outline-none ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <StorageIcon className={`h-6 w-6 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-xs font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                  {translatedLabel}
                </p>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
                    RISK_COLOR[s.risk] ?? "text-muted-foreground"
                  }`}
                >
                  {translatedRisk}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Certifications ── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t.wizard.certs_label}
          <span className="ml-2 normal-case font-normal text-muted-foreground/60">{t.wizard.certs_optional}</span>
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
                    ? "border-secondary bg-secondary text-secondary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-secondary/50 hover:bg-secondary/10"
                }`}
              >
                {selected ? "✓" : "+"} {cert.label}
                <span className={`font-normal text-xs ${selected ? "text-secondary-foreground/70" : "text-muted-foreground"}`}>
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
            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:brightness-110"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {canSubmit ? (
          <>
            <Target className="h-4 w-4" />
            {t.wizard.btn_score}
            <ArrowRight className="h-4 w-4" />
          </>
        ) : (
          t.wizard.btn_complete
        )}
      </button>
    </div>
  );
}
