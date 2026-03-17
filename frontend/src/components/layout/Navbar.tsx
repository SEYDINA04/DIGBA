/**
 * DIGBA — Barre de navigation
 */
import { NavLink } from "react-router-dom";

const links = [
  { to: "/",        label: "Analyse",    icon: "🧮" },
  { to: "/rasff",   label: "RASFF",      icon: "🇪🇺" },
  { to: "/history", label: "Historique", icon: "📋" },
];

export function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <div className="leading-tight">
            <p className="font-bold text-gray-900 text-lg tracking-tight">DIGBA</p>
            <p className="text-xs text-gray-500 hidden sm:block">Scoring Anacarde</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
