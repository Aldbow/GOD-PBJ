import { supabase } from '@/lib/supabase';

export interface RupHistoryEntry {
  jenis_revisi: string;
  tgl_kaji_ulang: string;
  kd_rup_lama: string | number;
  kd_rup_baru: string | number;
  alasan_kajiulang?: string;
}

/**
 * kd_rup can hold multiple RUP codes separated by ';' (seen on Tender rows).
 * Splitting a single-id string still yields a 1-element array, so this one
 * implementation covers both the single-id and multi-id views.
 */
export async function fetchRupHistory(kdRup: unknown): Promise<RupHistoryEntry[]> {
  const ids = String(kdRup ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return [];

  try {
    const responses = await Promise.all(
      ids.map((id) => supabase.rpc('get_rup_history', { target_rup: parseInt(id, 10) }))
    );
    let all: RupHistoryEntry[] = [];
    for (const { data, error } of responses) {
      if (error) throw error;
      if (data) all = all.concat(data);
    }
    all.sort((a, b) => new Date(b.tgl_kaji_ulang).getTime() - new Date(a.tgl_kaji_ulang).getTime());
    return all;
  } catch (e) {
    console.error('Failed to fetch RUP history', e);
    return [];
  }
}
