/**
 * DIGBA — Zustand store pour l'historique des scores
 * Persisté dans localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryEntry, ScoreResponse, Produit, Stockage } from "../types/api";
import type { CountryData } from "../data/countries";

interface SaveMeta {
  country: CountryData;
  region: string;
  produit: Produit;
  fournisseur: string;
  stockage: Stockage;
  certifications: string[];
}

interface HistoryState {
  entries: HistoryEntry[];
  addEntry: (meta: SaveMeta, result: ScoreResponse) => void;
  clearHistory: () => void;
}

let _counter = 0;
function generateId(): string {
  return `${Date.now()}-${++_counter}`;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (meta, result) => {
        const entry: HistoryEntry = {
          id: generateId(),
          date: new Date().toISOString(),
          produit: meta.produit,
          region: meta.region,
          country: meta.country.code,
          fournisseur: meta.fournisseur,
          stockage: meta.stockage,
          certifications: meta.certifications,
          score: result.score,
          niveau_risque: result.niveau_risque,
        };
        set((state) => ({ entries: [entry, ...state.entries] }));
      },

      clearHistory: () => set({ entries: [] }),
    }),
    { name: "digba-history" }
  )
);
