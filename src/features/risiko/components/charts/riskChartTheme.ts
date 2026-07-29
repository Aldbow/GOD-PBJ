import { useIsDark, chartInk, fmtCompactRp, seriesColor } from '@/features/ringkasan/components/charts/chartTheme';
import type { RiskKategori } from '@/lib/risiko/types';

export { useIsDark, chartInk, fmtCompactRp };

// Warna kategori risiko = WARNA STATUS, bukan kategorikal — skala tetap (baik->kritis) dengan
// makna reserved, selalu dipasangkan ikon+label (lihat dataviz skill, "Status is fixed": status
// tidak divalidasi lewat gate CVD kategorikal, kontras rendah di light mode untuk warning/serious
// itu memang by design, mitigasinya adalah pasangan label). Nilai HEX di bawah SENGAJA disamakan
// persis dengan src/components/ui/Badge.module.css (.rendah/.sedang/.tinggi/.default, via
// var(--teal-600)/var(--amber-600)/var(--red-600) di src/app/globals.css) supaya donut kategori
// dan badge kategori di tabel/detail memakai warna yang identik — JANGAN diubah sendiri-sendiri.
const RISK_KATEGORI_HEX: Record<RiskKategori, { light: string; dark: string }> = {
  RENDAH: { light: '#0F6E56', dark: '#2DD4A8' },
  SEDANG: { light: '#9C6B0B', dark: '#F2B84B' },
  TINGGI: { light: '#B3261E', dark: '#F87171' },
  DATA_TIDAK_LENGKAP: { light: '#94a3b8', dark: '#64748b' },
};

export function riskKategoriColor(kategori: RiskKategori, isDark: boolean): string {
  const pair = RISK_KATEGORI_HEX[kategori];
  return isDark ? pair.dark : pair.light;
}

/** Satu warna netral untuk SEMUA bar pada chart distribusi generik (satker, PPK, metode, dst).
 * Bar-bar ini satu seri nominal-kategorikal (nama berbeda, ukuran sama) -> per aturan dataviz
 * skill setiap bar memakai hue slot-1 yang SAMA (identitas sudah dibawa oleh label sumbu-Y,
 * bukan warna) — bukan palet 8-hue baru per dimensi. Reuse SERIES.realisasi (biru brand) yang
 * sudah lolos gate CVD di proyek ini. */
export function riskBarColor(isDark: boolean): string {
  return seriesColor('realisasi', isDark);
}

const PALETTE_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];
const PALETTE_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];

export function riskPalette(isDark: boolean): string[] {
  return isDark ? PALETTE_DARK : PALETTE_LIGHT;
}
