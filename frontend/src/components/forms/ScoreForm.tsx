/**
 * DIGBA — Formulaire de scoring (5 champs)
 * React Hook Form + Zod
 */
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ScoreRequest, Produit, Stockage } from "../../types/api";
type Region = string; // Region is now a plain string (multi-country support)

// ── Zod schema ─────────────────────────────────────────────────────────────

const schema = z.object({
  produit: z.enum(["noix_de_cajou", "arachide", "mil", "sorgho"] as const),
  region: z.enum(["Kaolack", "Thiès", "Dakar", "Ziguinchor", "Saint-Louis"] as const),
  fournisseur: z.string().min(2, "Minimum 2 caractères"),
  stockage: z.enum(["silo_ventile", "hangar", "plein_air"] as const),
  certifications: z.array(z.string()),
});

// ── Options ────────────────────────────────────────────────────────────────

const PRODUITS: { value: Produit; label: string }[] = [
  { value: "noix_de_cajou", label: "Noix de cajou" },
  { value: "arachide",      label: "Arachide" },
  { value: "mil",           label: "Mil" },
  { value: "sorgho",        label: "Sorgho" },
];

const REGIONS: { value: Region; label: string }[] = [
  { value: "Kaolack",      label: "Kaolack" },
  { value: "Thiès",        label: "Thiès" },
  { value: "Dakar",        label: "Dakar" },
  { value: "Ziguinchor",   label: "Ziguinchor" },
  { value: "Saint-Louis",  label: "Saint-Louis" },
];

const STOCKAGES: { value: Stockage; label: string; emoji: string; risk: string }[] = [
  { value: "silo_ventile", label: "Silo ventilé",  emoji: "✅", risk: "Faible risque" },
  { value: "hangar",       label: "Hangar",         emoji: "⚠️", risk: "Risque modéré" },
  { value: "plein_air",    label: "Plein air",      emoji: "❌", risk: "Risque élevé" },
];

const CERTIFICATIONS = [
  "GlobalG.A.P.",
  "HACCP",
  "ISO22000",
  "BRC",
  "IFS",
];

// ── Component ──────────────────────────────────────────────────────────────

interface ScoreFormProps {
  onSubmit: (data: ScoreRequest) => void;
  isLoading?: boolean;
}

export function ScoreForm({ onSubmit, isLoading = false }: ScoreFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ScoreRequest>({
    resolver: zodResolver(schema),
    defaultValues: {
      produit: "noix_de_cajou",
      region: "Kaolack",
      fournisseur: "",
      stockage: "hangar",
      certifications: [],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Produit */}
      <div>
        <label className="label">Type de produit</label>
        <select {...register("produit")} className="input-field">
          {PRODUITS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {errors.produit && (
          <p className="mt-1 text-xs text-red-600">{errors.produit.message}</p>
        )}
      </div>

      {/* Région */}
      <div>
        <label className="label">Région d'origine</label>
        <select {...register("region")} className="input-field">
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {errors.region && (
          <p className="mt-1 text-xs text-red-600">{errors.region.message}</p>
        )}
      </div>

      {/* Fournisseur */}
      <div>
        <label className="label">Nom du fournisseur</label>
        <input
          {...register("fournisseur")}
          type="text"
          placeholder="Ex : Coopérative de Kaolack"
          className="input-field"
        />
        {errors.fournisseur && (
          <p className="mt-1 text-xs text-red-600">{errors.fournisseur.message}</p>
        )}
      </div>

      {/* Stockage — radio cards visuelles */}
      <div>
        <label className="label">Mode de stockage</label>
        <Controller
          name="stockage"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-3 mt-1">
              {STOCKAGES.map((s) => (
                <label
                  key={s.value}
                  className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-colors ${
                    field.value === s.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={s.value}
                    checked={field.value === s.value}
                    onChange={() => field.onChange(s.value)}
                  />
                  <div className="text-xl mb-1">{s.emoji}</div>
                  <div className="text-sm font-medium text-gray-800">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.risk}</div>
                </label>
              ))}
            </div>
          )}
        />
        {errors.stockage && (
          <p className="mt-1 text-xs text-red-600">{errors.stockage.message}</p>
        )}
      </div>

      {/* Certifications — checkboxes */}
      <div>
        <label className="label">Certifications (optionnel)</label>
        <Controller
          name="certifications"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2 mt-1">
              {CERTIFICATIONS.map((cert) => {
                const checked = field.value.includes(cert);
                return (
                  <label
                    key={cert}
                    className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                      checked
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...field.value, cert]
                          : field.value.filter((c) => c !== cert);
                        field.onChange(next);
                      }}
                    />
                    <span>{checked ? "✓" : "+"}</span>
                    {cert}
                  </label>
                );
              })}
            </div>
          )}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Analyse en cours…
          </>
        ) : (
          "🚀 Calculer le score"
        )}
      </button>
    </form>
  );
}
