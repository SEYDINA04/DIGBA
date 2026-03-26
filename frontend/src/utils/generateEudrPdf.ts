/**
 * DIGBA — Générateur PDF déclaration EUDR
 * Utilise jsPDF pour produire un document de conformité téléchargeable.
 */
import { jsPDF } from "jspdf";
import type { ScoreResponse } from "../types/api";

interface PdfMeta {
  region: string;
  countryName: string;
  countryCode: string;
  produit: string;
  fournisseur: string;
  stockage: string;
  lat: number;
  lon: number;
}

const RISK_COLOR: Record<string, [number, number, number]> = {
  "Faible":  [34, 197, 94],
  "Modéré":  [234, 179, 8],
  "Élevé":   [239, 68, 68],
};

function formatGps(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon < 0 ? "W" : "E";
  return `${Math.abs(lat).toFixed(6)}°${latDir}  ${Math.abs(lon).toFixed(6)}°${lonDir}`;
}

function refNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
  return `DIGBA-EUDR-${ymd}-${rnd}`;
}

export function generateEudrPdf(result: ScoreResponse, meta: PdfMeta): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  let y = 0;

  // ── Colors ────────────────────────────────────────────────────────────────
  const GREEN: [number, number, number]  = [34, 197, 94];
  const DARK:  [number, number, number]  = [17, 24, 39];
  const GRAY:  [number, number, number]  = [107, 114, 128];
  const LIGHT: [number, number, number]  = [243, 244, 246];
  const riskRgb = RISK_COLOR[result.niveau_risque] ?? RISK_COLOR["Modéré"];

  // ── Header band ───────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DIGBA", 14, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREEN);
  doc.text("EUDR Due Diligence Declaration", 14, 20);
  doc.text("EU Deforestation Regulation (EU) 2023/1115", 14, 26);

  const ref = refNumber();
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.text(`Ref: ${ref}`, W - 14, 13, { align: "right" });
  doc.text(new Date().toISOString().slice(0, 10), W - 14, 19, { align: "right" });

  y = 38;

  // ── Section helper ────────────────────────────────────────────────────────
  function section(title: string) {
    doc.setFillColor(...LIGHT);
    doc.rect(14, y - 4, W - 28, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(title.toUpperCase(), 16, y + 1);
    y += 8;
  }

  function row(label: string, value: string, bold = false) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(label, 16, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...DARK);
    doc.text(value, 80, y);
    y += 6;
  }

  function divider() {
    doc.setDrawColor(229, 231, 235);
    doc.line(14, y, W - 14, y);
    y += 4;
  }

  // ── 1. Operator ────────────────────────────────────────────────────────────
  section("1. Operator & Product");
  row("Operator / Supplier", meta.fournisseur, true);
  row("Product", meta.produit.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  row("Storage type", meta.stockage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  row("Certifications", result.details.operator.certifications.join(", ") || "None declared");
  y += 2;

  // ── 2. Production zone ─────────────────────────────────────────────────────
  divider();
  section("2. Production Zone");
  row("Country", `${meta.countryName} (${meta.countryCode})`);
  row("Region", meta.region);
  row("GPS Coordinates (WGS-84)", formatGps(meta.lat, meta.lon), true);
  row("Cutoff date (EUDR Art. 2)", "31 December 2020");
  y += 2;

  // ── 3. EUDR Deforestation check ─────────────────────────────────────────────
  divider();
  section("3. EUDR Deforestation Verification");

  const eudr = result.details.ndvi.eudr;
  if (eudr && eudr.data_available) {
    const statusColor: [number, number, number] = eudr.deforestation_free ? GREEN : [239, 68, 68];
    const statusText = eudr.deforestation_free
      ? "✓  DEFORESTATION-FREE"
      : `✗  DEFORESTATION DETECTED (${eudr.deforested_pct.toFixed(2)}%)`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...statusColor);
    doc.text(statusText, 16, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text("Forest cover 2020", 16, y);
    doc.setTextColor(...DARK);
    doc.text(`${eudr.forest_pct_2020}%`, 80, y);
    y += 6;

    doc.setTextColor(...GRAY);
    doc.text("Forest cover 2021", 16, y);
    doc.setTextColor(...DARK);
    doc.text(`${eudr.forest_pct_2021}%`, 80, y);
    y += 6;

    doc.setTextColor(...GRAY);
    doc.text("Data source", 16, y);
    doc.setTextColor(...DARK);
    doc.text(eudr.source, 80, y);
    y += 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(eudr?.source ?? "ESA WorldCover data pending", 16, y);
    y += 6;
  }
  y += 2;

  // ── 4. Food safety risk ─────────────────────────────────────────────────────
  divider();
  section("4. Food Safety Risk Assessment");

  // Score badge
  doc.setFillColor(...riskRgb);
  doc.roundedRect(16, y - 3, 50, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${result.score.toFixed(0)}/100 — ${result.niveau_risque}`, 41, y + 4.5, { align: "center" });
  y += 16;

  row("NDVI Score (Sentinel-2)", `${result.details.ndvi.score.toFixed(0)}/100`);
  row("Cropland coverage", `${result.details.ndvi.cropland_pct.toFixed(1)}%`);
  row("Weather Score (ERA5)", `${result.details.weather.score.toFixed(0)}/100`);
  row("RASFF EU Rejections (24m)", String(result.details.rasff.nb_rejets_24m));
  row("Region rejections (24m)", String(result.details.rasff.nb_rejets_region));
  row("Blacklisted", result.details.rasff.blackliste ? "YES" : "No");
  y += 2;

  // ── 5. Recommendation ─────────────────────────────────────────────────────
  divider();
  section("5. Recommendation");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  const lines = doc.splitTextToSize(result.decision, W - 32);
  doc.text(lines, 16, y);
  y += lines.length * 6 + 4;

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(...GRAY);
  doc.line(14, footerY, W - 14, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    "Generated by DIGBA Risk Scoring Platform · digba.io · " +
    "This document is for due diligence purposes under EU Regulation 2023/1115 (EUDR).",
    W / 2, footerY + 5, { align: "center" }
  );
  doc.text(`Ref: ${ref}  ·  ${new Date().toISOString()}`, W / 2, footerY + 10, { align: "center" });

  // ── Save ───────────────────────────────────────────────────────────────────
  const filename = `DIGBA_EUDR_${meta.region}_${meta.produit}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}
