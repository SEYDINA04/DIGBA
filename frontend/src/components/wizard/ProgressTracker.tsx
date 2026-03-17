/**
 * DIGBA — ProgressTracker
 * Affiche une timeline d'étapes animées : pending → active → done.
 * Lance onAllDone() quand toutes les étapes sont terminées ET que l'API a répondu.
 */
import { useEffect, useRef, useState } from "react";

export interface TrackerStep {
  id: string;
  icon: string;
  label: string;
  durationMs: number;
}

interface ProgressTrackerProps {
  steps: TrackerStep[];
  isApiDone: boolean;
  onAllDone: () => void;
}

type StepStatus = "pending" | "active" | "done";

export function ProgressTracker({ steps, isApiDone, onAllDone }: ProgressTrackerProps) {
  const [statuses, setStatuses] = useState<StepStatus[]>(
    steps.map((_, i) => (i === 0 ? "active" : "pending"))
  );
  const [times, setTimes] = useState<(number | null)[]>(steps.map(() => null));
  const animDoneRef = useRef(false);
  const startRef = useRef(Date.now());

  // Build the animation sequence
  useEffect(() => {
    startRef.current = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;

    steps.forEach((step, i) => {
      // Mark step i as active (already done for i=0 in initial state)
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

      // Mark step i as done
      const doneAt = cumulative;
      timers.push(
        setTimeout(() => {
          const elapsed = Date.now() - startRef.current;
          setStatuses((prev) => {
            const next = [...prev];
            next[i] = "done";
            return next;
          });
          setTimes((prev) => {
            const next = [...prev];
            next[i] = elapsed;
            return next;
          });
          if (i === steps.length - 1) {
            animDoneRef.current = true;
          }
        }, doneAt)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire onAllDone when animation complete AND API done
  useEffect(() => {
    if (isApiDone && animDoneRef.current) {
      const t = setTimeout(onAllDone, 300);
      return () => clearTimeout(t);
    }
  }, [isApiDone, statuses]); // re-check whenever statuses change

  return (
    <div className="py-6 px-4">
      <div className="relative">
        {/* Vertical connecting line */}
        <div
          className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100"
          aria-hidden
        />

        <ul className="space-y-4">
          {steps.map((step, i) => {
            const status = statuses[i];
            const elapsed = times[i];

            return (
              <li key={step.id} className="relative flex items-center gap-4">
                {/* Circle indicator */}
                <div
                  className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    status === "done"
                      ? "border-emerald-500 bg-emerald-500"
                      : status === "active"
                      ? "border-blue-500 bg-white"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {status === "done" ? (
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : status === "active" ? (
                    <svg
                      className="h-5 w-5 animate-spin text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12" cy="12" r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm text-gray-300">{i + 1}</span>
                  )}
                </div>

                {/* Label + elapsed */}
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">
                      <span className="mr-2">{step.icon}</span>
                      <span
                        className={
                          status === "done"
                            ? "text-emerald-700"
                            : status === "active"
                            ? "text-blue-700"
                            : "text-gray-400"
                        }
                      >
                        {step.label}
                        {status === "active" && (
                          <span className="ml-1 animate-pulse">…</span>
                        )}
                      </span>
                    </span>
                  </div>
                  {status === "done" && elapsed !== null && (
                    <span className="text-xs text-emerald-500 font-mono">
                      {(elapsed / 1000).toFixed(1)}s ✓
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
