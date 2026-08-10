import { NextResponse } from 'next/server';
import { getApiSupabase } from '@/lib/supabase/apiClient';
import { splitCompositeIds } from '@/lib/risiko/normalize';
import { computeRisikoSwakelola, type SwakelolaCalcInput } from '@/lib/risiko/calcSwakelola';
import { buildSwakelolaRow, type SwakelolaMasterMeta } from '@/lib/risiko/riskModel';
import { pruneOrphanRisikoRows } from '@/lib/risiko/pruneOrphans';
import { fetchRevisedOldKdRup } from '@/lib/risiko/kajiUlangExclusion';
import type { EvidenceRecord } from '@/lib/risiko/calcExecutionStatus';
import type { RupHistoryEntry } from '@/lib/paket/rupHistory';

// Populasi Swakelola jauh lebih kecil daripada Penyedia (puluhan paket saat ini), tapi tetap
// dipaginasi dengan pola yang sama supaya aman kalau datanya bertambah nanti.
const PAGE_SIZE = 200;
const RPC_BATCH_SIZE = 50;
const UPSERT_CHUNK_SIZE = 100;

interface MasterRow {
  kd_rup: string;
  nama_paket: string | null;
  pagu: number | null;
  tipe_swakelola: string | null;
  tgl_awal_pelaksanaan_kontrak: string | null;
  tahun_anggaran: number | null;
  satker: string | null;
  eselon1: string | null;
  nama_ppk: string | null;
}

// `rawCount` = jumlah baris mentah yang benar-benar diambil dari view pada halaman ini (dipakai
// untuk aritmetika offset/remaining) — beda dari `rows.length` setelah exclusion RUP revisi di
// bawah, supaya paginasi tidak meleset ketika satu halaman kebetulan seluruhnya berisi RUP lama.
async function fetchMasterPage(
  offset: number,
  limit: number,
  excludedKdRup: Set<string>
): Promise<{ rows: MasterRow[]; rawCount: number; total: number }> {
  const { data, error, count } = await getApiSupabase()
    .from('view_paket_swakelola_master_data')
    .select(
      'kd_rup, nama_paket, pagu, tipe_swakelola, tgl_awal_pelaksanaan_kontrak, tahun_anggaran, satker:"SATUAN KERJA", eselon1:"UNIT KERJA", nama_ppk:MASTER_NAMA_PPK, satker_sirup:nama_satker, nama_ppk_sirup:nama_ppk',
      { count: 'exact' }
    )
    .order('kd_rup', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Gagal mengambil master data swakelola: ${error.message}`);
  // Fallback ke nama SIRUP mentah saat kolom master kosong — lihat catatan yang sama di
  // recalculate/penyedia/route.ts (ANALISIS-KONEKSI-SATKER.md Celah 1 & 3).
  const rawRows = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    kd_rup: String(r.kd_rup),
    nama_paket: (r.nama_paket as string | null) ?? null,
    pagu: r.pagu != null ? Number(r.pagu) : null,
    tipe_swakelola: r.tipe_swakelola != null ? String(r.tipe_swakelola) : null,
    tgl_awal_pelaksanaan_kontrak: (r.tgl_awal_pelaksanaan_kontrak as string | null) ?? null,
    tahun_anggaran: r.tahun_anggaran != null ? Number(r.tahun_anggaran) : null,
    satker: (r.satker as string | null) ?? (r.satker_sirup as string | null) ?? null,
    eselon1: (r.eselon1 as string | null) ?? null,
    nama_ppk: (r.nama_ppk as string | null) ?? (r.nama_ppk_sirup as string | null) ?? null,
  }));
  // Kode RUP lama yang sudah direvisi ke kode lain (history_kaji_ulang) — sama seperti
  // view_dashboard_gabungan_satker, jangan hitung sebagai paket tersendiri.
  const rows = rawRows.filter((r) => !excludedKdRup.has(r.kd_rup));
  return { rows, rawCount: rawRows.length, total: count ?? rawRows.length };
}

// Sama seperti api/risiko/recalculate/penyedia/route.ts — PostgREST membatasi 1000 baris tanpa
// paginasi, jadi tabel bridge/realisasi WAJIB diambil dengan .range() loop, bukan select() polos.
async function fetchAllRows(table: string, select: string): Promise<Array<Record<string, unknown>>> {
  let all: Array<Record<string, unknown>> = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await getApiSupabase().from(table).select(select).range(offset, offset + limit - 1);
    if (error) throw new Error(`Gagal mengambil ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data as unknown as Array<Record<string, unknown>>);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

/** Bukti realisasi Swakelola adalah jembatan DUA tahap (lihat PDF spec §11):
 *   api_paket_swakelola_terumumkan.kd_rup
 *     -> api_pencatatan_swakelola.kd_rup -> api_pencatatan_swakelola.kd_swakelola_pct
 *     -> pencatatan_swakelola_realisasi.kd_swakelola_pct -> tgl_realisasi
 * JANGAN mencocokkan kd_rup langsung ke pencatatan_swakelola_realisasi — tabel itu tidak
 * punya kolom kd_rup sama sekali (dikonfirmasi via schema probe langsung ke Supabase). */
async function loadRealisasiIndex(): Promise<Map<string, EvidenceRecord[]>> {
  const [bridgeRows, realisasiRows] = await Promise.all([
    fetchAllRows('api_pencatatan_swakelola', 'kd_rup, kd_swakelola_pct'),
    fetchAllRows('pencatatan_swakelola_realisasi', 'kd_swakelola_pct, tgl_realisasi'),
  ]);

  const tglBySwakelolaPct = new Map<string, string | null>();
  for (const row of realisasiRows) {
    const pct = String(row.kd_swakelola_pct);
    const tgl = (row.tgl_realisasi as string | null) ?? null;
    // Kalau satu kd_swakelola_pct punya beberapa baris realisasi, simpan tanggal paling awal.
    const existing = tglBySwakelolaPct.get(pct);
    if (!existing || (tgl && tgl < existing)) tglBySwakelolaPct.set(pct, tgl);
  }

  const index = new Map<string, EvidenceRecord[]>();
  for (const row of bridgeRows) {
    const pct = row.kd_swakelola_pct != null ? String(row.kd_swakelola_pct) : null;
    if (!pct) continue;
    const tgl = tglBySwakelolaPct.get(pct) ?? null;
    const record: EvidenceRecord = { date: tgl, sourceTable: 'pencatatan_swakelola_realisasi.tgl_realisasi', code: pct };
    for (const id of splitCompositeIds(row.kd_rup)) {
      const list = index.get(id) ?? [];
      list.push(record);
      index.set(id, list);
    }
  }
  return index;
}

async function fetchRevisionChain(kdRup: string): Promise<RupHistoryEntry[]> {
  const target = Number(kdRup);
  if (!Number.isFinite(target)) return [];
  const { data, error } = await getApiSupabase().rpc('get_rup_history', { target_rup: target });
  if (error) {
    console.error(`[risiko] get_rup_history gagal untuk ${kdRup}:`, error.message);
    return [];
  }
  return (data ?? []) as RupHistoryEntry[];
}

async function fetchRevisionChainsBatched(kdRupList: string[]): Promise<Map<string, RupHistoryEntry[]>> {
  const result = new Map<string, RupHistoryEntry[]>();
  for (let i = 0; i < kdRupList.length; i += RPC_BATCH_SIZE) {
    const batch = kdRupList.slice(i, i + RPC_BATCH_SIZE);
    const chains = await Promise.all(batch.map((id) => fetchRevisionChain(id)));
    batch.forEach((id, idx) => result.set(id, chains[idx]));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset') ?? '0') || 0;
    const limit = Number(url.searchParams.get('limit') ?? String(PAGE_SIZE)) || PAGE_SIZE;

    // RUP lama yang sudah direvisi (history_kaji_ulang) — dikecualikan dari perhitungan, sama
    // seperti view_dashboard_gabungan_satker dan recalculate/penyedia/route.ts.
    const [excludedKdRup, realisasiIndex] = await Promise.all([fetchRevisedOldKdRup(), loadRealisasiIndex()]);

    // Lihat catatan yang sama di recalculate/penyedia/route.ts — sekali di awal siklus penuh,
    // buang baris risiko_pengadaan milik paket Swakelola yang sudah tidak ada di master data
    // ATAU sudah masuk daftar exclusion revisi.
    let pruned: { prunedCount: number; prunedKdRup: string[] } | null = null;
    if (offset === 0) {
      try {
        pruned = await pruneOrphanRisikoRows('Swakelola', 'view_paket_swakelola_master_data', excludedKdRup);
      } catch (pruneError) {
        console.error('[risiko/recalculate/swakelola] gagal membersihkan baris orphan:', pruneError);
      }
    }

    const { rows: masterRows, rawCount, total } = await fetchMasterPage(offset, limit, excludedKdRup);

    if (rawCount === 0) {
      return NextResponse.json({ message: 'Tidak ada paket Swakelola pada offset ini.', processed: 0, upserted: 0, remaining: 0, nextOffset: null, total, prunedCount: pruned?.prunedCount ?? 0 });
    }

    const kdRupList = masterRows.map((r) => r.kd_rup);
    const revisionChains = await fetchRevisionChainsBatched(kdRupList);

    const today = new Date();
    const rowsToUpsert = masterRows.map((master) => {
      const revisionChain = revisionChains.get(master.kd_rup) ?? [];
      const calcInput: SwakelolaCalcInput = {
        pagu: master.pagu,
        tipeSwakelola: master.tipe_swakelola,
        tglAwalPelaksanaanKontrak: master.tgl_awal_pelaksanaan_kontrak,
        revisionChain,
        realisasiRecords: realisasiIndex.get(master.kd_rup) ?? [],
      };
      const calc = computeRisikoSwakelola(calcInput, today);
      const meta: SwakelolaMasterMeta = {
        kd_rup: master.kd_rup,
        nama_paket: master.nama_paket,
        satker: master.satker,
        eselon1: master.eselon1,
        nama_ppk: master.nama_ppk,
        tahun_anggaran: master.tahun_anggaran,
        pagu: master.pagu,
        tipe_swakelola: master.tipe_swakelola,
      };
      return buildSwakelolaRow(meta, calc, revisionChain);
    });

    let upserted = 0;
    const errors: { kd_rup: string; error: string }[] = [];
    for (let i = 0; i < rowsToUpsert.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + UPSERT_CHUNK_SIZE);
      const { error, count } = await getApiSupabase().from('risiko_pengadaan').upsert(chunk, { onConflict: 'kd_rup', count: 'exact' });
      if (error) {
        chunk.forEach((r) => errors.push({ kd_rup: r.kd_rup, error: error.message }));
      } else {
        upserted += count ?? chunk.length;
      }
    }

    if (rowsToUpsert.length > 0 && upserted === 0) {
      return NextResponse.json(
        { error: 'Gagal menyimpan hasil kalkulasi risiko Swakelola ke database. Dihentikan untuk mencegah pengulangan tanpa henti.', details: errors, processed: rowsToUpsert.length, upserted: 0 },
        { status: 500 }
      );
    }

    // Maju berdasarkan rawCount, bukan masterRows.length — lihat catatan yang sama di
    // recalculate/penyedia/route.ts (hindari offset macet kalau satu halaman seluruhnya
    // berisi RUP hasil revisi).
    const nextOffset = offset + rawCount;
    const remaining = Math.max(0, total - nextOffset);

    return NextResponse.json({
      message: `Berhasil menghitung risiko ${upserted} paket Swakelola (offset ${offset}-${nextOffset - 1} dari ${total}).`,
      processed: rowsToUpsert.length,
      upserted,
      errors: errors.length > 0 ? errors : undefined,
      prunedCount: pruned?.prunedCount ?? 0,
      remaining,
      nextOffset: remaining > 0 ? nextOffset : null,
      total,
    });
  } catch (error) {
    console.error('[risiko/recalculate/swakelola] error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem', details: detail }, { status: 500 });
  }
}
