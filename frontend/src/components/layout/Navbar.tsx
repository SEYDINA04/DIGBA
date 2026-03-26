/**
 * DIGBA — Barre de navigation
 */
import { NavLink } from "react-router-dom";
import { ShieldCheck, BarChart3, ClipboardList, Globe, HelpCircle } from "lucide-react";
import { useLang } from "../../i18n/LangContext";
import { useTour } from "../../hooks/useTour";

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const { resetTour } = useTour();

  const links = [
    { to: "/",        label: t.nav.analyse,  Icon: BarChart3,    tourId: undefined         },
    { to: "/rasff",   label: t.nav.rasff,    Icon: Globe,        tourId: "tour-nav-rasff"  },
    { to: "/history", label: t.nav.history,  Icon: ClipboardList, tourId: undefined        },
  ];

  const handleRestartTour = () => {
    resetTour();
    window.location.reload();
  };

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
            {links.map(({ to, label, Icon, tourId }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                id={tourId}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary/15 text-secondary"
                      : "text-section-dark-foreground/60 hover:bg-white/10 hover:text-section-dark-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Tour restart button */}
          <button
            type="button"
            onClick={handleRestartTour}
            title="Restart guide"
            className="p-2 rounded-lg text-section-dark-foreground/50 hover:bg-white/10 hover:text-section-dark-foreground transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

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
