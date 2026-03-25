/**
 * DIGBA — Page Historique des scores
 */
import { ClipboardList, Trash2 } from "lucide-react";
import { useHistoryStore } from "../../store/historyStore";
import { Badge } from "../../components/ui/Badge";
import type { NiveauRisque } from "../../types/api";
import { useLang } from "../../i18n/LangContext";

function scoreColor(score: number): string {
  if (score <= 35) return "text-green-600";
  if (score <= 65) return "text-yellow-600";
  return "text-red-600";
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

export default function History() {
  const { entries, clearHistory } = useHistoryStore();
  const { t, lang } = useLang();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{t.history.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.history.n_analyses(entries.length)}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => { if (confirm(t.history.confirm_clear)) clearHistory(); }}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {t.history.clear}
          </button>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 flex flex-col items-center gap-3 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">
            {t.history.empty_desc}
            <br />
            {t.history.empty_hint}
          </p>
        </div>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">{t.history.col_date}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">{t.history.col_product}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">{t.history.col_region}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">{t.history.col_supplier}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/70">{t.history.col_storage}</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground/70">{t.history.col_score}</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground/70">{t.history.col_level}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.date, lang === "fr" ? "fr-FR" : "en-GB")}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {t.products[entry.produit as keyof typeof t.products] ?? entry.produit}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{entry.region}</td>
                    <td className="px-4 py-3 text-foreground/80 max-w-[160px] truncate">{entry.fournisseur}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.storage[entry.stockage as keyof typeof t.storage] ?? entry.stockage}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-lg font-bold ${scoreColor(entry.score)}`}>
                        {entry.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge niveau={entry.niveau_risque as NiveauRisque} size="sm" label={t.risk[entry.niveau_risque as keyof typeof t.risk]} />
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
