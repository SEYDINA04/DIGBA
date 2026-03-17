/**
 * DIGBA — AnalysisWizard
 * Modal multi-étapes orchestrant tout le flux d'analyse :
 *   step1-form → step1-loading → step1-preview →
 *   step2-form → step2-loading → step2-result
 */
import { useCallback, useReducer, useRef } from "react";
import type { PreviewResponse, ScoreResponse, Produit, Stockage } from "../../types/api";
import type { CountryData } from "../../data/countries";
import { previewApi, scoreApi } from "../../services/api";
import { StepLocation } from "./StepLocation";
import { StepDetails } from "./StepDetails";
import { LocationPreview } from "./LocationPreview";
import { ScoringResult } from "./ScoringResult";
import { ProgressTracker, type TrackerStep } from "./ProgressTracker";

// ── State machine ──────────────────────────────────────────────────────────

type Phase =
  | "step1-form"
  | "step1-loading"
  | "step1-preview"
  | "step2-form"
  | "step2-loading"
  | "step2-result";

interface WizardState {
  phase: Phase;
  country: CountryData | null;
  region: string;
  preview: PreviewResponse | null;
  produit: Produit | "";
  fournisseur: string;
  stockage: Stockage | "";
  certifications: string[];
  result: ScoreResponse | null;
  error: string | null;
  isApiDone: boolean;
}

type WizardAction =
  | { type: "START_LOCATION"; country: CountryData; region: string }
  | { type: "PREVIEW_API_DONE"; data: PreviewResponse }
  | { type: "PREVIEW_ANIM_DONE" }
  | { type: "CONTINUE_TO_STEP2" }
  | { type: "START_SCORING"; produit: Produit; fournisseur: string; stockage: Stockage; certifications: string[] }
  | { type: "SCORE_API_DONE"; data: ScoreResponse }
  | { type: "SCORE_ANIM_DONE" }
  | { type: "API_ERROR"; message: string };

const initial: WizardState = {
  phase: "step1-form",
  country: null,
  region: "",
  preview: null,
  produit: "",
  fournisseur: "",
  stockage: "",
  certifications: [],
  result: null,
  error: null,
  isApiDone: false,
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "START_LOCATION":
      return { ...state, phase: "step1-loading", country: action.country, region: action.region, isApiDone: false, error: null };
    case "PREVIEW_API_DONE":
      return { ...state, preview: action.data, isApiDone: true };
    case "PREVIEW_ANIM_DONE":
      // Only transition if API already done; otherwise stay in loading
      return state.preview ? { ...state, phase: "step1-preview" } : state;
    case "CONTINUE_TO_STEP2":
      return { ...state, phase: "step2-form", isApiDone: false };
    case "START_SCORING":
      return { ...state, phase: "step2-loading", produit: action.produit, fournisseur: action.fournisseur, stockage: action.stockage, certifications: action.certifications, isApiDone: false, error: null };
    case "SCORE_API_DONE":
      return { ...state, result: action.data, isApiDone: true };
    case "SCORE_ANIM_DONE":
      return state.result ? { ...state, phase: "step2-result" } : state;
    case "API_ERROR":
      return { ...state, phase: state.phase === "step1-loading" ? "step1-form" : "step2-form", error: action.message, isApiDone: false };
    default:
      return state;
  }
}

// ── Progress step definitions ──────────────────────────────────────────────

const STEP1_STEPS: TrackerStep[] = [
  { id: "sat-connect",  icon: "🛰️", label: "Connexion Sentinel-2",        durationMs: 700 },
  { id: "ndvi-calc",   icon: "🌿", label: "Calcul de l'indice NDVI",      durationMs: 900 },
  { id: "meteo-fetch", icon: "🌐", label: "Requête API Météo (wttr.in)",   durationMs: 800 },
  { id: "meteo-anal",  icon: "🌤️", label: "Analyse des conditions",        durationMs: 600 },
];

const STEP2_STEPS: TrackerStep[] = [
  { id: "rasff-query", icon: "🔍", label: "Requête base RASFF EU",         durationMs: 700 },
  { id: "rasff-anal",  icon: "📊", label: "Analyse historique fournisseur", durationMs: 800 },
  { id: "op-score",   icon: "👤", label: "Calcul du score opérateur",      durationMs: 600 },
  { id: "final-score", icon: "🎯", label: "Score de risque final DIGBA",   durationMs: 500 },
];

// ── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ phase }: { phase: Phase }) {
  const step = phase.startsWith("step1") ? 1 : 2;
  return (
    <div className="flex items-center justify-center gap-3 py-4 px-6 border-b border-gray-100">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
              n < step
                ? "bg-emerald-500 text-white"
                : n === step
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {n < step ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : n}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${n === step ? "text-blue-700" : n < step ? "text-emerald-600" : "text-gray-400"}`}>
            {n === 1 ? "Zone de production" : "Lot & Scoring"}
          </span>
          {n < 2 && (
            <div className={`h-px w-8 ${step > 1 ? "bg-emerald-300" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Phase heading ──────────────────────────────────────────────────────────

const PHASE_HEADINGS: Record<Phase, { icon: string; title: string; sub: string }> = {
  "step1-form":    { icon: "🌍", title: "Zone de production",  sub: "Sélectionnez le pays et la région" },
  "step1-loading": { icon: "⚡", title: "Analyse en cours…",   sub: "Satellite · Météo" },
  "step1-preview": { icon: "🛰️", title: "Aperçu de la zone",   sub: "NDVI + Conditions météo" },
  "step2-form":    { icon: "📦", title: "Détails du lot",       sub: "Produit · Opérateur · Certifications" },
  "step2-loading": { icon: "⚡", title: "Calcul du score…",     sub: "RASFF · Opérateur · Score final" },
  "step2-result":  { icon: "🎯", title: "Score de risque DIGBA", sub: "Analyse complète" },
};

// ── Main component ─────────────────────────────────────────────────────────

interface AnalysisWizardProps {
  onClose: () => void;
  onSave: (result: ScoreResponse, meta: { country: CountryData; region: string; produit: Produit; fournisseur: string; stockage: Stockage; certifications: string[] }) => void;
}

export function AnalysisWizard({ onClose, onSave }: AnalysisWizardProps) {
  const [state, dispatch] = useReducer(reducer, initial);
  const previewDataRef = useRef<PreviewResponse | null>(null);
  const resultDataRef = useRef<ScoreResponse | null>(null);

  // ── Step 1: fetch preview
  const handleLocationSubmit = useCallback(
    (country: CountryData, region: string) => {
      dispatch({ type: "START_LOCATION", country, region });
      previewApi.fetch(region, country.code).then((data) => {
        previewDataRef.current = data;
        dispatch({ type: "PREVIEW_API_DONE", data });
      }).catch((e) => dispatch({ type: "API_ERROR", message: e.message }));
    },
    []
  );

  // Called when animation finishes
  const handleStep1AnimDone = useCallback(() => {
    if (previewDataRef.current) {
      dispatch({ type: "PREVIEW_ANIM_DONE" });
    } else {
      // API still loading — poll via isApiDone reactive effect in ProgressTracker
      dispatch({ type: "PREVIEW_ANIM_DONE" });
    }
  }, []);

  // ── Step 2: fetch score
  const handleDetailsSubmit = useCallback(
    (values: { produit: Produit; fournisseur: string; stockage: Stockage; certifications: string[] }) => {
      if (!state.country || !state.region) return;
      dispatch({ type: "START_SCORING", ...values });
      scoreApi
        .submit({
          produit: values.produit,
          region: state.region,
          country: state.country.code,
          fournisseur: values.fournisseur,
          stockage: values.stockage,
          certifications: values.certifications,
        })
        .then((data) => {
          resultDataRef.current = data;
          dispatch({ type: "SCORE_API_DONE", data });
        })
        .catch((e) => dispatch({ type: "API_ERROR", message: e.message }));
    },
    [state.country, state.region]
  );

  const handleStep2AnimDone = useCallback(() => {
    dispatch({ type: "SCORE_ANIM_DONE" });
  }, []);

  // ── Save and close
  const handleSave = useCallback(() => {
    if (!state.result || !state.country) return;
    onSave(state.result, {
      country: state.country,
      region: state.region,
      produit: state.produit as Produit,
      fournisseur: state.fournisseur,
      stockage: state.stockage as Stockage,
      certifications: state.certifications,
    });
    onClose();
  }, [state, onSave, onClose]);

  const heading = PHASE_HEADINGS[state.phase];

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* ── Panel ── */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-4">

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition focus:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Step indicator */}
        <StepIndicator phase={state.phase} />

        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{heading.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{heading.title}</h2>
              <p className="text-xs text-gray-400">{heading.sub}</p>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {state.error && (
          <div className="mx-6 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {state.error}
          </div>
        )}

        {/* Body */}
        <div className="px-6 pb-6">
          {state.phase === "step1-form" && (
            <StepLocation onSubmit={handleLocationSubmit} />
          )}

          {state.phase === "step1-loading" && (
            <ProgressTracker
              steps={STEP1_STEPS}
              isApiDone={state.isApiDone}
              onAllDone={handleStep1AnimDone}
            />
          )}

          {state.phase === "step1-preview" && state.preview && state.country && (
            <LocationPreview
              data={state.preview}
              country={state.country}
              onContinue={() => dispatch({ type: "CONTINUE_TO_STEP2" })}
            />
          )}

          {state.phase === "step2-form" && (
            <StepDetails onSubmit={handleDetailsSubmit} />
          )}

          {state.phase === "step2-loading" && (
            <ProgressTracker
              steps={STEP2_STEPS}
              isApiDone={state.isApiDone}
              onAllDone={handleStep2AnimDone}
            />
          )}

          {state.phase === "step2-result" && state.result && state.country && (
            <ScoringResult
              result={state.result}
              country={state.country}
              region={state.region}
              onDone={handleSave}
            />
          )}
        </div>
      </div>
    </div>
  );
}
