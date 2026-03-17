/**
 * DIGBA — Barre de progression du score 0–100%
 */

interface ScoreBarProps {
  score: number; // 0–100
  showLabel?: boolean;
  height?: "sm" | "md" | "lg";
}

function getColor(score: number): string {
  if (score <= 35) return "bg-green-500";
  if (score <= 65) return "bg-yellow-500";
  return "bg-red-500";
}

const heightClass = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ScoreBar({ score, showLabel = false, height = "md" }: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const color = getColor(clamped);

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClass[height]}`}>
        <div
          className={`${color} rounded-full transition-all duration-700 ease-out h-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0%</span>
          <span className="font-semibold text-gray-700">{clamped}%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}
