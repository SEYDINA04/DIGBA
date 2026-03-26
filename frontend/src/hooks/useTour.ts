/**
 * DIGBA — Hook onboarding tour
 * Gère le flag localStorage + expose startTour via context global
 */
import { useCallback } from "react";

const TOUR_KEY = "digba_tour_done";

export function useTour() {
  const isFirstVisit = !localStorage.getItem(TOUR_KEY);

  const markDone = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "1");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY);
  }, []);

  return { isFirstVisit, markDone, resetTour };
}
