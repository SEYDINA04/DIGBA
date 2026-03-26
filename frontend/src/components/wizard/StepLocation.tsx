/**
 * DIGBA Wizard — Étape 1 : Sélection du pays et de la région
 */
import { useState } from "react";
import { COUNTRIES, type CountryData } from "../../data/countries";
import { useLang } from "../../i18n/LangContext";

interface StepLocationProps {
  onSubmit: (country: CountryData, region: string) => void;
}

export function StepLocation({ onSubmit }: StepLocationProps) {
  const { t } = useLang();
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  const handleCountrySelect = (country: CountryData) => {
    setSelectedCountry(country);
    setSelectedRegion("");
  };

  const canSubmit = selectedCountry !== null && selectedRegion !== "";

  return (
    <div className="space-y-6">
      {/* Country grid */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t.wizard.country_label}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {COUNTRIES.map((country) => {
            const isSelected = selectedCountry?.code === country.code;
            return (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md focus:outline-none ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <span className="text-3xl">{country.flag}</span>
                <div>
                  <p className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {country.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.wizard.n_regions(country.regions.length)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Region grid — slides in after country selection */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          selectedCountry ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {selectedCountry && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {t.wizard.region_label}
              <span className="ml-2 text-primary normal-case font-normal not-italic">
                — {selectedCountry.flag} {selectedCountry.name}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {selectedCountry.regions.map((region) => {
                const isSelected = selectedRegion === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span className="text-xs mr-1">📍</span>
                    {region}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => canSubmit && onSubmit(selectedCountry!, selectedRegion)}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 focus:outline-none ${
          canSubmit
            ? "bg-primary text-primary-foreground shadow-lg hover:brightness-110"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {canSubmit ? (
          <>
            <span>🛰️</span>
            {t.wizard.btn_analyse(selectedRegion, selectedCountry?.name ?? "")}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        ) : (
          t.wizard.btn_select
        )}
      </button>
    </div>
  );
}
