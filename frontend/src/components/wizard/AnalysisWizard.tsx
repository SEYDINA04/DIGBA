/**
 * DIGBA — AnalysisWizard
 * Modal multi-étapes orchestrant tout le flux d'analyse.
 */
import { useCallback, useReducer, useRef } from "react";
import {
  Globe, Zap, Satellite, Package, Target,
  Leaf, Wheat, Cloud, Search, BarChart3, User,
  AlertTriangle,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { PreviewResponse, ScoreResponse, Produit, Stockage } from "../../types/api";
import type { CountryData } from "../../data/countries";
import { previewApi, scoreApi } from "../../services/api";
import { StepLocation } from "./StepLocation";
import { StepDetails } from "./StepDetails";
import { LocationPreview } from "./LocationPreview";
import { ScoringResult } from "./ScoringResult";
import { ProgressTracker, type TrackerStep } from "./ProgressTracker";
import { useLang } from "../../i18n/LangContext";

// ── Icon maps (phases & steps) ─────────────────────────────────────────────

type Phase = "step1-form" | "step1-loading" | "step1-preview" | "step2-form" | "step2-loading" | "step2-result";

const PHASE_ICONS: Record<Phase, React.ComponentType<LucideProps>> = {
  "step1-form":    Globe,
  "step1-loading": Zap,
  "step1-preview": Satellite,
  "step2-form":    Package,
  "step2-loading": Zap,
  "step2-result":  Target,
};

const STEP_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  "sat-connect":  Satellite,
  "ndvi-calc":    Leaf,
  "meteo-fetch":  Cloud,
  "meteo-anal":   Wheat,
  "rasff-query":  Search,
  "rasff-anal":   BarChart3,
  "op-score":     User,
  "final-score":  Target,
};

// ── State machine ──────────────────────────────────────────────────────────

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
  country: null, region: "", preview: null,
  produit: "", fournisseur: "", stockage: "", certifications: [],
  result: null, error: null, isApiDone: false,
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "START_LOCATION":
      return { ...state, phase: "step1-loading", country: action.country, region: action.region, isApiDone: false, error: null };
    case "PREVIEW_API_DONE":
      return { ...state, preview: action.data, isApiDone: true };
    case "PREVIEW_ANIM_DONE":
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

// ── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ phase, label1, label2 }: { phase: Phase; label1: string; label2: string }) {
  const step = phase.startsWith("step1") ? 1 : 2;
  return (
    <div className="flex items-center justify-center gap-3 py-4 px-6 border-b border-border">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
              n < step
                ? "bg-secondary text-secondary-foreground"
                : n === step
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {n < step ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : n}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${n === step ? "text-primary" : n < step ? "text-secondary" : "text-muted-foreground"}`}>
            {n === 1 ? label1 : label2}
          </span>
          {n < 2 && (
            <div className={`h-px w-8 ${step > 1 ? "bg-secondary/50" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface AnalysisWizardProps {
  onClose: () => void;
  onSave: (result: ScoreResponse, meta: { country: CountryData; region: string; produit: Produit; fournisseur: string; stockage: Stockage; certifications: string[] }) => void;
}

export function AnalysisWizard({ onClose, onSave }: AnalysisWizardProps) {
  const [state, dispatch] = useReducer(reducer, initial);
  const { t } = useLang();
  const previewDataRef = useRef<PreviewResponse | null>(null);
  const resultDataRef  = useRef<ScoreResponse | null>(null);

  const handleLocationSubmit = useCallback(
    (country: CountryData, region: string) => {
      dispatch({ type: "START_LOCATION", country, region });
      previewApi.fetch(region, country.code).then((data) => {
        previewDataRef.current = data;
        dispatch({ type: "PREVIEW_API_DONE", data });
      }).catch((e) => dispatch({ type: "API_ERROR", message: typeof e?.message === "string" ? e.message : String(e ?? "Erreur réseau") }));
    }, []
  );

  const handleStep1AnimDone = useCallback(() => dispatch({ type: "PREVIEW_ANIM_DONE" }), []);

  const handleDetailsSubmit = useCallback(
    (values: { produit: Produit; fournisseur: string; stockage: Stockage; certifications: string[] }) => {
      if (!state.country || !state.region) return;
      dispatch({ type: "START_SCORING", ...values });
      scoreApi.submit({
        produit: values.produit, region: state.region, country: state.country.code,
        fournisseur: values.fournisseur, stockage: values.stockage, certifications: values.certifications,
      }).then((data) => {
        resultDataRef.current = data;
        dispatch({ type: "SCORE_API_DONE", data });
      }).catch((e) => dispatch({ type: "API_ERROR", message: typeof e?.message === "string" ? e.message : String(e ?? "Erreur réseau") }));
    }, [state.country, state.region]
  );

  const handleStep2AnimDone = useCallback(() => dispatch({ type: "SCORE_ANIM_DONE" }), []);

  const handleSave = useCallback(() => {
    if (!state.result || !state.country) return;
    onSave(state.result, {
      country: state.country, region: state.region,
      produit: state.produit as Produit, fournisseur: state.fournisseur,
      stockage: state.stockage as Stockage, certifications: state.certifications,
    });
    onClose();
  }, [state, onSave, onClose]);

  const heading   = t.wizard.phases[state.phase];
  const PhaseIcon = PHASE_ICONS[state.phase];

  const step1Steps: TrackerStep[] = t.wizard.step1_steps.map((s) => ({
    id: s.id, label: s.label, durationMs: s.durationMs,
    Icon: STEP_ICONS[s.id] ?? Zap,
  }));
  const step2Steps: TrackerStep[] = t.wizard.step2_steps.map((s) => ({
    id: s.id, label: s.label, durationMs: s.durationMs,
    Icon: STEP_ICONS[s.id] ?? Zap,
  }));

  const isLoading = state.phase === "step1-loading" || state.phase === "step2-loading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] transition-colors duration-200 ${
        isLoading ? "bg-gray-950" : "bg-white"
      }`}>

        {/* Header */}
        <div className={`shrink-0 rounded-t-2xl transition-colors duration-200 ${isLoading ? "bg-gray-950" : "bg-white"}`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <StepIndicator phase={state.phase} label1={t.wizard.step1_label} label2={t.wizard.step2_label} />

          <div className={`px-6 pt-4 pb-3 border-b transition-colors duration-200 ${isLoading ? "border-white/10" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <PhaseIcon className={`h-6 w-6 ${isLoading ? "text-emerald-400" : "text-primary"}`} />
              <div>
                <h2 className={`text-lg font-bold transition-colors duration-200 ${isLoading ? "text-white" : "text-gray-900"}`}>
                  {heading.title}
                </h2>
                <p className="text-xs text-gray-400">{heading.sub}</p>
              </div>
            </div>
          </div>

          {state.error && (
            <div className="mx-6 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {state.error}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {state.phase === "step1-form"    && <StepLocation onSubmit={handleLocationSubmit} />}
          {state.phase === "step1-loading" && <ProgressTracker steps={step1Steps} isApiDone={state.isApiDone} onAllDone={handleStep1AnimDone} />}
          {state.phase === "step1-preview" && state.preview && state.country && (
            <LocationPreview data={state.preview} country={state.country} onContinue={() => dispatch({ type: "CONTINUE_TO_STEP2" })} />
          )}
          {state.phase === "step2-form"    && <StepDetails onSubmit={handleDetailsSubmit} />}
          {state.phase === "step2-loading" && <ProgressTracker steps={step2Steps} isApiDone={state.isApiDone} onAllDone={handleStep2AnimDone} />}
          {state.phase === "step2-result"  && state.result && state.country && (
            <ScoringResult
              result={state.result}
              country={state.country}
              region={state.region}
              produit={state.produit as string}
              fournisseur={state.fournisseur}
              stockage={state.stockage as string}
              onDone={handleSave}
            />
          )}
        </div>
      </div>
    </div>
  );
}
