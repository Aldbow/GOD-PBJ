import type { RiskKategori } from './types';

export interface ScoreBand {
  /** Batas atas EKSKLUSIF pada band ini (Infinity untuk band terakhir). */
  upperExclusive: number;
  score: number;
  label: string;
}

/** Sama untuk Penyedia maupun Swakelola. */
export const PAGU_BANDS: ScoreBand[] = [
  { upperExclusive: 200_000_000, score: 0, label: '< Rp200 juta' },
  { upperExclusive: 1_000_000_000, score: 1, label: 'Rp200 juta – < Rp1 miliar' },
  { upperExclusive: 5_000_000_000, score: 2, label: 'Rp1 miliar – < Rp5 miliar' },
  { upperExclusive: Infinity, score: 3, label: '>= Rp5 miliar' },
];

export function paguBand(pagu: number): ScoreBand {
  for (const band of PAGU_BANDS) {
    if (pagu < band.upperExclusive) return band;
  }
  return PAGU_BANDS[PAGU_BANDS.length - 1];
}

interface KategoriBand {
  /** Batas atas INKLUSIF kategori ini. */
  upperInclusive: number;
  kategori: RiskKategori;
}

export const KATEGORI_BANDS_PENYEDIA: KategoriBand[] = [
  { upperInclusive: 6, kategori: 'RENDAH' },
  { upperInclusive: 12, kategori: 'SEDANG' },
  { upperInclusive: 18, kategori: 'TINGGI' },
];

export const KATEGORI_BANDS_SWAKELOLA: KategoriBand[] = [
  { upperInclusive: 4, kategori: 'RENDAH' },
  { upperInclusive: 8, kategori: 'SEDANG' },
  { upperInclusive: 12, kategori: 'TINGGI' },
];

export function pickKategori(totalScore: number, bands: KategoriBand[]): RiskKategori {
  for (const band of bands) {
    if (totalScore <= band.upperInclusive) return band.kategori;
  }
  return bands[bands.length - 1].kategori;
}
