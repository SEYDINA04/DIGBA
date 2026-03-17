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

export const PRODUITS = [
  { value: "noix_de_cajou", label: "Noix de cajou", icon: "🥜", desc: "Anacardium occidentale" },
  { value: "arachide",      label: "Arachide",      icon: "🥜", desc: "Arachis hypogaea" },
  { value: "mil",           label: "Mil",           icon: "🌾", desc: "Pennisetum glaucum" },
  { value: "sorgho",        label: "Sorgho",        icon: "🌾", desc: "Sorghum bicolor" },
] as const;

export const STOCKAGES = [
  {
    value: "silo_ventile",
    label: "Silo ventilé",
    icon: "🏭",
    desc: "Stockage industriel avec contrôle de l'humidité",
    risk: "Faible",
  },
  {
    value: "hangar",
    label: "Hangar",
    icon: "🏠",
    desc: "Entreposage couvert, conditions partiellement maîtrisées",
    risk: "Modéré",
  },
  {
    value: "plein_air",
    label: "Plein air",
    icon: "🌿",
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
