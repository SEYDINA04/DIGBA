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
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Intercepteur global pour logger les erreurs
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail ?? err.message ?? "Erreur réseau";
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
