/**
 * DIGBA — Card générique réutilisable
 */
import React from "react";

interface CardProps {
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Card({ title, icon, className = "", children }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${className}`}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-xl">{icon}</span>}
          {title && (
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              {title}
            </h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
