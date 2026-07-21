import type { ItkpBCDInput, PenugasanKondisi, RenaksiKondisi, KematanganLevel } from './calcBCD';

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const PENUGASAN_POOL: PenugasanKondisi[] = ['a', 'a', 'b', 'b', 'b', 'c', 'c', 'd', 'e'];
const RENAKSI_POOL: RenaksiKondisi[] = ['jf_ppk', 'jf_ppk', 'jf', 'jf', 'ppk', 'none'];
const KEMATANGAN_POOL: KematanganLevel[] = [
  'unggul',
  'strategis',
  'strategis',
  'proaktif',
  'proaktif',
  'sembilan_sembilan',
  'enam_delapan',
  'enam_delapan',
  'satu_lima',
];

/**
 * Data B/C/D belum tersambung ke sumber resmi. Nilai per unit dibangkitkan
 * deterministik dari nama satker (bukan Math.random) supaya stabil antar
 * render/refetch tanpa perlu disimpan di state terpisah.
 */
export function getDummyBCDForUnit(unitName: string): ItkpBCDInput {
  const rand = mulberry32(hashString(unitName));
  const kebutuhanFormasi = 5 + Math.floor(rand() * 45);
  const fillRatio = 0.35 + rand() * 0.85;
  const formasiTerisi = Math.min(kebutuhanFormasi, Math.round(kebutuhanFormasi * fillRatio));
  const nilaiSpi = Math.round((60 + rand() * 35) * 10) / 10;

  return {
    kebutuhanFormasi,
    formasiTerisi,
    penugasan: pick(rand, PENUGASAN_POOL),
    renaksi: pick(rand, RENAKSI_POOL),
    kematangan: pick(rand, KEMATANGAN_POOL),
    nilaiSpi,
    tahunPenilaianSpi: 2026,
  };
}
