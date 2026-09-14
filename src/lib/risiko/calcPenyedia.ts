import type { RupHistoryEntry } from '@/lib/paket/rupHistory';
import { fmtRupiahDetail } from '@/lib/format';
import { paguBand, pickKategori, KATEGORI_BANDS_PENYEDIA } from './bands';
import { METODE_SCORE, JENIS_SCORE, sumberDanaScoreOf } from './mappings';
import { sisaWaktuScore } from './calcSisaWaktu';
import { revisiScore } from './calcRevisi';
import { resolveExecutionStatus, type ExecutionInput } from './calcExecutionStatus';
import type { DataQualityFlag, RiskComponentResult, RiskKategori, ExecutionStatus, TransactionRef } from './types';

export interface PenyediaCalcInput {
  pagu: number | null;
  metode: string | null;
  jenis: string | null;
  /** Bisa lebih dari satu (kd_rup dengan beberapa baris anggaran/sumber dana). */
  sumberDanaList: string[];
  tglAkhirPemilihan: string | null;
  revisionChain: RupHistoryEntry[];
  executionInput: ExecutionInput;
}

export interface RiskCalcResult {
  components: RiskComponentResult[];
  totalScore: number | null;
  maxScore: number;
  kategori: RiskKategori;
  mainRiskDriver: string | null;
  executionStatus: ExecutionStatus;
  executionEvidenceSource: string | null;
  executionEvidenceDate: string | null;
  jumlahRevisi: number | null;
  dataQualityFlags: DataQualityFlag[];
  transactionRefs: TransactionRef[];
}

function jenisComponent(jenis: string | null): {
  score: number | null;
  normalized: string | null;
  reason: string;
  flag?: DataQualityFlag;
} {
  if (!jenis || !jenis.trim()) {
    return { score: null, normalized: null, reason: 'Jenis pengadaan tidak tersedia.', flag: 'UNMAPPED_PROCUREMENT_TYPE' };
  }
  const trimmed = jenis.trim();
  if (trimmed in JENIS_SCORE) {
    return { score: JENIS_SCORE[trimmed], normalized: trimmed, reason: `Jenis pengadaan "${trimmed}" memperoleh skor risiko ${JENIS_SCORE[trimmed]}.` };
  }
  const parts = trimmed.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  const scores = parts.map((p) => JENIS_SCORE[p]).filter((s): s is number => s != null);
  if (scores.length === 0) {
    return { score: null, normalized: trimmed, reason: `Jenis pengadaan "${trimmed}" belum terpetakan.`, flag: 'UNMAPPED_PROCUREMENT_TYPE' };
  }
  const max = Math.max(...scores);
  return {
    score: max,
    normalized: parts.join(', '),
    reason: `Jenis pengadaan gabungan (${parts.join(', ')}) — skor tertinggi digunakan, yaitu ${max}.`,
  };
}

function sumberDanaComponent(list: string[]): {
  score: number | null;
  normalized: string | null;
  reason: string;
  flag?: DataQualityFlag;
} {
  const trimmedList = (list || []).map((s) => s.trim()).filter(Boolean);
  if (trimmedList.length === 0) {
    return { score: null, normalized: null, reason: 'Sumber dana tidak tersedia.', flag: 'UNMAPPED_FUNDING_SOURCE' };
  }
  const scored = trimmedList.map((s) => ({ s, score: sumberDanaScoreOf(s) }));
  const mapped = scored.filter((x): x is { s: string; score: number } => x.score != null);
  const hasUnmapped = scored.some((x) => x.score == null);
  if (mapped.length === 0) {
    return { score: null, normalized: trimmedList.join(', '), reason: `Sumber dana (${trimmedList.join(', ')}) belum terpetakan.`, flag: 'UNMAPPED_FUNDING_SOURCE' };
  }
  const best = mapped.reduce((a, b) => (b.score > a.score ? b : a));
  const reason =
    trimmedList.length > 1
      ? `Paket memiliki ${trimmedList.join(', ')}. Skor tertinggi digunakan, yaitu ${best.score}.`
      : `Sumber dana "${best.s}" memperoleh skor risiko ${best.score}.`;
  return { score: best.score, normalized: trimmedList.join(', '), reason, flag: hasUnmapped ? 'UNMAPPED_FUNDING_SOURCE' : undefined };
}

/** Hitung 6 komponen risiko Paket Penyedia. Murni — semua data sumber (raw rows, rantai revisi,
 * bukti pelaksanaan) sudah harus diambil oleh pemanggil; `today` WAJIB di-inject (deterministik/testable). */
export function computeRisikoPenyedia(input: PenyediaCalcInput, today: Date): RiskCalcResult {
  const components: RiskComponentResult[] = [];
  const flags = new Set<DataQualityFlag>();

  // 1. Pagu
  if (input.pagu == null || input.pagu < 0) {
    flags.add('MISSING_PAGU');
    components.push({
      code: 'pagu', label: 'Risiko Nilai Pagu', applicable: true, rawValue: input.pagu, normalizedValue: null,
      score: null, maxScore: 3, reason: 'Pagu tidak tersedia atau tidak valid.', sourceTable: 'api_paket_penyedia_terumumkan.pagu',
    });
  } else {
    const band = paguBand(input.pagu);
    components.push({
      code: 'pagu', label: 'Risiko Nilai Pagu', applicable: true, rawValue: input.pagu, normalizedValue: band.label,
      score: band.score, maxScore: 3,
      reason: `Pagu ${fmtRupiahDetail(input.pagu)} berada pada rentang ${band.label} sehingga memperoleh skor pagu ${band.score}.`,
      sourceTable: 'api_paket_penyedia_terumumkan.pagu',
    });
  }

  // 2. Metode
  const metodeTrim = input.metode?.trim() || null;
  if (metodeTrim && metodeTrim in METODE_SCORE) {
    const score = METODE_SCORE[metodeTrim];
    components.push({
      code: 'metode', label: 'Risiko Metode Pemilihan', applicable: true, rawValue: input.metode, normalizedValue: metodeTrim,
      score, maxScore: 3, reason: `Metode pemilihan "${metodeTrim}" memperoleh skor risiko ${score}.`,
      sourceTable: 'api_paket_penyedia_terumumkan.metode_pengadaan',
    });
  } else {
    flags.add('UNMAPPED_METHOD');
    components.push({
      code: 'metode', label: 'Risiko Metode Pemilihan', applicable: true, rawValue: input.metode, normalizedValue: null,
      score: null, maxScore: 3, reason: 'Metode pemilihan belum terpetakan.', sourceTable: 'api_paket_penyedia_terumumkan.metode_pengadaan',
    });
  }

  // 3. Jenis pengadaan
  const jenisResult = jenisComponent(input.jenis);
  if (jenisResult.flag) flags.add(jenisResult.flag);
  components.push({
    code: 'jenis', label: 'Risiko Jenis Pengadaan', applicable: true, rawValue: input.jenis, normalizedValue: jenisResult.normalized,
    score: jenisResult.score, maxScore: 3, reason: jenisResult.reason, sourceTable: 'api_paket_penyedia_terumumkan.jenis_pengadaan',
  });

  // 4. Sumber dana
  const sdResult = sumberDanaComponent(input.sumberDanaList);
  if (sdResult.flag) flags.add(sdResult.flag);
  components.push({
    code: 'sumber_dana', label: 'Risiko Sumber Dana', applicable: true,
    rawValue: input.sumberDanaList.length > 0 ? input.sumberDanaList.join('; ') : null, normalizedValue: sdResult.normalized,
    score: sdResult.score, maxScore: 3, reason: sdResult.reason, sourceTable: 'paket_anggaran_penyedia.jenis_dana_apbn',
  });

  // 5. Status pelaksanaan (menentukan skor komponen 6, sisa waktu)
  const exec = resolveExecutionStatus(input.executionInput);
  exec.flags.forEach((f) => flags.add(f));

  let sisaWaktuScoreVal: number | null = null;
  let sisaWaktuReason: string;
  if (exec.status === 'SUDAH_DILAKSANAKAN') {
    sisaWaktuScoreVal = 0;
    sisaWaktuReason = `Sudah dilaksanakan (bukti: ${exec.evidenceSource}, tanggal ${exec.evidenceDate}) sehingga skor waktu 0.`;
  } else if (exec.status === 'TIDAK_DAPAT_DITENTUKAN') {
    sisaWaktuReason = 'Status pelaksanaan tidak dapat ditentukan karena metode pemilihan belum terpetakan.';
  } else {
    const target = input.tglAkhirPemilihan ? new Date(input.tglAkhirPemilihan) : null;
    if (!target || Number.isNaN(target.getTime())) {
      flags.add(input.tglAkhirPemilihan ? 'INVALID_DATE' : 'MISSING_TARGET_DATE');
      sisaWaktuReason = 'Belum dilaksanakan dan tanggal akhir pemilihan tidak tersedia/tidak valid.';
    } else {
      const r = sisaWaktuScore(target, today);
      sisaWaktuScoreVal = r.score;
      sisaWaktuReason = `Belum dilaksanakan. ${r.reason}`;
    }
  }
  components.push({
    code: 'sisa_waktu', label: 'Risiko Sisa Waktu Pemilihan', applicable: true, rawValue: input.tglAkhirPemilihan,
    normalizedValue: exec.status, score: sisaWaktuScoreVal, maxScore: 3, reason: sisaWaktuReason,
    sourceTable: 'api_paket_penyedia_terumumkan.tgl_akhir_pemilihan',
  });

  // 6. Revisi
  const revisi = revisiScore(input.revisionChain);
  if (revisi.cycleDetected) flags.add('REVISION_CHAIN_ANOMALY');
  components.push({
    code: 'revisi', label: 'Risiko Jumlah Revisi RUP', applicable: true, rawValue: revisi.count, normalizedValue: String(revisi.count),
    score: revisi.score, maxScore: 3, reason: revisi.reason, sourceTable: 'history_kaji_ulang',
  });

  // Total & kategori — SATU komponen null saja membuat total resmi null (DATA_TIDAK_LENGKAP),
  // tidak pernah diam-diam dianggap 0.
  const scores = components.map((c) => c.score);
  const hasNull = scores.some((s) => s == null);
  const totalScore = hasNull ? null : (scores as number[]).reduce((a, b) => a + b, 0);
  const kategori: RiskKategori = totalScore == null ? 'DATA_TIDAK_LENGKAP' : pickKategori(totalScore, KATEGORI_BANDS_PENYEDIA);

  let mainRiskDriver: string | null = null;
  if (totalScore != null) {
    const maxComp = components.reduce((a, b) => ((b.score ?? -1) > (a.score ?? -1) ? b : a));
    mainRiskDriver = maxComp.label;
  }

  return {
    components,
    totalScore,
    maxScore: 18,
    kategori,
    mainRiskDriver,
    executionStatus: exec.status,
    executionEvidenceSource: exec.evidenceSource,
    executionEvidenceDate: exec.evidenceDate,
    jumlahRevisi: revisi.count,
    dataQualityFlags: Array.from(flags),
    transactionRefs: exec.transactionRefs,
  };
}
