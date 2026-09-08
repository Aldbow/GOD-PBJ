import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Kapan isi tabel Supabase terakhir ditulis ulang.
 *
 * Sumbernya tabel `data_update_log`, diisi oleh
 * scripts/update_from_data_update.mjs setiap kali tulis-ke-DB berhasil
 * (DDL: sql/migrations/74_table_data_update_log.sql).
 *
 * Sengaja BUKAN dari data/data_update/<tabel>/*.meta.json: file itu mencatat
 * waktu tarik API, bukan waktu masuk DB, dan di production hanya se-baru deploy
 * terakhir. Alasan lengkapnya ada di komentar migration 74.
 */

export type LastDataUpdate = {
  /** ISO 8601, UTC. Diformat di client agar ikut jam pembaca. */
  finishedAt: string;
  /** Tabel terakhir yang ditulis; null kalau kolomnya kosong. */
  tableName: string | null;
};

/**
 * Baris terbaru dari `data_update_log`, atau null.
 *
 * Null bukan kondisi galat — artinya "belum ada yang bisa ditampilkan", dan
 * topbar memilih tidak menampilkan apa-apa. Penyebab wajarnya: migration 74
 * belum dijalankan di Supabase, atau updater belum pernah jalan sejak fitur ini
 * ada. Stempel waktu bukan alasan yang cukup untuk menggagalkan render layout,
 * jadi galat query pun ditelan (dicatat ke console server).
 */
export const getLastDataUpdate = cache(async (): Promise<LastDataUpdate | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('data_update_log')
    .select('table_name, finished_at')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[data-update] gagal membaca data_update_log:', error.message);
    return null;
  }
  if (!data?.finished_at) return null;

  return { finishedAt: data.finished_at, tableName: data.table_name ?? null };
});
