import { NextResponse } from 'next/server';
import { getApiSupabase } from '@/lib/supabase/apiClient';
import { splitCompositeIds } from '@/lib/risiko/normalize';
import { computeRisikoPenyedia, type PenyediaCalcInput } from '@/lib/risiko/calcPenyedia';
import { buildPenyediaRow, type PenyediaMasterMeta } from '@/lib/risiko/riskModel';
import type { EvidenceRecord, ExecutionInput } from '@/lib/risiko/calcExecutionStatus';
import type { RupHistoryEntry } from '@/lib/paket/rupHistory';

// Ukuran satu "halaman" paket master yang diproses per pemanggilan POST — dibuat kecil sengaja
// (bukan seluruh ~7.700 baris sekaligus) supaya tidak menabrak batas durasi fungsi serverless.
// Endpoint ini idempotent & dipanggil berulang (mengirim offset berikutnya) sampai `remaining` 0,
// mirip pola tombol "Hitung Ulang" — bukan pola incremental .is(col,null) seperti /api/kurasi,
// karena bukti pelaksanaan bisa berubah untuk paket yang SUDAH pernah dihitung sebelumnya.
const PAGE_SIZE = 200;
// get_rup_history dipanggil satu kali per kd_rup (RPC) — dibatch supaya tidak membanjiri koneksi.
const RPC_BATCH_SIZE = 50;
const UPSERT_CHUNK_SIZE = 100;

interface MasterRow {
  kd_rup: string;
  nama_paket: string | null;
  pagu: number | null;
  metode_pengadaan: string | null;
  jenis_pengadaan: string | null;
  tgl_akhir_pemilihan: string | null;
  tahun_anggaran: number | null;
  satker: string | null;
  eselon1: string | null;
  nama_ppk: string | null;
}

async function fetchMasterPage(offset: number, limit: number): Promise<{ rows: MasterRow[]; total: number }> {
  const { data, error, count } = await getApiSupabase()
    .from('view_paket_penyedia_master_data')
    .select(
      'kd_rup, nama_paket, pagu, metode_pengadaan, jenis_pengadaan, tgl_akhir_pemilihan, tahun_anggaran, satker:"SATUAN KERJA", eselon1:"UNIT KERJA", nama_ppk:MASTER_NAMA_PPK, satker_sirup:nama_satker, nama_ppk_sirup:nama_ppk',
      { count: 'exact' }
    )
    .order('kd_rup', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Gagal mengambil master data penyedia: ${error.message}`);
  // Fallback ke nama SIRUP mentah saat kolom master kosong (satker/PPK tidak lolos join di
  // view_paket_penyedia_master_data — lihat ANALISIS-KONEKSI-SATKER.md Celah 1 & 3). Tanpa ini,
  // baris risiko tampil blank walau datanya sebenarnya ada di SIRUP, hanya ter-masking/tidak
  // ter-verifikasi ke master_data.
  const rows = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    kd_rup: String(r.kd_rup),
    nama_paket: (r.nama_paket as string | null) ?? null,
    pagu: r.pagu != null ? Number(r.pagu) : null,
    metode_pengadaan: (r.metode_pengadaan as string | null) ?? null,
    jenis_pengadaan: (r.jenis_pengadaan as string | null) ?? null,
    tgl_akhir_pemilihan: (r.tgl_akhir_pemilihan as string | null) ?? null,
    tahun_anggaran: r.tahun_anggaran != null ? Number(r.tahun_anggaran) : null,
    satker: (r.satker as string | null) ?? (r.satker_sirup as string | null) ?? null,
    eselon1: (r.eselon1 as string | null) ?? null,
    nama_ppk: (r.nama_ppk as string | null) ?? (r.nama_ppk_sirup as string | null) ?? null,
  }));
  return { rows, total: count ?? rows.length };
}

/** Bangun index kd_rup individual -> daftar bukti, memecah kolom yang mungkin berisi beberapa
 * kode RUP sekaligus ("35830905;35831357") sebelum diindeks — supaya satu baris bukti transaksi
 * tetap ditemukan untuk SETIAP RUP yang disebutnya, bukan hanya kode pertama. */
function indexByCompositeId(
  rows: Array<Record<string, unknown>>,
  idField: string,
  dateField: string,
  codeField: string | null,
  sourceTable: string,
  statusField: string | null = null
): Map<string, EvidenceRecord[]> {
  const map = new Map<string, EvidenceRecord[]>();
  for (const row of rows) {
    const ids = splitCompositeIds(row[idField]);
    const record: EvidenceRecord = {
      date: (row[dateField] as string | null) ?? null,
      code: codeField ? ((row[codeField] as string | null) ?? null) : null,
      status: statusField ? ((row[statusField] as string | null) ?? null) : null,
      sourceTable,
    };
    for (const id of ids) {
      const list = map.get(id) ?? [];
      list.push(record);
      map.set(id, list);
    }
  }
  return map;
}

interface EvidenceIndices {
  tender: Map<string, EvidenceRecord[]>;
  nonTender: Map<string, EvidenceRecord[]>;
  pencatatan: Map<string, EvidenceRecord[]>;
  epurchasing: Map<string, EvidenceRecord[]>;
  sumberDana: Map<string, string[]>;
}

// PENTING: PostgREST membatasi satu response maksimal 1000 baris walau tanpa .limit() eksplisit
// (lihat juga api/ppk/route.ts). paket_anggaran_penyedia (~7.700 baris) dan paket_e_purchasing
// (~1.000 baris) MELEBIHI itu -> WAJIB paginasi .range(), tidak boleh select() polos, atau
// sebagian besar paket kehilangan datanya secara diam-diam (pernah terjadi di sini: 14/20 paket
// salah dianggap DATA_TIDAK_LENGKAP sebelum fix ini karena baris anggarannya terpotong).
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

// Semua tabel bukti + anggaran di bawah ini diambil PENUH (dengan paginasi di atas) sekali per
// pemanggilan endpoint dan diindeks di memori — lebih sederhana & tetap benar dibanding query
// .in() per halaman, yang tidak bisa menangkap kd_rup yang tersembunyi di dalam field komposit "a;b".
async function loadEvidenceIndices(): Promise<EvidenceIndices> {
  const [tenderRows, nonTenderRows, pencatatanRows, epurchasingRows, anggaranRows] = await Promise.all([
    fetchAllRows('tender_selesai_nilai', 'kd_rup_paket, tgl_pengumuman_tender, kd_tender'),
    fetchAllRows('non_tender_selesai', 'kd_rup, tgl_pengumuman_nontender, kd_nontender'),
    fetchAllRows('pencatatan_non_tender_realisasi', 'kd_rup_paket, tgl_realisasi, no_realisasi'),
    fetchAllRows('paket_e_purchasing', 'rup_code, order_date, order_id, status'),
    fetchAllRows('paket_anggaran_penyedia', 'kd_rup, jenis_dana_apbn'),
  ]);

  const tender = indexByCompositeId(tenderRows, 'kd_rup_paket', 'tgl_pengumuman_tender', 'kd_tender', 'tender_selesai_nilai.tgl_pengumuman_tender');
  const nonTender = indexByCompositeId(nonTenderRows, 'kd_rup', 'tgl_pengumuman_nontender', 'kd_nontender', 'non_tender_selesai.tgl_pengumuman_nontender');
  const pencatatan = indexByCompositeId(pencatatanRows, 'kd_rup_paket', 'tgl_realisasi', 'no_realisasi', 'pencatatan_non_tender_realisasi.tgl_realisasi');
  const epurchasing = indexByCompositeId(epurchasingRows, 'rup_code', 'order_date', 'order_id', 'paket_e_purchasing.order_date', 'status');

  const sumberDana = new Map<string, string[]>();
  for (const row of anggaranRows) {
    for (const id of splitCompositeIds(row.kd_rup)) {
      const list = sumberDana.get(id) ?? [];
      const jenis = row.jenis_dana_apbn as string | null;
      if (jenis) list.push(jenis);
      sumberDana.set(id, list);
    }
  }

  return { tender, nonTender, pencatatan, epurchasing, sumberDana };
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

    const [{ rows: masterRows, total }, evidence] = await Promise.all([fetchMasterPage(offset, limit), loadEvidenceIndices()]);

    if (masterRows.length === 0) {
      return NextResponse.json({ message: 'Tidak ada paket Penyedia pada offset ini.', processed: 0, upserted: 0, remaining: 0, nextOffset: null, total });
    }

    const kdRupList = masterRows.map((r) => r.kd_rup);
    const revisionChains = await fetchRevisionChainsBatched(kdRupList);

    const today = new Date();
    const rowsToUpsert = masterRows.map((master) => {
      const executionInput: ExecutionInput = {
        metode: master.metode_pengadaan,
        tenderRecords: evidence.tender.get(master.kd_rup) ?? [],
        nonTenderRecords: evidence.nonTender.get(master.kd_rup) ?? [],
        pencatatanRecords: evidence.pencatatan.get(master.kd_rup) ?? [],
        epurchasingRecords: evidence.epurchasing.get(master.kd_rup) ?? [],
      };
      const revisionChain = revisionChains.get(master.kd_rup) ?? [];
      const calcInput: PenyediaCalcInput = {
        pagu: master.pagu,
        metode: master.metode_pengadaan,
        jenis: master.jenis_pengadaan,
        sumberDanaList: evidence.sumberDana.get(master.kd_rup) ?? [],
        tglAkhirPemilihan: master.tgl_akhir_pemilihan,
        revisionChain,
        executionInput,
      };
      const calc = computeRisikoPenyedia(calcInput, today);
      const meta: PenyediaMasterMeta = {
        kd_rup: master.kd_rup,
        nama_paket: master.nama_paket,
        satker: master.satker,
        eselon1: master.eselon1,
        nama_ppk: master.nama_ppk,
        tahun_anggaran: master.tahun_anggaran,
        pagu: master.pagu,
        metode_pengadaan: master.metode_pengadaan,
        jenis_pengadaan: master.jenis_pengadaan,
      };
      return buildPenyediaRow(meta, calc, revisionChain);
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
        { error: 'Gagal menyimpan hasil kalkulasi risiko ke database. Dihentikan untuk mencegah pengulangan tanpa henti.', details: errors, processed: rowsToUpsert.length, upserted: 0 },
        { status: 500 }
      );
    }

    const nextOffset = offset + masterRows.length;
    const remaining = Math.max(0, total - nextOffset);

    return NextResponse.json({
      message: `Berhasil menghitung risiko ${upserted} paket Penyedia (offset ${offset}-${nextOffset - 1} dari ${total}).`,
      processed: rowsToUpsert.length,
      upserted,
      errors: errors.length > 0 ? errors : undefined,
      remaining,
      nextOffset: remaining > 0 ? nextOffset : null,
      total,
    });
  } catch (error) {
    console.error('[risiko/recalculate/penyedia] error:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem', details: detail }, { status: 500 });
  }
}
