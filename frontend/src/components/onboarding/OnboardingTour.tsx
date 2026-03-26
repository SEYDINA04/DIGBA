/**
 * DIGBA — Onboarding Tour (driver.js v1)
 * Spotlight effect : assombrit tout sauf l'élément cible, étape par étape.
 */
import { useEffect, useImperativeHandle, forwardRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useTour } from "../../hooks/useTour";

export interface OnboardingTourHandle {
  start: () => void;
}

const OnboardingTour = forwardRef<OnboardingTourHandle>((_, ref) => {
  const { isFirstVisit, markDone } = useTour();

  const startTour = () => {
    const driverObj = driver({
      animate: true,
      smoothScroll: true,
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Got it ✓",
      progressText: "{{current}} / {{total}}",
      popoverClass: "digba-tour-popover",
      overlayOpacity: 0.75,
      onDestroyed: markDone,
      steps: [
        {
          element: "#tour-hero",
          popover: {
            title: "Welcome to DIGBA",
            description:
              "Food safety risk scoring for West African agro-exporters. " +
              "Combines satellite data, historical weather & EU rejection records.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-stats",
          popover: {
            title: "Your dashboard",
            description:
              "Track all your analyses at a glance — total, low risk, and at-risk lots.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tour-new-analysis",
          popover: {
            title: "Start an analysis",
            description:
              "Click here to launch a new risk scoring. " +
              "Select a zone, describe your lot — results in under 60 seconds.",
            side: "left",
            align: "center",
          },
        },
        {
          element: "#tour-recent",
          popover: {
            title: "Recent analyses",
            description:
              "Your last analyses appear here. " +
              "Each card shows the risk score and lot details.",
            side: "top",
            align: "start",
          },
        },
        {
          element: "#tour-nav-rasff",
          popover: {
            title: "RASFF EU database",
            description:
              "Browse 15 years of EU food safety rejections — " +
              "by product, supplier, and country.",
            side: "bottom",
            align: "center",
          },
        },
      ],
    });

    driverObj.drive();
  };

  // Expose startTour à la Navbar via ref
  useImperativeHandle(ref, () => ({ start: startTour }));

  // Auto-démarrage à la première visite (300ms délai pour le DOM)
  useEffect(() => {
    if (isFirstVisit) {
      const t = setTimeout(startTour, 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
});

OnboardingTour.displayName = "OnboardingTour";
export default OnboardingTour;
