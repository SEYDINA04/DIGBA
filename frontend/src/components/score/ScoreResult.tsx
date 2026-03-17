/**
 * DIGBA — Score global + décision
 */
import type { ScoreResponse } from "../../types/api";
import { Badge } from "../ui/Badge";
import { ScoreBar } from "../ui/ScoreBar";

interface ScoreResultProps {
  result: ScoreResponse;
}

function scoreColor(score: number): string {
  if (score <= 35) return "text-green-600";
  if (score <= 65) return "text-yellow-600";
  return "text-red-600";
}

export function ScoreResult({ result }: ScoreResultProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 text-lg">Résultat d'analyse</h2>
        <Badge niveau={result.niveau_risque} size="lg" />
      </div>

      {/* Score chiffre */}
      <div className="text-center py-4">
        <span className={`text-7xl font-black ${scoreColor(result.score)}`}>
          {result.score}
        </span>
        <span className="text-2xl text-gray-400 font-light">%</span>
        <p className="text-sm text-gray-500 mt-1">Score de risque</p>
      </div>

      {/* Barre */}
      <div className="my-4">
        <ScoreBar score={result.score} showLabel height="lg" />
      </div>

      {/* Décision */}
      <div
        className={`mt-4 rounded-lg p-4 text-sm font-medium leading-relaxed ${
          result.niveau_risque === "Faible"
            ? "bg-green-50 text-green-800 border border-green-200"
            : result.niveau_risque === "Modéré"
            ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}
      >
        {result.decision}
      </div>
    </div>
  );
}
