/**
 * DIGBA — Page Statistiques RASFF EU
 */
import { useQuery } from "@tanstack/react-query";
import { rasffApi } from "../../services/api";
import type { RasffStatsDanger, RasffStatsFournisseur } from "../../types/api";
import { useLang } from "../../i18n/LangContext";

// ── Table dangers ──────────────────────────────────────────────────────────

function TableDangers({ data, col_danger, col_category, col_rejets, col_last }: {
  data: RasffStatsDanger[];
  col_danger: string;
  col_category: string;
  col_rejets: string;
  col_last: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-border">
            <th className="pb-3 font-semibold text-foreground/70">{col_danger}</th>
            <th className="pb-3 font-semibold text-foreground/70">{col_category}</th>
            <th className="pb-3 font-semibold text-foreground/70 text-right">{col_rejets}</th>
            <th className="pb-3 font-semibold text-foreground/70 text-right">{col_last}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border hover:bg-muted/40 transition-colors"
            >
              <td className="py-3 font-medium text-foreground">{row.danger}</td>
              <td className="py-3 text-muted-foreground">{row.categorie_danger}</td>
              <td className="py-3 text-right">
                <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 min-w-[28px]">
                  {row.nb_rejets}
                </span>
              </td>
              <td className="py-3 text-right text-muted-foreground">
                {row.dernier_rejet?.slice(0, 10)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Table fournisseurs ─────────────────────────────────────────────────────

function TableFournisseurs({ data, col_supplier, col_rejets, col_last, col_hazards }: {
  data: RasffStatsFournisseur[];
  col_supplier: string;
  col_rejets: string;
  col_last: string;
  col_hazards: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-border">
            <th className="pb-3 font-semibold text-foreground/70">{col_supplier}</th>
            <th className="pb-3 font-semibold text-foreground/70 text-right">{col_rejets}</th>
            <th className="pb-3 font-semibold text-foreground/70 text-right">{col_last}</th>
            <th className="pb-3 font-semibold text-foreground/70">{col_hazards}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border hover:bg-muted/40 transition-colors"
            >
              <td className="py-3 font-medium text-foreground">{row.fournisseur}</td>
              <td className="py-3 text-right">
                <span className="inline-flex items-center justify-center rounded-full bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 min-w-[28px]">
                  {row.nb_rejets}
                </span>
              </td>
              <td className="py-3 text-right text-muted-foreground">
                {row.dernier_rejet?.slice(0, 10)}
              </td>
              <td className="py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                {row.dangers}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-muted rounded" />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Rasff() {
  const { t } = useLang();

  const statsQuery = useQuery({
    queryKey: ["rasff-stats"],
    queryFn: rasffApi.getStats,
  });

  const fournsQuery = useQuery({
    queryKey: ["rasff-fournisseurs"],
    queryFn: rasffApi.getFournisseurs,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">{t.rasff.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.rasff.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Table dangers */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">⚠️</span>
            <h2 className="font-semibold text-foreground">{t.rasff.dangers_title}</h2>
            {statsQuery.data && (
              <span className="ml-auto text-xs text-muted-foreground/60">
                {statsQuery.data.length} {t.rasff.n_dangers}
              </span>
            )}
          </div>
          {statsQuery.isLoading && <TableSkeleton />}
          {statsQuery.isError && (
            <p className="text-sm text-red-600">{statsQuery.error.message}</p>
          )}
          {statsQuery.data && (
            <TableDangers
              data={statsQuery.data}
              col_danger={t.rasff.col_danger}
              col_category={t.rasff.col_category}
              col_rejets={t.rasff.col_rejets}
              col_last={t.rasff.col_last}
            />
          )}
        </div>

        {/* Table fournisseurs */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🏭</span>
            <h2 className="font-semibold text-foreground">{t.rasff.fournisseurs_title}</h2>
            {fournsQuery.data && (
              <span className="ml-auto text-xs text-muted-foreground/60">
                {fournsQuery.data.length} {t.rasff.n_suppliers}
              </span>
            )}
          </div>
          {fournsQuery.isLoading && <TableSkeleton />}
          {fournsQuery.isError && (
            <p className="text-sm text-red-600">{fournsQuery.error.message}</p>
          )}
          {fournsQuery.data && (
            <TableFournisseurs
              data={fournsQuery.data}
              col_supplier={t.rasff.col_supplier}
              col_rejets={t.rasff.col_rejets}
              col_last={t.rasff.col_last}
              col_hazards={t.rasff.col_hazards}
            />
          )}
        </div>
      </div>
    </div>
  );
}
