/**
 * DIGBA — 4 cards de détail : NDVI / Météo / RASFF / Opérateur
 */
import type { ScoreResponse } from "../../types/api";
import { Card } from "../ui/Card";
import { ScoreBar } from "../ui/ScoreBar";

interface ScoreDetailsProps {
  result: ScoreResponse;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

/** Retourne le libellé de la classe végétale dominante depuis le dict classes */
function dominantClass(classes: Record<string, number>): string {
  const labels: Record<string, string> = {
    eau_nuages: "Eau / Nuages",
    sol_nu: "Sol nu",
    vegetation_moderee: "Végétation modérée",
    vegetation_dense: "Végétation dense",
    indisponible: "Indisponible",
  };
  const dominant = Object.entries(classes).reduce(
    (max, entry) => (entry[1] > max[1] ? entry : max),
    ["", -1]
  )[0];
  return labels[dominant] ?? dominant;
}

export function ScoreDetails({ result }: ScoreDetailsProps) {
  const { ndvi, weather, rasff, operator } = result.details;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {/* ── NDVI ──────────────────────────────── */}
      <Card title="NDVI Satellite" icon="🛰️">
        <div className="mb-3">
          <ScoreBar score={ndvi.score} showLabel />
        </div>
        <div className="space-y-0">
          <DetailRow label="Indice NDVI" value={ndvi.ndvi_mean.toFixed(3)} />
          <DetailRow
            label="Min / Max"
            value={`${ndvi.ndvi_min.toFixed(2)} / ${ndvi.ndvi_max.toFixed(2)}`}
          />
          <DetailRow label="Végétation dominante" value={dominantClass(ndvi.classes)} />
        </div>
        {ndvi.map_path && (
          <p className="mt-2 text-xs text-gray-400 italic truncate">
            Carte : {ndvi.map_path.split("/").pop()}
          </p>
        )}
      </Card>

      {/* ── Météo ─────────────────────────────── */}
      <Card title="Météo" icon="🌤️">
        <div className="mb-3">
          <ScoreBar score={weather.score} showLabel />
        </div>
        <div className="space-y-0">
          <DetailRow label="Ville" value={weather.city} />
          <DetailRow label="Humidité" value={`${weather.humidity} %`} />
          <DetailRow label="Température" value={`${weather.temp_c} °C`} />
          <DetailRow label="Précipitations" value={`${weather.precip_mm} mm`} />
          <DetailRow label="Conditions" value={weather.weather_desc} />
        </div>
      </Card>

      {/* ── RASFF ─────────────────────────────── */}
      <Card title="RASFF EU" icon="🇪🇺">
        <div className="mb-3">
          <ScoreBar score={rasff.score} showLabel />
        </div>
        <div className="space-y-0">
          <DetailRow label="Rejets (24 mois)" value={rasff.nb_rejets_24m} />
          <DetailRow label="Rejets (région)" value={rasff.nb_rejets_region} />
          <DetailRow
            label="Blacklisté"
            value={
              rasff.blackliste ? (
                <span className="text-red-600 font-semibold">Oui</span>
              ) : (
                <span className="text-green-600">Non</span>
              )
            }
          />
          {rasff.derniers_dangers.length > 0 && (
            <DetailRow
              label="Dangers"
              value={
                <span className="text-right max-w-[140px] text-xs leading-tight block">
                  {rasff.derniers_dangers.slice(0, 2).join(", ")}
                  {rasff.derniers_dangers.length > 2 && "…"}
                </span>
              }
            />
          )}
        </div>
      </Card>

      {/* ── Opérateur ─────────────────────────── */}
      <Card title="Opérateur" icon="👤">
        <div className="mb-3">
          <ScoreBar score={operator.score} showLabel />
        </div>
        <div className="space-y-0">
          <DetailRow
            label="Stockage"
            value={operator.stockage.replace(/_/g, " ")}
          />
          <DetailRow
            label="Certifications"
            value={
              operator.certifications.length > 0
                ? operator.certifications.join(", ")
                : "Aucune"
            }
          />
        </div>
        {Object.keys(operator.facteurs).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {Object.values(operator.facteurs).map((label, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
