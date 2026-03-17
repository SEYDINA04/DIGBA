/**
 * DIGBA Wizard — Étape 1 : Sélection du pays et de la région
 */
import { useState } from "react";
import { COUNTRIES, type CountryData } from "../../data/countries";

interface StepLocationProps {
  onSubmit: (country: CountryData, region: string) => void;
}

export function StepLocation({ onSubmit }: StepLocationProps) {
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
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Pays de production
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
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <span className="text-3xl">{country.flag}</span>
                <div>
                  <p className={`font-semibold text-sm ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                    {country.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {country.regions.length} régions
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
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Région de production
              <span className="ml-2 text-blue-600 normal-case font-normal not-italic">
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
                        ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
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
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {canSubmit ? (
          <>
            <span>🛰️</span>
            Analyser {selectedRegion}, {selectedCountry?.name}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        ) : (
          "Sélectionnez un pays et une région"
        )}
      </button>
    </div>
  );
}
