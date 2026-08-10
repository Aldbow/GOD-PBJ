import { getApiSupabase } from '@/lib/supabase/apiClient';

// PostgREST membatasi 1000 baris per response tanpa .range() eksplisit — berlaku juga untuk
// query dengan .eq() filter (risiko_pengadaan bisa >1000 baris untuk satu jenis_paket), jadi
// KEDUA fetch di bawah wajib dipaginasi, bukan cuma yang tanpa filter.
async function fetchAllMasterIds(table: string): Promise<Set<string>> {
  const sb = getApiSupabase();
  const ids = new Set<string>();
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await sb.from(table).select('kd_rup').range(offset, offset + limit - 1);
    if (error) throw new Error(`Gagal mengambil ${table}.kd_rup: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data as unknown as Record<string, unknown>[]) ids.add(String(row.kd_rup));
    if (data.length < limit) break;
    offset += limit;
  }
  return ids;
}

async function fetchAllRisikoIds(jenisPaket: 'Penyedia' | 'Swakelola'): Promise<string[]> {
  const sb = getApiSupabase();
  const ids: string[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await sb
      .from('risiko_pengadaan')
      .select('kd_rup')
      .eq('jenis_paket', jenisPaket)
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Gagal mengambil risiko_pengadaan.kd_rup: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) ids.push(String(row.kd_rup));
    if (data.length < limit) break;
    offset += limit;
  }
  return ids;
}

/**
 * Hapus baris risiko_pengadaan berjenis `jenisPaket` yang:
 *   (a) kd_rup-nya sudah tidak ada di `masterTable` sama sekali (paket dihapus dari SIRUP), atau
 *   (b) kd_rup-nya ada di `staleKdRup` (mis. RUP lama yang sudah direvisi ke kode lain per
 *       history_kaji_ulang — lihat kajiUlangExclusion.ts).
 *
 * Endpoint recalculate hanya UPSERT — memproses paket yang ADA & TIDAK DIKECUALIKAN di master
 * data saat ini, jadi baris kategori (a)/(b) tidak pernah tersentuh lagi dan nyangkut selamanya
 * di risiko_pengadaan walau "Hitung Ulang" diklik berkali-kali (mengecualikannya dari upsert
 * saja TIDAK cukup — baris yang sudah kadung ada dari kalkulasi sebelumnya tetap harus dihapus
 * eksplisit di sini). Panggil ini sekali di awal siklus recalculate PENUH (offset=0).
 */
export async function pruneOrphanRisikoRows(
  jenisPaket: 'Penyedia' | 'Swakelola',
  masterTable: string,
  staleKdRup: Set<string> = new Set()
): Promise<{ prunedCount: number; prunedKdRup: string[] }> {
  const sb = getApiSupabase();
  const [masterIds, riskIds] = await Promise.all([fetchAllMasterIds(masterTable), fetchAllRisikoIds(jenisPaket)]);

  const staleRows = riskIds.filter((kd) => !masterIds.has(kd) || staleKdRup.has(kd));
  if (staleRows.length === 0) return { prunedCount: 0, prunedKdRup: [] };

  const { error: deleteError } = await sb.from('risiko_pengadaan').delete().eq('jenis_paket', jenisPaket).in('kd_rup', staleRows);
  if (deleteError) throw new Error(`Gagal menghapus baris orphan risiko_pengadaan: ${deleteError.message}`);

  return { prunedCount: staleRows.length, prunedKdRup: staleRows };
}
