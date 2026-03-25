/**
 * DIGBA — ProgressTracker v3
 * Animation orbitale : icônes lucide-react à la place des emojis.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { LucideProps } from "lucide-react";

export interface TrackerStep {
  id: string;
  Icon: React.ComponentType<LucideProps>;
  label: string;
  durationMs: number;
}

interface ProgressTrackerProps {
  steps: TrackerStep[];
  isApiDone: boolean;
  onAllDone: () => void;
}

type StepStatus = "pending" | "active" | "done";

const ORBIT_ANGLES = [270, 0, 90, 180];

export function ProgressTracker({ steps, isApiDone, onAllDone }: ProgressTrackerProps) {
  const [statuses, setStatuses] = useState<StepStatus[]>(
    steps.map((_, i) => (i === 0 ? "active" : "pending"))
  );
  const [tick, setTick] = useState(0);
  const animDoneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;

    steps.forEach((step, i) => {
      if (i > 0) {
        const activateAt = cumulative;
        timers.push(
          setTimeout(() => {
            setStatuses((prev) => {
              const next = [...prev];
              next[i] = "active";
              return next;
            });
          }, activateAt)
        );
      }
      cumulative += step.durationMs;
      timers.push(
        setTimeout(() => {
          setStatuses((prev) => {
            const next = [...prev];
            next[i] = "done";
            return next;
          });
          if (i === steps.length - 1) animDoneRef.current = true;
        }, cumulative)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isApiDone && animDoneRef.current) {
      const t = setTimeout(onAllDone, 150);
      return () => clearTimeout(t);
    }
  }, [isApiDone, statuses]);

  const doneCount  = statuses.filter((s) => s === "done").length;
  const progress   = doneCount / steps.length;
  const activeIdx  = statuses.findIndex((s) => s === "active");
  const activeStep = activeIdx >= 0 ? steps[activeIdx] : null;

  const R        = 54;
  const CIRC     = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - progress);
  const rotation = (tick * 3) % 360;

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 select-none">

      {/* ── Orbe central ── */}
      <div className="relative" style={{ width: 200, height: 200 }}>

        {/* Halo pulsant */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />

        {/* Anneau SVG */}
        <svg className="absolute inset-0" width={200} height={200} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
          <circle
            cx="60" cy="60" r={R - 10}
            fill="none"
            stroke="rgba(16,185,129,0.2)"
            strokeWidth="1"
            strokeDasharray="4 8"
            transform={`rotate(${rotation} 60 60)`}
          />
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Contenu central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="mb-1 text-white"
            style={{ animation: "bounce-soft 1.2s ease-in-out infinite" }}
          >
            {activeStep
              ? <activeStep.Icon className="h-7 w-7" />
              : <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            }
          </div>
          <span className="text-xl font-black text-white tabular-nums">
            {Math.round(progress * 100)}%
          </span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
            {doneCount}/{steps.length} phases
          </span>
        </div>

        {/* ── Satellites orbitaux ── */}
        {steps.map((step, i) => {
          const status   = statuses[i];
          const angleDeg = ORBIT_ANGLES[i % ORBIT_ANGLES.length];
          const angleRad = (angleDeg * Math.PI) / 180;
          const orbitR   = 88;
          const cx = 100 + Math.cos(angleRad) * orbitR;
          const cy = 100 + Math.sin(angleRad) * orbitR;

          return (
            <div
              key={step.id}
              className="absolute flex flex-col items-center"
              style={{ left: cx - 18, top: cy - 18, width: 36, height: 36, transition: "all 0.4s ease" }}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-lg
                  ${status === "done"
                    ? "bg-emerald-500 border-emerald-400 scale-110"
                    : status === "active"
                    ? "bg-white border-cyan-400 scale-125"
                    : "bg-gray-800 border-gray-600 opacity-40"
                  }`}
                style={
                  status === "active"
                    ? { boxShadow: "0 0 14px 4px rgba(6,182,212,0.6)", animation: "pulse-ring 1.5s ease-in-out infinite" }
                    : status === "done"
                    ? { boxShadow: "0 0 8px 2px rgba(16,185,129,0.5)" }
                    : {}
                }
              >
                {status === "done" ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <step.Icon
                    className={`w-4 h-4 ${status === "active" ? "text-cyan-600" : "text-gray-500"}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Label étape active ── */}
      <div className="mt-8 text-center min-h-[48px]">
        {activeStep ? (
          <>
            <p className="text-sm font-semibold text-white/90 animate-pulse">
              {activeStep.label}
            </p>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">
              Analyse en cours
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-emerald-400">Analyse terminée</p>
            <p className="text-xs text-white/40 mt-1">Chargement des résultats…</p>
          </>
        )}
      </div>

      {/* ── Légende ── */}
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2">
        {steps.map((step, i) => {
          const status = statuses[i];
          return (
            <div key={step.id} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                status === "done" ? "bg-emerald-400" : status === "active" ? "bg-cyan-400 animate-pulse" : "bg-gray-600"
              }`} />
              <span className={`text-xs truncate ${
                status === "done" ? "text-emerald-400" : status === "active" ? "text-white" : "text-white/30"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes bounce-soft {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(6,182,212,0.5); }
          50%       { box-shadow: 0 0 20px 6px rgba(6,182,212,0.8); }
        }
      `}</style>
    </div>
  );
}
