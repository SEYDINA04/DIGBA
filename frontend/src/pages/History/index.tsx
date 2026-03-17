/**
 * DIGBA — Page Historique des scores
 */
import { useHistoryStore } from "../../store/historyStore";
import { Badge } from "../../components/ui/Badge";
import type { NiveauRisque } from "../../types/api";

const produitLabels: Record<string, string> = {
  noix_de_cajou: "Noix de cajou",
  arachide:      "Arachide",
  mil:           "Mil",
  sorgho:        "Sorgho",
};

const stockageLabels: Record<string, string> = {
  silo_ventile: "Silo ventilé",
  hangar:       "Hangar",
  plein_air:    "Plein air",
};

function scoreColor(score: number): string {
  if (score <= 35) return "text-green-600";
  if (score <= 65) return "text-yellow-600";
  return "text-red-600";
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

export default function History() {
  const { entries, clearHistory } = useHistoryStore();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
          <p className="mt-1 text-sm text-gray-500">
            {entries.length} analyse{entries.length !== 1 ? "s" : ""} enregistrée
            {entries.length !== 1 ? "s" : ""} localement.
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Vider l'historique ?")) clearHistory();
            }}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
          >
            🗑️ Vider l'historique
          </button>
        )}
      </div>

      {/* Vide */}
      {entries.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-gray-500 text-sm">
            Aucune analyse enregistrée pour l'instant.
            <br />
            Lancez une analyse depuis la page <strong>Analyse</strong>.
          </p>
        </div>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Produit</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Région</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Fournisseur</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Stockage</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Score</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Niveau</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {produitLabels[entry.produit] ?? entry.produit}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.region}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">
                      {entry.fournisseur}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {stockageLabels[entry.stockage] ?? entry.stockage}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-lg font-bold ${scoreColor(entry.score)}`}
                      >
                        {entry.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge niveau={entry.niveau_risque as NiveauRisque} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
