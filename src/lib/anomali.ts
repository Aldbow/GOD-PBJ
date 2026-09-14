import { countRup } from '@/lib/format';

// Jenis anomali data realisasi.
export type AnomaliJenis = 'tanpa_rup' | 'lebih_pagu';

export const ANOMALI_LABEL: Record<AnomaliJenis, string> = {
  tanpa_rup: 'Realisasi Tanpa RUP',
  lebih_pagu: 'Realisasi > Pagu',
};

// Baris minimal yang dibutuhkan untuk deteksi. Baris dashboard apa pun cocok
// selama punya field ini (pagu, total, dan is_from_sirup bila tersedia).
export interface AnomaliRow {
  kd_rup?: unknown;
  pagu?: number | string | null;
  total?: number | string | null;
  is_from_sirup?: boolean | null;
}

const num = (v: unknown): number => Number(v) || 0;

// Jenis anomali yang berlaku untuk satu baris (bisa lebih dari satu).
export function anomaliOf(row: AnomaliRow): AnomaliJenis[] {
  const pagu = num(row.pagu);
  const total = num(row.total);
  const jenis: AnomaliJenis[] = [];

  // Realisasi tanpa RUP terumumkan. Hanya dinilai bila flag tersedia (false eksplisit).
  const tanpaRup = total > 0 && row.is_from_sirup === false;
  if (tanpaRup) jenis.push('tanpa_rup');

  // Realisasi melampaui pagu terencana. Hanya untuk paket yang PUNYA RUP terumumkan
  // (pagu terkunci ke masterdata). Paket tanpa RUP berpagu 0 → cukup ditandai
  // 'tanpa_rup' saja, jangan dobel-flag sebagai 'lebih_pagu'.
  if (!tanpaRup && total > 0 && total > pagu) jenis.push('lebih_pagu');

  return jenis;
}

export function isAnomali(row: AnomaliRow): boolean {
  return anomaliOf(row).length > 0;
}

// Cocokkan baris terhadap filter jenis anomali aktif (OR).
export function matchesAnomali(row: AnomaliRow, filter: AnomaliJenis[]): boolean {
  if (filter.length === 0) return true;
  const jenis = anomaliOf(row);
  return filter.some((f) => jenis.includes(f));
}

export interface AnomaliBucket {
  count: number; // jumlah paket (mengikuti countRup untuk RUP gabungan)
  nilai: number; // nilai rupiah terkait anomali
}

export interface AnomaliSummary {
  tanpaRup: AnomaliBucket; // nilai = Σ realisasi tanpa RUP
  lebihPagu: AnomaliBucket; // nilai = Σ kelebihan (total - pagu)
  totalPaket: number; // jumlah paket yang punya minimal satu anomali
}

// Ringkas seluruh baris menjadi angka per jenis. count memakai countRup agar
// konsisten dengan perhitungan jumlah paket di tiap halaman (RUP gabungan "a;b").
export function summarizeAnomali(rows: AnomaliRow[]): AnomaliSummary {
  const tanpaRup: AnomaliBucket = { count: 0, nilai: 0 };
  const lebihPagu: AnomaliBucket = { count: 0, nilai: 0 };
  let totalPaket = 0;

  for (const row of rows) {
    const jenis = anomaliOf(row);
    if (jenis.length === 0) continue;
    const n = countRup(row.kd_rup);
    totalPaket += n;

    if (jenis.includes('tanpa_rup')) {
      tanpaRup.count += n;
      tanpaRup.nilai += num(row.total);
    }
    if (jenis.includes('lebih_pagu')) {
      lebihPagu.count += n;
      lebihPagu.nilai += Math.max(0, num(row.total) - num(row.pagu));
    }
  }

  return { tanpaRup, lebihPagu, totalPaket };
}
