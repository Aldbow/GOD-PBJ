import { supabase } from '@/lib/supabase';
import { primaryRupCode } from './alerts';
import type {
  DataQualityFlag,
  ExecutionStatus,
  JenisPaket,
  RiskComponentResult,
  RiskKategori,
} from '@/lib/risiko/types';

/**
 * Detail satu paket untuk modal di halaman /notifikasi.
 *
 * Daftar notifikasi sengaja hanya mengambil kolom seperlunya (lihat
 * RISIKO_COLUMNS/GABUNGAN_COLUMNS di alerts.ts) supaya halaman tetap ringan
 * untuk PPK dengan ratusan paket. Kolom sisanya — termasuk JSONB rincian skor —
 * baru diambil di sini saat sebuah kartu dibuka, pola yang sama dipakai
 * RisikoPengadaanView.
 */

/** Bagian dari `risiko_pengadaan`; null bila paket belum masuk modul Risiko. */
export interface NotifikasiRisikoDetail {
  jenis_paket: JenisPaket | null;
  eselon1: string | null;
  nama_ppk: string | null;
  tahun_anggaran: number | null;
  jenis_pengadaan: string | null;
  sumber_dana: string | null;
  tipe_swakelola: string | null;
  total_score: number | null;
  max_score: number;
  kategori: RiskKategori | null;
  main_risk_driver: string | null;
  execution_status: ExecutionStatus | null;
  execution_evidence_source: string | null;
  execution_evidence_date: string | null;
  jumlah_revisi: number | null;
  data_quality_flags: DataQualityFlag[];
  calculated_at: string | null;
  components: RiskComponentResult[];
}

/** Bagian dari `view_dashboard_gabungan_satker`; null bila paket belum punya baris realisasi. */
export interface NotifikasiRealisasiDetail {
  status: string | null;
  status_aktif_rup: boolean | null;
  is_from_sirup: boolean | null;
  rekomendasi_kurasi: string | null;
  /** Jumlah seluruh baris transaksi paket ini. */
  total: number;
  /** Banyaknya baris transaksi yang dijumlahkan (satu RUP bisa punya banyak order). */
  transaksi: number;
}

export interface NotifikasiDetail {
  risiko: NotifikasiRisikoDetail | null;
  realisasi: NotifikasiRealisasiDetail | null;
}

const REALISASI_COLUMNS =
  'kd_rup, status, status_aktif_rup, is_from_sirup, rekomendasi_kurasi, total';

/** Kolom `risiko_pengadaan` yang dibaca di sini (tabel dipilih dengan `*`). */
interface RisikoRawRow {
  kd_rup: string;
  jenis_paket: JenisPaket | null;
  eselon1: string | null;
  nama_ppk: string | null;
  tahun_anggaran: number | null;
  jenis_pengadaan: string | null;
  sumber_dana: string | null;
  tipe_swakelola: string | null;
  total_score: number | string | null;
  max_score: number | string | null;
  kategori: RiskKategori | null;
  main_risk_driver: string | null;
  execution_status: ExecutionStatus | null;
  execution_evidence_source: string | null;
  execution_evidence_date: string | null;
  jumlah_revisi: number | null;
  data_quality_flags: DataQualityFlag[] | null;
  calculated_at: string | null;
  components_json: RiskComponentResult[] | null;
}

interface RealisasiRawRow {
  kd_rup: string;
  status: string | null;
  status_aktif_rup: boolean | null;
  is_from_sirup: boolean | null;
  rekomendasi_kurasi: string | null;
  total: number | string | null;
}

async function selectEq<T>(table: string, columns: string, value: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(columns).eq('kd_rup', value);
  if (error) throw error;
  return (data as unknown as T[]) ?? [];
}

/**
 * Kode RUP tersimpan berbeda bentuk di dua sumber: `risiko_pengadaan` bisa
 * menyimpan gabungan ("a;b") untuk paket bertransaksi banyak RUP, sedangkan view
 * realisasi selalu satu kode. Kecocokan persis dicoba lebih dulu karena itulah
 * bentuk yang dipakai daftar notifikasi dan satu-satunya yang bisa memakai indeks;
 * pemindaian prefix hanya jadi jalan terakhir untuk sisi yang menyimpan bentuk
 * gabungan, dan hasilnya tetap disaring di sini karena `like 'a%'` juga menarik
 * kode lain yang kebetulan berawalan sama (mis. 123 vs 1234).
 */
async function fetchByRupCode<T extends { kd_rup: string | number }>(
  table: string,
  columns: string,
  rawKdRup: string,
  primary: string
): Promise<T[]> {
  const exact = await selectEq<T>(table, columns, rawKdRup);
  if (exact.length > 0) return exact;

  if (rawKdRup !== primary) {
    const byPrimary = await selectEq<T>(table, columns, primary);
    if (byPrimary.length > 0) return byPrimary;
  }

  const { data, error } = await supabase.from(table).select(columns).like('kd_rup', `${primary}%`);
  if (error) throw error;
  return ((data as unknown as T[]) ?? []).filter(
    (row) => primaryRupCode(String(row.kd_rup)) === primary
  );
}

const num = (v: unknown): number => Number(v) || 0;

export async function fetchNotifikasiDetail(kdRup: string): Promise<NotifikasiDetail> {
  const primary = primaryRupCode(kdRup);

  const [risikoRows, realisasiRows] = await Promise.all([
    fetchByRupCode<RisikoRawRow>('risiko_pengadaan', '*', kdRup, primary),
    fetchByRupCode<RealisasiRawRow>(
      'view_dashboard_gabungan_satker',
      REALISASI_COLUMNS,
      kdRup,
      primary
    ),
  ]);

  const raw = risikoRows[0];
  const risiko: NotifikasiRisikoDetail | null = raw
    ? {
        jenis_paket: raw.jenis_paket ?? null,
        eselon1: raw.eselon1 ?? null,
        nama_ppk: raw.nama_ppk ?? null,
        tahun_anggaran: raw.tahun_anggaran ?? null,
        jenis_pengadaan: raw.jenis_pengadaan ?? null,
        sumber_dana: raw.sumber_dana ?? null,
        tipe_swakelola: raw.tipe_swakelola ?? null,
        total_score: raw.total_score != null ? Number(raw.total_score) : null,
        max_score: num(raw.max_score),
        kategori: raw.kategori ?? null,
        main_risk_driver: raw.main_risk_driver ?? null,
        execution_status: raw.execution_status ?? null,
        execution_evidence_source: raw.execution_evidence_source ?? null,
        execution_evidence_date: raw.execution_evidence_date ?? null,
        jumlah_revisi: raw.jumlah_revisi ?? null,
        data_quality_flags: raw.data_quality_flags || [],
        calculated_at: raw.calculated_at ?? null,
        components: raw.components_json || [],
      }
    : null;

  // Satu kode RUP bisa punya banyak baris (mis. e-purchasing dengan banyak
  // order_id) — realisasi dijumlahkan, sama seperti mergeGabungan di alerts.ts.
  const realisasi: NotifikasiRealisasiDetail | null =
    realisasiRows.length > 0
      ? {
          status: realisasiRows.find((r) => r.status)?.status ?? null,
          status_aktif_rup: realisasiRows.find((r) => r.status_aktif_rup != null)?.status_aktif_rup ?? null,
          is_from_sirup: realisasiRows.some((r) => r.is_from_sirup === false)
            ? false
            : realisasiRows.find((r) => r.is_from_sirup != null)?.is_from_sirup ?? null,
          rekomendasi_kurasi: realisasiRows.find((r) => r.rekomendasi_kurasi)?.rekomendasi_kurasi ?? null,
          total: realisasiRows.reduce((sum, r) => sum + num(r.total), 0),
          transaksi: realisasiRows.length,
        }
      : null;

  return { risiko, realisasi };
}
