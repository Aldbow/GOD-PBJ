import type { DataQualityFlag, ExecutionStatus, TransactionRef } from './types';
import { METODE_EVIDENCE_SOURCES, isEpurchasingStatusExecuted, type EvidencePool } from './mappings';

export interface EvidenceRecord {
  /** Tanggal mentah dari sumber (string ISO/timestamp dari Supabase), null bila kosong. */
  date: string | null;
  /** Nama kolom sumber untuk audit trail, mis. "tender_selesai_nilai.tgl_pengumuman_tender". */
  sourceTable: string;
  /** Kode transaksi untuk ditampilkan di detail (kd_tender / order_id / dst), boleh null. */
  code: string | null;
  /** Hanya relevan untuk bukti E-Purchasing. */
  status?: string | null;
}

export interface ExecutionInput {
  metode: string | null;
  tenderRecords: EvidenceRecord[];
  nonTenderRecords: EvidenceRecord[];
  pencatatanRecords: EvidenceRecord[];
  epurchasingRecords: EvidenceRecord[];
}

export interface ExecutionResult {
  status: ExecutionStatus;
  evidenceSource: string | null;
  evidenceDate: string | null;
  transactionRefs: TransactionRef[];
  flags: DataQualityFlag[];
}

function isValidDate(raw: string | null): boolean {
  if (!raw) return false;
  return !Number.isNaN(new Date(raw).getTime());
}

function earliestValid(records: EvidenceRecord[]): EvidenceRecord[] {
  return [...records]
    .filter((r) => isValidDate(r.date))
    .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
}

/** Tentukan status pelaksanaan Paket Penyedia berdasarkan bukti yang sesuai metode (per PDF §7).
 * Absennya bukti (setelah metode diketahui) berarti BELUM_DILAKSANAKAN — status normal & umum,
 * bukan data tidak lengkap; skor waktunya lalu dihitung dari sisa hari ke tgl_akhir_pemilihan
 * (lihat calcSisaWaktu.ts). TIDAK_DAPAT_DITENTUKAN hanya untuk metode yang tidak dikenal, karena
 * di situ kita tidak tahu sumber bukti mana yang harus dicek sama sekali. */
export function resolveExecutionStatus(input: ExecutionInput): ExecutionResult {
  const { metode, tenderRecords, nonTenderRecords, pencatatanRecords, epurchasingRecords } = input;
  const flags: DataQualityFlag[] = [];

  if (!metode || !METODE_EVIDENCE_SOURCES[metode]) {
    return { status: 'TIDAK_DAPAT_DITENTUKAN', evidenceSource: null, evidenceDate: null, transactionRefs: [], flags: ['UNMAPPED_METHOD'] };
  }

  const pools = METODE_EVIDENCE_SOURCES[metode];
  const poolMap: Record<EvidencePool, EvidenceRecord[]> = {
    tender: tenderRecords,
    nonTender: nonTenderRecords,
    pencatatan: pencatatanRecords,
    epurchasing: epurchasingRecords,
  };

  let candidates: EvidenceRecord[] = [];
  if (pools.includes('epurchasing')) {
    candidates = epurchasingRecords.filter((r) => isValidDate(r.date) && isEpurchasingStatusExecuted(r.status));
  } else {
    for (const pool of pools) candidates.push(...earliestValid(poolMap[pool]));
  }

  // Bukti muncul di sumber yang TIDAK sesuai metode paket -> catat untuk audit, jangan langsung dipakai.
  const unexpectedPools = (Object.keys(poolMap) as EvidencePool[]).filter((p) => !pools.includes(p));
  const hasMismatch = unexpectedPools.some((p) => earliestValid(poolMap[p]).length > 0);
  if (hasMismatch) flags.push('SOURCE_METHOD_MISMATCH');

  if (candidates.length === 0) {
    return { status: 'BELUM_DILAKSANAKAN', evidenceSource: null, evidenceDate: null, transactionRefs: [], flags };
  }

  const sorted = candidates.sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
  const earliest = sorted[0];
  const transactionRefs: TransactionRef[] = sorted.filter((c) => c.code).map((c) => ({ label: c.sourceTable, code: c.code as string }));

  return {
    status: 'SUDAH_DILAKSANAKAN',
    evidenceSource: earliest.sourceTable,
    evidenceDate: earliest.date,
    transactionRefs,
    flags,
  };
}

/** Sama seperti resolveExecutionStatus tapi untuk Swakelola — tidak ada percabangan metode,
 * hanya satu pool bukti (pencatatan_swakelola_realisasi via jembatan kd_swakelola_pct). */
export function resolveSwakelolaExecutionStatus(records: EvidenceRecord[]): ExecutionResult {
  const valid = earliestValid(records);
  if (valid.length === 0) {
    return { status: 'BELUM_DILAKSANAKAN', evidenceSource: null, evidenceDate: null, transactionRefs: [], flags: [] };
  }
  const earliest = valid[0];
  const transactionRefs: TransactionRef[] = valid.filter((c) => c.code).map((c) => ({ label: c.sourceTable, code: c.code as string }));
  return {
    status: 'SUDAH_DILAKSANAKAN',
    evidenceSource: earliest.sourceTable,
    evidenceDate: earliest.date,
    transactionRefs,
    flags: [],
  };
}
