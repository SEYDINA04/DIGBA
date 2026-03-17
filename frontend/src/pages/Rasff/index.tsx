/**
 * DIGBA — Page Statistiques RASFF EU
 */
import { useQuery } from "@tanstack/react-query";
import { rasffApi } from "../../services/api";
import type { RasffStatsDanger, RasffStatsFournisseur } from "../../types/api";

// ── Table dangers ──────────────────────────────────────────────────────────

function TableDangers({ data }: { data: RasffStatsDanger[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="pb-3 font-semibold text-gray-700">Danger</th>
            <th className="pb-3 font-semibold text-gray-700">Catégorie</th>
            <th className="pb-3 font-semibold text-gray-700 text-right">Rejets</th>
            <th className="pb-3 font-semibold text-gray-700 text-right">Dernier rejet</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 font-medium text-gray-900">{row.danger}</td>
              <td className="py-3 text-gray-600">{row.categorie_danger}</td>
              <td className="py-3 text-right">
                <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 min-w-[28px]">
                  {row.nb_rejets}
                </span>
              </td>
              <td className="py-3 text-right text-gray-500">
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

function TableFournisseurs({ data }: { data: RasffStatsFournisseur[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="pb-3 font-semibold text-gray-700">Fournisseur</th>
            <th className="pb-3 font-semibold text-gray-700 text-right">Rejets</th>
            <th className="pb-3 font-semibold text-gray-700 text-right">Dernier rejet</th>
            <th className="pb-3 font-semibold text-gray-700">Dangers identifiés</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 font-medium text-gray-900">{row.fournisseur}</td>
              <td className="py-3 text-right">
                <span className="inline-flex items-center justify-center rounded-full bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 min-w-[28px]">
                  {row.nb_rejets}
                </span>
              </td>
              <td className="py-3 text-right text-gray-500">
                {row.dernier_rejet?.slice(0, 10)}
              </td>
              <td className="py-3 text-gray-600 text-xs max-w-[200px] truncate">
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
        <div key={i} className="h-10 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Rasff() {
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
        <h1 className="text-2xl font-bold text-gray-900">Statistiques RASFF</h1>
        <p className="mt-1 text-sm text-gray-500">
          Historique des rejets européens sur les produits agricoles sénégalais.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Table dangers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">⚠️</span>
            <h2 className="font-semibold text-gray-800">
              Rejets par type de danger
            </h2>
            {statsQuery.data && (
              <span className="ml-auto text-xs text-gray-400">
                {statsQuery.data.length} dangers
              </span>
            )}
          </div>
          {statsQuery.isLoading && <TableSkeleton />}
          {statsQuery.isError && (
            <p className="text-sm text-red-600">
              Erreur : {statsQuery.error.message}
            </p>
          )}
          {statsQuery.data && <TableDangers data={statsQuery.data} />}
        </div>

        {/* Table fournisseurs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🏭</span>
            <h2 className="font-semibold text-gray-800">
              Historique par fournisseur
            </h2>
            {fournsQuery.data && (
              <span className="ml-auto text-xs text-gray-400">
                {fournsQuery.data.length} fournisseurs
              </span>
            )}
          </div>
          {fournsQuery.isLoading && <TableSkeleton />}
          {fournsQuery.isError && (
            <p className="text-sm text-red-600">
              Erreur : {fournsQuery.error.message}
            </p>
          )}
          {fournsQuery.data && <TableFournisseurs data={fournsQuery.data} />}
        </div>
      </div>
    </div>
  );
}
