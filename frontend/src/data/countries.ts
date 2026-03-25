/**
 * DIGBA — Données pays & régions pour le wizard d'analyse
 */

export interface CountryData {
  code: string;
  name: string;
  flag: string;
  regions: string[];
  /** Couleur d'accent utilisée dans l'UI */
  color: string;
}

export const COUNTRIES: CountryData[] = [
  {
    code: "SN",
    name: "Sénégal",
    flag: "🇸🇳",
    color: "#16a34a",
    regions: ["Kaolack", "Thiès", "Dakar", "Ziguinchor", "Saint-Louis"],
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    color: "#d97706",
    regions: ["Kumasi", "Accra", "Cape Coast", "Tamale", "Sunyani"],
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    color: "#16a34a",
    regions: ["Lagos", "Kano", "Ibadan", "Abuja", "Port Harcourt"],
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    color: "#ea580c",
    regions: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo"],
  },
];

/** Coordonnées GPS (WGS-84) des 20 régions analysables */
export const REGION_COORDS: Record<string, { lat: number; lon: number }> = {
  // Sénégal
  Kaolack:      { lat: 14.1507, lon: -16.0726 },
  Thiès:        { lat: 14.7886, lon: -16.9257 },
  Dakar:        { lat: 14.7167, lon: -17.4677 },
  Ziguinchor:   { lat: 12.5648, lon: -16.2773 },
  "Saint-Louis":{ lat: 16.0333, lon: -16.5000 },
  // Ghana
  Kumasi:       { lat:  6.6885, lon:  -1.6244 },
  Accra:        { lat:  5.5560, lon:  -0.1969 },
  "Cape Coast": { lat:  5.1053, lon:  -1.2467 },
  Tamale:       { lat:  9.4005, lon:  -0.8393 },
  Sunyani:      { lat:  7.3349, lon:  -2.3213 },
  // Nigeria
  Lagos:           { lat:  6.5244, lon:  3.3792 },
  Kano:            { lat: 12.0022, lon:  8.5919 },
  Ibadan:          { lat:  7.3776, lon:  3.9470 },
  Abuja:           { lat:  9.0579, lon:  7.4951 },
  "Port Harcourt": { lat:  4.8156, lon:  7.0498 },
  // Côte d'Ivoire
  Abidjan:      { lat:  5.3600, lon: -4.0083 },
  Bouaké:       { lat:  7.6906, lon: -5.0302 },
  Yamoussoukro: { lat:  6.8276, lon: -5.2893 },
  "San-Pédro":  { lat:  4.7482, lon: -6.6363 },
  Korhogo:      { lat:  9.4578, lon: -5.6291 },
};

// FB-01 : noix_de_cajou retiré (mycotoxines déjà traitées en amont)
export const PRODUITS = [
  { value: "arachide", label: "Arachide", desc: "Arachis hypogaea"       },
  { value: "mil",      label: "Mil",      desc: "Pennisetum glaucum"     },
  { value: "sorgho",   label: "Sorgho",   desc: "Sorghum bicolor"        },
  { value: "sesame",   label: "Sésame",   desc: "Sesamum indicum"        },
  { value: "cacao",    label: "Cacao",    desc: "Theobroma cacao"        },
] as const;

export const STOCKAGES = [
  {
    value: "silo_ventile",
    label: "Silo ventilé",
    desc: "Stockage industriel avec contrôle de l'humidité",
    risk: "Faible",
  },
  {
    value: "hangar",
    label: "Hangar",
    desc: "Entreposage couvert, conditions partiellement maîtrisées",
    risk: "Modéré",
  },
  {
    value: "plein_air",
    label: "Plein air",
    desc: "Stockage à l'extérieur, exposition aux intempéries",
    risk: "Élevé",
  },
] as const;

export const CERTIFICATIONS = [
  { value: "GlobalG.A.P.", label: "GlobalG.A.P.", reduction: 20 },
  { value: "HACCP",        label: "HACCP",        reduction: 15 },
  { value: "ISO22000",     label: "ISO 22000",    reduction: 20 },
  { value: "BRC",          label: "BRC Food",     reduction: 15 },
  { value: "IFS",          label: "IFS Food",     reduction: 10 },
];
