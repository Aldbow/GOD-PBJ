import type { RupHistoryEntry } from '@/lib/paket/rupHistory';

export interface RevisiResult {
  count: number;
  score: number;
  cycleDetected: boolean;
  reason: string;
}

/** Skor risiko jumlah revisi RUP dari rantai riwayat kaji ulang (hasil RPC get_rup_history,
 * SUDAH cycle-safe berkat guard path-array di sisi SQL — lihat sql/setup_rup_history_and_dashboard.sql).
 * Fungsi ini murni menerima rantai yang sudah diambil, tidak memanggil Supabase sendiri.
 * `cycleDetected` di sini adalah heuristik tambahan di sisi app: kd_rup_lama/kd_rup_baru yang
 * muncul berulang pada satu rantai mengindikasikan percabangan/siklus yang terpotong oleh guard RPC. */
export function revisiScore(chain: RupHistoryEntry[]): RevisiResult {
  const count = chain.length;
  const score = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;

  const lamaSeen = new Set<string>();
  const baruSeen = new Set<string>();
  let cycleDetected = false;
  for (const entry of chain) {
    const lama = String(entry.kd_rup_lama);
    const baru = String(entry.kd_rup_baru);
    if (lamaSeen.has(lama) || baruSeen.has(baru)) cycleDetected = true;
    lamaSeen.add(lama);
    baruSeen.add(baru);
  }

  const reason =
    count === 0
      ? 'Paket belum pernah mengalami revisi kode RUP sehingga memperoleh skor revisi 0.'
      : `Paket telah mengalami ${count} kali perubahan kode RUP sehingga memperoleh skor revisi ${score}.`;

  return { count, score, cycleDetected, reason };
}
