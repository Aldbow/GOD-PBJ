import { NextResponse } from 'next/server';
import { getApiSupabase } from '@/lib/supabase/apiClient';
import { getApiProfile } from '@/lib/auth/dal';

// Sama persis dengan SELECT_COLS di src/features/ringkasan/lib/ringkasanData.ts --
// jaga keduanya tetap sinkron kalau salah satu berubah.
const SELECT_COLS =
  'kd_rup,rup_name,satker,nama_ppk,metode_pengadaan,jenis_pengadaan,pagu,pagu_per_tahun,total,status,status_kurasi,catatan_kurasi,rekomendasi_kurasi,is_from_sirup';

/**
 * Rekap gabungan Ringkasan (Langkah 4 -- lihat docs/LAPORAN-ANALISIS-PERFORMA.md).
 *
 * fetchGabunganRows() di ringkasanData.ts TIDAK menerima parameter apa pun --
 * selalu menarik seluruh baris, filter satker/PPK terjadi belakangan di
 * client. Ini membuat cache di bawah cuma punya SATU entri, dipakai semua
 * user -- bukan terpecah per kombinasi filter. Begitu 1 user memicu query
 * nyata ke mv_dashboard_gabungan_satker, request-request lain dilayani dari
 * cache ini, TIDAK menyentuh Supabase sama sekali. Ini yang memutus hubungan
 * "jumlah user = beban Supabase".
 *
 * Dua TTL, pola stale-while-revalidate (lihat getRowsCoalesced di bawah):
 * lewat SOFT_TTL_MS cache masih dipakai APA ADANYA untuk request yang sedang
 * berjalan, sambil memicu refresh di background untuk request berikutnya --
 * tidak ada request yang menunggu fetch penuh (~4,3MB, bisa beberapa detik)
 * hanya karena kebetulan jadi yang pertama setelah cache kedaluwarsa. Baru
 * lewat HARD_TTL_MS (artinya refresh background sudah gagal berturut-turut,
 * mis. Supabase down) request BOLEH menunggu fetch baru -- ada batas atas
 * yang jelas untuk seberapa basi data boleh disajikan tanpa pernah dicoba
 * disegarkan lagi.
 *
 * Invalidasi murni berbasis waktu, TIDAK disambung ke
 * scripts/update_from_data_update.mjs -- data cuma berubah saat admin
 * menjalankan update (jarang, harian), dan topbar "Diperbarui ..." sudah
 * menetapkan ekspektasi data bisa agak basi. SOFT_TTL_MS (10 menit) sudah
 * cukup untuk mendeteksi update baru tanpa perlu event-driven invalidation.
 */
async function fetchGabunganRowsFromDb() {
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
}

// Cache TTL manual di module scope -- BUKAN unstable_cache. unstable_cache
// menolak menyimpan item di atas 2MB ("items over 2MB can not be cached"),
// dan payload ini sudah 4,3MB (7.982 baris) -- di atas ambang itu, SETIAP
// pemanggilan gagal ditulis ke cache dan jatuh ke fetch penuh, diverifikasi
// langsung dari log server (29 kegagalan berturut-turut, 0 cache hit sejak
// fitur ini di-deploy). Variabel biasa di module scope tidak punya batas
// ukuran seperti itu -- satu-satunya trade-off adalah cache-nya per-proses
// (sama seperti `inFlight` di bawah), bukan lintas-instance di Vercel
// serverless. Untuk payload ini itu jauh lebih baik daripada cache yang
// TIDAK PERNAH benar-benar menyala.
let cachedRows: Record<string, unknown>[] | null = null;
let cachedAt = 0;
const SOFT_TTL_MS = 600_000; // 10 menit -- lewat ini, refresh dipicu di background, cache lama tetap dipakai
const HARD_TTL_MS = 3_600_000; // 60 menit -- batas mutlak; request WAJIB menunggu fetch baru lewat batas ini

// Penggabungan permintaan (request coalescing): permintaan yang datang
// selagi ada fetch yang sedang berjalan cukup menunggu promise yang sama,
// bukan memulai query baru -- perlu untuk cache kosong/kedaluwarsa supaya
// beberapa permintaan bersamaan tidak masing-masing memicu query sendiri
// (diuji: 30 permintaan bersamaan ke cache kosong -> turun jadi 1 query).
// Dipakai juga oleh refresh latar belakang (stale-while-revalidate) supaya
// beberapa request yang menemukan cache basi di saat bersamaan tidak
// masing-masing memicu refresh sendiri.
let inFlight: Promise<Record<string, unknown>[]> | null = null;

function triggerRefresh(): Promise<Record<string, unknown>[]> {
  if (!inFlight) {
    inFlight = fetchGabunganRowsFromDb()
      .then((rows) => {
        cachedRows = rows;
        cachedAt = Date.now();
        return rows;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

async function getRowsCoalesced(): Promise<Record<string, unknown>[]> {
  const age = Date.now() - cachedAt;

  if (cachedRows && age < SOFT_TTL_MS) {
    return cachedRows;
  }

  if (cachedRows && age < HARD_TTL_MS) {
    // Stale-while-revalidate: kembalikan cache lama SEKARANG ke request ini,
    // segarkan di background untuk request berikutnya. Kegagalan refresh
    // cukup dicatat -- cache lama masih valid dipakai sampai HARD_TTL_MS.
    triggerRefresh().catch((e) => {
      console.error('[ringkasan/gabungan] gagal refresh cache latar belakang:', e);
    });
    return cachedRows;
  }

  // Cache kosong (cold start) atau sudah lewat HARD_TTL_MS (refresh latar
  // belakang gagal berturut-turut) -- request ini WAJIB menunggu data segar.
  return triggerRefresh();
}

export async function GET() {
  // proxy.ts mengecualikan seluruh /api/* dari gerbang auth otomatisnya --
  // endpoint ini WAJIB periksa sesi sendiri, sama seperti /api/paket.
  const profile = await getApiProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await getRowsCoalesced();
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Gagal memuat data ringkasan' },
      { status: 500 }
    );
  }
}
