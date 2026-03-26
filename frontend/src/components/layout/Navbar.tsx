/**
 * DIGBA — Barre de navigation
 */
import { NavLink } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useLang } from "../../i18n/LangContext";

export function Navbar() {
  const { lang, setLang, t } = useLang();

  const links = [
    { to: "/",        label: t.nav.analyse,  icon: "🧮" },
    { to: "/rasff",   label: t.nav.rasff,    icon: "🇪🇺" },
    { to: "/history", label: t.nav.history,  icon: "📋" },
  ];

  return (
    <header className="bg-section-dark sticky top-0 z-30 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-secondary" />
          <div className="leading-tight">
            <p className="font-display font-bold text-section-dark-foreground text-lg tracking-tight">DIGBA</p>
            <p className="text-xs text-section-dark-foreground/40 hidden sm:block">{t.nav.subtitle}</p>
          </div>
        </div>

        {/* Navigation + Lang toggle */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {links.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary/15 text-secondary"
                      : "text-section-dark-foreground/60 hover:bg-white/10 hover:text-section-dark-foreground"
                  }`
                }
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Language toggle */}
          <div className="flex items-center rounded-lg overflow-hidden border border-white/15 ml-2">
            {(["fr", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  lang === l
                    ? "bg-secondary text-secondary-foreground"
                    : "text-section-dark-foreground/50 hover:bg-white/10 hover:text-section-dark-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
