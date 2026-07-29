import { countRup } from '@/lib/format';
import type { RiskRow } from './types';

export interface GroupedBucket {
  label: string;
  count: number;
  pagu: number;
}

const FALLBACK_LABEL = 'Tidak Diketahui';

/** Kelompokkan baris risiko berdasarkan keyFn, hitung jumlah paket (distinct kd_rup via countRup)
 * dan total pagu per kelompok. Murni/testable — tidak menyentuh Supabase. Diurutkan menurun berdasarkan count. */
export function groupBy(rows: RiskRow[], keyFn: (row: RiskRow) => string | null | undefined): GroupedBucket[] {
  const map = new Map<string, GroupedBucket>();
  for (const row of rows) {
    const rawLabel = keyFn(row);
    const label = rawLabel && rawLabel.trim() ? rawLabel : FALLBACK_LABEL;
    const bucket = map.get(label) ?? { label, count: 0, pagu: 0 };
    bucket.count += countRup(row.kd_rup);
    bucket.pagu += row.pagu ?? 0;
    map.set(label, bucket);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/** Total paket distinct (via countRup) di seluruh baris. */
export function totalPaket(rows: RiskRow[]): number {
  return rows.reduce((sum, r) => sum + countRup(r.kd_rup), 0);
}
