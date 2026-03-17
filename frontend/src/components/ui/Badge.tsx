/**
 * DIGBA — Badge de niveau de risque
 */
import type { NiveauRisque } from "../../types/api";

const styles: Record<NiveauRisque, string> = {
  Faible:  "bg-green-100  text-green-800  border border-green-200",
  Modéré:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Élevé:   "bg-red-100    text-red-800    border border-red-200",
};

interface BadgeProps {
  niveau: NiveauRisque;
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5 font-semibold",
};

export function Badge({ niveau, size = "md" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${styles[niveau]} ${sizeClass[size]}`}
    >
      {niveau}
    </span>
  );
}
