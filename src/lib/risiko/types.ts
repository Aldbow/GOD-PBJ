import type { RupHistoryEntry } from '@/lib/paket/rupHistory';

export type JenisPaket = 'Penyedia' | 'Swakelola';
export type RiskKategori = 'RENDAH' | 'SEDANG' | 'TINGGI' | 'DATA_TIDAK_LENGKAP';
export type ExecutionStatus = 'SUDAH_DILAKSANAKAN' | 'BELUM_DILAKSANAKAN' | 'TIDAK_DAPAT_DITENTUKAN';

export type DataQualityFlag =
  | 'MISSING_PAGU'
  | 'UNMAPPED_METHOD'
  | 'UNMAPPED_PROCUREMENT_TYPE'
  | 'UNMAPPED_FUNDING_SOURCE'
  | 'UNMAPPED_SWAKELOLA_TYPE'
  | 'PAGU_CONFLICT'
  | 'SOURCE_METHOD_MISMATCH'
  | 'REVISION_CHAIN_ANOMALY'
  | 'INVALID_RUP_CODE'
  | 'MISSING_TARGET_DATE'
  | 'INVALID_DATE'
  | 'MISSING_EXECUTION_REFERENCE';

export const DATA_QUALITY_FLAG_LABEL: Record<DataQualityFlag, string> = {
  MISSING_PAGU: 'Pagu kosong/tidak valid',
  UNMAPPED_METHOD: 'Metode pemilihan belum terpetakan',
  UNMAPPED_PROCUREMENT_TYPE: 'Jenis pengadaan belum terpetakan',
  UNMAPPED_FUNDING_SOURCE: 'Sumber dana belum terpetakan',
  UNMAPPED_SWAKELOLA_TYPE: 'Tipe Swakelola belum terpetakan',
  PAGU_CONFLICT: 'Nilai pagu berbeda pada sumber master',
  SOURCE_METHOD_MISMATCH: 'Bukti pelaksanaan ditemukan pada sumber yang tidak sesuai metode',
  REVISION_CHAIN_ANOMALY: 'Rantai revisi RUP bersiklus/bercabang',
  INVALID_RUP_CODE: 'Kode RUP kosong/tidak valid',
  MISSING_TARGET_DATE: 'Tanggal acuan tidak tersedia',
  INVALID_DATE: 'Tanggal tidak dapat diparsing',
  MISSING_EXECUTION_REFERENCE: 'Data bukti pelaksanaan belum tersedia pada sumbernya',
};

/** Satu komponen risiko (pagu, metode, jenis, sumber dana, sisa waktu, revisi, tipe swakelola). */
export interface RiskComponentResult {
  code: string;
  label: string;
  /** false untuk komponen yang TIDAK BERLAKU (mis. metode/jenis/sumber_dana pada Swakelola) — jangan tampil sebagai skor 0. */
  applicable: boolean;
  rawValue: string | number | null;
  normalizedValue: string | null;
  /** null = tidak dapat dinilai (mendorong kategori DATA_TIDAK_LENGKAP), BUKAN skor 0. */
  score: number | null;
  maxScore: number;
  reason: string;
  sourceTable: string;
}

/** Satu baris ringkasan risiko per kd_rup — bentuknya mengikuti kolom tabel risiko_pengadaan 1:1. */
export interface RiskRow {
  kd_rup: string;
  nama_paket: string | null;
  jenis_paket: JenisPaket;
  satker: string | null;
  eselon1: string | null;
  nama_ppk: string | null;
  tahun_anggaran: number | null;
  pagu: number | null;
  metode_pengadaan: string | null;
  jenis_pengadaan: string | null;
  sumber_dana: string | null;
  tipe_swakelola: string | null;
  total_score: number | null;
  max_score: number;
  kategori: RiskKategori;
  main_risk_driver: string | null;
  execution_status: ExecutionStatus;
  execution_evidence_source: string | null;
  execution_evidence_date: string | null;
  jumlah_revisi: number | null;
  data_quality_flags: DataQualityFlag[];
  calculated_at: string;
  rules_version: string;
}

export interface TransactionRef {
  label: string;
  code: string;
}

export interface RiskDetail extends RiskRow {
  components: RiskComponentResult[];
  revision_chain: RupHistoryEntry[];
  transaction_refs: TransactionRef[];
}

export interface RiskCategoryBucket {
  count: number;
  pagu: number;
}

export interface RiskSummary {
  byKategori: Record<RiskKategori, RiskCategoryBucket>;
  belumDilaksanakanCount: number;
  terlambatCount: number;
  revisiBerulangCount: number;
  penyediaVsSwakelola: { jenis: JenisPaket; count: number; pagu: number }[];
}

export const RISK_KATEGORI_LABEL: Record<RiskKategori, string> = {
  RENDAH: 'Rendah',
  SEDANG: 'Sedang',
  TINGGI: 'Tinggi',
  DATA_TIDAK_LENGKAP: 'Data Tidak Lengkap',
};

export const EXECUTION_STATUS_LABEL: Record<ExecutionStatus, string> = {
  SUDAH_DILAKSANAKAN: 'Sudah Dilaksanakan',
  BELUM_DILAKSANAKAN: 'Belum Dilaksanakan',
  TIDAK_DAPAT_DITENTUKAN: 'Tidak Dapat Ditentukan',
};
