import { getApiSupabase } from '@/lib/supabase/apiClient';

/**
 * Kode RUP "lama" yang sudah direvisi ke kode RUP lain (kd_rup_baru berbeda dari kd_rup_lama)
 * di history_kaji_ulang — sumber yang sama dipakai view_dashboard_gabungan_satker untuk
 * mengecualikan RUP lama dari hitungan (`WHERE kd_rup NOT IN (SELECT kd_rup_lama FROM
 * history_kaji_ulang WHERE kd_rup_lama <> kd_rup_baru)`), supaya RUP lama+baru tidak terhitung
 * dobel. Endpoint recalculate risiko baca langsung dari master data mentah tanpa konsolidasi
 * rantai revisi itu, jadi butuh exclusion yang sama di sini.
 *
 * PostgREST tidak bisa membandingkan dua kolom (`kd_rup_lama <> kd_rup_baru`) lewat filter —
 * jadi seluruh baris diambil (dipaginasi) lalu dibandingkan di JS.
 */
export async function fetchRevisedOldKdRup(): Promise<Set<string>> {
  const sb = getApiSupabase();
  const excluded = new Set<string>();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await sb.from('history_kaji_ulang').select('kd_rup_lama, kd_rup_baru').range(offset, offset + limit - 1);
    if (error) throw new Error(`Gagal mengambil history_kaji_ulang: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const lama = row.kd_rup_lama;
      const baru = row.kd_rup_baru;
      if (lama != null && baru != null && String(lama) !== String(baru)) {
        excluded.add(String(lama));
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return excluded;
}
