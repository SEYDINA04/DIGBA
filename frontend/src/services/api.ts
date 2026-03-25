/**
 * DIGBA — Client API Axios
 */
import axios from "axios";
import type {
  ScoreRequest,
  ScoreResponse,
  PreviewResponse,
  RasffStatsDanger,
  RasffStatsFournisseur,
} from "../types/api";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

// Intercepteur global — normalise toutes les erreurs en string lisible
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail;

    let msg: string;

    if (!detail) {
      // Pas de réponse serveur (réseau, timeout, CORS...)
      msg = err.message ?? "Erreur réseau";
    } else if (typeof detail === "string") {
      // Erreur FastAPI classique : { "detail": "message..." }
      msg = detail;
    } else if (Array.isArray(detail)) {
      // Erreur de validation Pydantic : [{ loc, msg, type }]
      // On extrait les messages lisibles et on les joint
      msg = detail
        .map((d: { msg?: string; loc?: string[] }) => {
          const field = d.loc?.slice(1).join(".") ?? "";
          return field ? `${field}: ${d.msg}` : (d.msg ?? "Champ invalide");
        })
        .join(" · ");
    } else {
      // Objet inconnu → sérialisation de secours
      msg = JSON.stringify(detail);
    }

    return Promise.reject(new Error(msg));
  }
);

// ── Preview zone (wizard step 1) ───────────────────────────────────────────

export const previewApi = {
  fetch: (region: string, country: string): Promise<PreviewResponse> =>
    client
      .get<PreviewResponse>("/preview", { params: { region, country } })
      .then((r) => r.data),
};

// ── Scoring ────────────────────────────────────────────────────────────────

export const scoreApi = {
  submit: (form: ScoreRequest): Promise<ScoreResponse> =>
    client.post<ScoreResponse>("/score", form).then((r) => r.data),
};

// ── RASFF ──────────────────────────────────────────────────────────────────

export const rasffApi = {
  getStats: (): Promise<RasffStatsDanger[]> =>
    client.get<RasffStatsDanger[]>("/rasff/stats").then((r) => r.data),

  getFournisseurs: (): Promise<RasffStatsFournisseur[]> =>
    client
      .get<RasffStatsFournisseur[]>("/rasff/fournisseurs")
      .then((r) => r.data),
};

// ── Health ─────────────────────────────────────────────────────────────────

export const healthApi = {
  check: (): Promise<{ status: string; version: string }> =>
    client.get("/health").then((r) => r.data),
};
