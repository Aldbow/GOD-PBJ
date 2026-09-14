import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getApiSupabase } from '@/lib/supabase/apiClient';
import { getApiProfile } from '@/lib/auth/dal';

// Sama persis dengan SELECT_COLS di src/features/ringkasan/lib/ringkasanData.ts --
// jaga keduanya tetap sinkron kalau salah satu berubah.
const SELECT_COLS =
  'kd_rup,rup_name,satker,nama_ppk,metode_pengadaan,jenis_pengadaan,pagu,total,status,status_kurasi,catatan_kurasi,rekomendasi_kurasi,is_from_sirup';

/**
 * Rekap gabungan Ringkasan (Langkah 4 -- lihat docs/LAPORAN-ANALISIS-PERFORMA.md).
 *
 * fetchGabunganRows() di ringkasanData.ts TIDAK menerima parameter apa pun --
 * selalu menarik seluruh baris, filter satker/PPK terjadi belakangan di
 * client. Ini membuat cache di bawah cuma punya SATU entri, dipakai semua
 * user -- bukan terpecah per kombinasi filter. Begitu 1 user memicu query
 * nyata ke mv_dashboard_gabungan_satker, 10 menit ke depan siapa pun yang
 * buka Ringkasan dilayani dari cache ini, TIDAK menyentuh Supabase sama
 * sekali. Ini yang memutus hubungan "jumlah user = beban Supabase".
 *
 * Invalidasi murni berbasis waktu (revalidate 600 detik), TIDAK disambung ke
 * scripts/update_from_data_update.mjs -- data cuma berubah saat admin
 * menjalankan update (jarang, harian), dan topbar "Diperbarui ..." sudah
 * menetapkan ekspektasi data bisa agak basi. Cukup untuk v1; bisa
 * ditingkatkan jadi event-driven (revalidateTag) nanti kalau perlu.
 */
const getCachedGabunganRows = unstable_cache(
  async () => {
    const sb = getApiSupabase();
    let all: Record<string, unknown>[] = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await sb
        .from('mv_dashboard_gabungan_satker')
        .select(SELECT_COLS)
        .order('kd_rup', { ascending: true })
        .order('metode_pengadaan', { ascending: true })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < limit) break;
      offset += limit;
    }
    return all;
  },
  ['ringkasan-gabungan-rows'],
  { revalidate: 600, tags: ['ringkasan-gabungan'] }
);

export async function GET() {
  // proxy.ts mengecualikan seluruh /api/* dari gerbang auth otomatisnya --
  // endpoint ini WAJIB periksa sesi sendiri, sama seperti /api/paket.
  const profile = await getApiProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await getCachedGabunganRows();
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Gagal memuat data ringkasan' },
      { status: 500 }
    );
  }
}
