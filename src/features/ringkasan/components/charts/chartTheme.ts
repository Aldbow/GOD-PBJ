"use client";

import { useEffect, useState } from 'react';

// Pantau atribut data-theme pada <html> agar chart ikut light/dark.
// Pola sama seperti RealisasiChart.tsx.
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    read();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === 'data-theme') read();
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

type ColorPair = { light: string; dark: string };
const pick = (c: ColorPair, isDark: boolean) => (isDark ? c.dark : c.light);

// Palet kategorikal tervalidasi (dataviz skill) — LOLOS gate CVD adjacent di
// kedua mode terhadap surface aplikasi. Warna dipetakan PER-ENTITAS (metode),
// bukan per-peringkat, sehingga warna tiap metode stabil walau set-nya berubah
// karena filter.
const SLOT = {
  blue: { light: '#2a78d6', dark: '#3987e5' },
  orange: { light: '#eb6834', dark: '#d95926' },
  aqua: { light: '#1baf7a', dark: '#199e70' },
  yellow: { light: '#eda100', dark: '#c98500' },
  magenta: { light: '#e87ba4', dark: '#d55181' },
  green: { light: '#008300', dark: '#008300' },
  violet: { light: '#4a3aa7', dark: '#9085e9' },
  red: { light: '#e34948', dark: '#e66767' },
} satisfies Record<string, ColorPair>;

const METODE_SLOT: Record<string, ColorPair> = {
  'Tender': SLOT.blue,
  'E-Purchasing': SLOT.orange,
  'Pengadaan Langsung': SLOT.aqua,
  'Penunjukan Langsung': SLOT.yellow,
  'Swakelola': SLOT.magenta,
  'Seleksi': SLOT.green,
  'Tender Cepat': SLOT.violet,
  'Pencatatan Non Tender': SLOT.red,
};

const OTHER: ColorPair = { light: '#94a3b8', dark: '#64748b' };

export function metodeColor(metode: string, isDark: boolean): string {
  return pick(METODE_SLOT[metode] ?? OTHER, isDark);
}

export function metodePalette(metodes: string[], isDark: boolean): string[] {
  return metodes.map((m) => metodeColor(m, isDark));
}

// Palet jenis pengadaan — 7 kategori nyata (termasuk kombinasi & residual) dapat
// warna sendiri masing-masing, TIDAK ada yang jatuh ke abu-abu OTHER. Urutan
// blue→aqua→yellow→green→magenta→violet→red divalidasi lolos gate CVD adjacent
// (termasuk wrap-around donut merah↔biru) di kedua mode via
// dataviz/scripts/validate_palette.js — jangan diacak ulang tanpa validasi ulang.
// 'Swakelola' sengaja disamakan dengan METODE_SLOT.Swakelola (magenta) karena
// merujuk entitas yang sama persis di chart lain.
const JENIS_SLOT: Record<string, ColorPair> = {
  'Barang': SLOT.blue,
  'Jasa Lainnya': SLOT.aqua,
  'Pekerjaan Konstruksi': SLOT.yellow,
  'Jasa Konsultansi': SLOT.green,
  'Swakelola': SLOT.magenta,
  'Barang;Jasa Lainnya': SLOT.violet,
  'Paket Anomali': SLOT.red,
};

export function jenisColor(jenis: string, isDark: boolean): string {
  return pick(JENIS_SLOT[jenis] ?? OTHER, isDark);
}

export function jenisPalette(jenisList: string[], isDark: boolean): string[] {
  return jenisList.map((j) => jenisColor(j, isDark));
}

// Palet sumber pengadaan (Paket Penyedia vs Paket Swakelola, dihitung dari RUP).
// 2 warna, divalidasi lolos gate CVD di kedua mode (dataviz/scripts/validate_palette.js).
// 'Paket Swakelola' disamakan dengan METODE_SLOT/JENIS_SLOT.Swakelola (magenta).
const SUMBER_SLOT: Record<string, ColorPair> = {
  'Paket Penyedia': SLOT.blue,
  'Paket Swakelola': SLOT.magenta,
};

export function sumberColor(kategori: string, isDark: boolean): string {
  return pick(SUMBER_SLOT[kategori] ?? OTHER, isDark);
}

// Warna seri semantik (bukan kategori metode).
export const SERIES = {
  pagu: { light: '#94a3b8', dark: '#5b6472' } as ColorPair, // netral (konteks)
  realisasi: { light: '#2a78d6', dark: '#3987e5' } as ColorPair, // biru brand
  sudah: { light: '#0ca30c', dark: '#0ca30c' } as ColorPair, // status good
  belum: { light: '#cbd5e1', dark: '#475569' } as ColorPair, // netral
  akurat: { light: '#0ca30c', dark: '#0ca30c' } as ColorPair,
  perluKoreksi: { light: '#d03b3b', dark: '#e66767' } as ColorPair,
  belumKurasi: { light: '#cbd5e1', dark: '#475569' } as ColorPair,
};

export function seriesColor(key: keyof typeof SERIES, isDark: boolean): string {
  return pick(SERIES[key], isDark);
}

// Warna untuk chart pemeringkatan (mis. ranking satker): batang biasa, batang
// yang di-highlight (satker sedang difilter), dan bucket "Lainnya". Memakai
// pasangan hex yang sama dengan SLOT.blue/orange/OTHER di atas — sudah lolos
// gate CVD karena dipakai berdampingan di chart metode.
const RANK_BASE = SLOT.blue;
const RANK_HIGHLIGHT = SLOT.orange;
const RANK_OTHER = OTHER;

export function rankColor(kind: 'base' | 'highlight' | 'other', isDark: boolean): string {
  if (kind === 'highlight') return pick(RANK_HIGHLIGHT, isDark);
  if (kind === 'other') return pick(RANK_OTHER, isDark);
  return pick(RANK_BASE, isDark);
}

// Ink/grid untuk sumbu & tooltip mengikuti tema.
export function chartInk(isDark: boolean) {
  return {
    tick: isDark ? '#9CA3B8' : '#5B6472',
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,116,139,0.14)',
    surface: isDark ? '#131924' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,11,11,0.10)',
    tooltipBg: isDark ? '#1A2130' : '#0f172a',
    tooltipText: '#FFFFFF',
  };
}

// Format Rupiah ringkas untuk label/axis chart: Rp1,2 M / Rp450 Jt / Rp0.
export function fmtCompactRp(m: number): string {
  const n = Number(m) || 0;
  if (Math.abs(n) >= 1e12) return 'Rp' + (n / 1e12).toFixed(1).replace('.', ',') + ' T';
  if (Math.abs(n) >= 1e9) return 'Rp' + (n / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1e6) return 'Rp' + (n / 1e6).toFixed(0) + ' Jt';
  if (Math.abs(n) >= 1e3) return 'Rp' + (n / 1e3).toFixed(0) + ' Rb';
  return 'Rp' + n.toLocaleString('id-ID');
}
