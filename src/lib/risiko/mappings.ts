/** Skor risiko per metode pemilihan (Penyedia). Nilai metode_pengadaan di database sudah
 * dikonfirmasi memakai string persis ini (lihat view_dashboard_tender.sql,
 * 40_views_realisasi_tender_pl_pnl.sql, dst — semua filter memakai string yang sama). */
export const METODE_SCORE: Record<string, number> = {
  'Pengadaan Langsung': 0,
  Dikecualikan: 0,
  'E-Purchasing': 1,
  'Penunjukan Langsung': 2,
  Tender: 3,
  Seleksi: 3,
  'Tender Cepat': 3,
  'Pembayaran untuk Kontrak Tahun Jamak': 3,
};

/** Sumber bukti pelaksanaan yang berlaku per metode. Pengadaan Langsung & Penunjukan Langsung
 * punya DUA sumber valid (non_tender_selesai ATAU pencatatan_non_tender_realisasi) — mengikuti
 * pola yang sudah dipakai view_dashboard_pengadaan_langsung.sql (union kedua sumber). */
export type EvidencePool = 'tender' | 'nonTender' | 'pencatatan' | 'epurchasing';

export const METODE_EVIDENCE_SOURCES: Record<string, EvidencePool[]> = {
  Tender: ['tender'],
  Seleksi: ['tender'],
  'Tender Cepat': ['tender'],
  'Pembayaran untuk Kontrak Tahun Jamak': ['pencatatan'],
  'Pengadaan Langsung': ['nonTender', 'pencatatan'],
  'Penunjukan Langsung': ['nonTender', 'pencatatan'],
  Dikecualikan: ['pencatatan'],
  'E-Purchasing': ['epurchasing'],
};

/** Skor risiko jenis pengadaan (Penyedia). */
export const JENIS_SCORE: Record<string, number> = {
  Barang: 0,
  'Jasa Lainnya': 1,
  'Barang;Jasa Lainnya': 1,
  'Pekerjaan Konstruksi': 3,
  'Jasa Konsultansi': 2,
};

/** Skor risiko sumber dana (Penyedia). Kunci di-uppercase karena data live
 * paket_anggaran_penyedia.jenis_dana_apbn memakai UPPERCASE ("RUPIAH MURNI", "PNBP", dst) —
 * lookup HARUS melalui normalizeSumberDana(), jangan index langsung dengan string mentah. */
const SUMBER_DANA_SCORE_RAW: Record<string, number> = {
  'RUPIAH MURNI': 0,
  'RUPIAH MURNI PENDAMPING': 0,
  PNBP: 1,
  'PINJAMAN DALAM NEGERI': 2,
  'PINJAMAN LUAR NEGERI': 3,
};

export function normalizeSumberDana(raw: string): string {
  return raw.trim().toUpperCase();
}

export function sumberDanaScoreOf(raw: string): number | undefined {
  return SUMBER_DANA_SCORE_RAW[normalizeSumberDana(raw)];
}

/** Skor risiko tipe Swakelola — kunci dinormalisasi (uppercase, tanpa spasi/awalan "TIPE") sebelum lookup. */
export const TIPE_SWAKELOLA_SCORE: Record<string, number> = {
  I: 1,
  '1': 1,
  II: 2,
  '2': 2,
  III: 3,
  '3': 3,
  IV: 3,
  '4': 3,
};

export function normalizeTipeSwakelola(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^TIPE\s*/, '');
}

export function tipeSwakelolaScoreOf(raw: string): number | undefined {
  return TIPE_SWAKELOLA_SCORE[normalizeTipeSwakelola(raw)];
}

/** HARUS tetap identik dengan klausa WHERE e.status IN (...) di
 * sql/migrations/63_view_epurchasing_status_filter.sql (baris ~71). Jika salah satu diubah,
 * tinjau ulang yang lain — tidak ada mekanisme codegen bersama TS/SQL di repo ini. */
export const EPURCHASING_EXECUTED_STATUSES = ['ON_PROCESS', 'ON_ADDENDUM', 'COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM'] as const;

export function isEpurchasingStatusExecuted(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.trim().toUpperCase();
  return (EPURCHASING_EXECUTED_STATUSES as readonly string[]).includes(normalized);
}
