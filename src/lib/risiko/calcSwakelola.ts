import type { RupHistoryEntry } from '@/lib/paket/rupHistory';
import { fmtRupiahDetail } from '@/lib/format';
import { paguBand, pickKategori, KATEGORI_BANDS_SWAKELOLA } from './bands';
import { tipeSwakelolaScoreOf } from './mappings';
import { sisaWaktuScore } from './calcSisaWaktu';
import { revisiScore } from './calcRevisi';
import { resolveSwakelolaExecutionStatus, type EvidenceRecord } from './calcExecutionStatus';
import type { RiskCalcResult } from './calcPenyedia';
import type { DataQualityFlag, RiskComponentResult, RiskKategori } from './types';

export interface SwakelolaCalcInput {
  pagu: number | null;
  tipeSwakelola: string | null;
  tglAwalPelaksanaanKontrak: string | null;
  revisionChain: RupHistoryEntry[];
  realisasiRecords: EvidenceRecord[];
}

// Metode/Jenis Pengadaan/Sumber Dana TIDAK BERLAKU untuk Swakelola (bukan bagian model
// penilaiannya) — tampil sebagai placeholder applicable:false, TIDAK dihitung ke total dan
// TIDAK memicu flag data tidak lengkap.
function notApplicableComponent(code: string, label: string): RiskComponentResult {
  return {
    code, label, applicable: false, rawValue: null, normalizedValue: null, score: null, maxScore: 0,
    reason: 'Tidak berlaku untuk paket Swakelola.', sourceTable: '-',
  };
}

/** Hitung 4 komponen risiko Paket Swakelola. Murni, sama seperti computeRisikoPenyedia —
 * `today` WAJIB di-inject oleh pemanggil. */
export function computeRisikoSwakelola(input: SwakelolaCalcInput, today: Date): RiskCalcResult {
  const components: RiskComponentResult[] = [];
  const flags = new Set<DataQualityFlag>();

  // 1. Pagu (bands sama dengan Penyedia)
  if (input.pagu == null || input.pagu < 0) {
    flags.add('MISSING_PAGU');
    components.push({
      code: 'pagu', label: 'Risiko Nilai Pagu', applicable: true, rawValue: input.pagu, normalizedValue: null,
      score: null, maxScore: 3, reason: 'Pagu tidak tersedia atau tidak valid.', sourceTable: 'api_paket_swakelola_terumumkan.pagu',
    });
  } else {
    const band = paguBand(input.pagu);
    components.push({
      code: 'pagu', label: 'Risiko Nilai Pagu', applicable: true, rawValue: input.pagu, normalizedValue: band.label,
      score: band.score, maxScore: 3,
      reason: `Pagu ${fmtRupiahDetail(input.pagu)} berada pada rentang ${band.label} sehingga memperoleh skor pagu ${band.score}.`,
      sourceTable: 'api_paket_swakelola_terumumkan.pagu',
    });
  }

  // 2. Tipe Swakelola
  const tipeTrim = input.tipeSwakelola?.trim() || null;
  const tipeScore = tipeTrim ? tipeSwakelolaScoreOf(tipeTrim) : undefined;
  if (tipeTrim && tipeScore != null) {
    components.push({
      code: 'tipe_swakelola', label: 'Risiko Tipe Swakelola', applicable: true, rawValue: input.tipeSwakelola, normalizedValue: tipeTrim,
      score: tipeScore, maxScore: 3, reason: `Tipe Swakelola "${tipeTrim}" memperoleh skor risiko ${tipeScore}.`,
      sourceTable: 'api_paket_swakelola_terumumkan.tipe_swakelola',
    });
  } else {
    flags.add('UNMAPPED_SWAKELOLA_TYPE');
    components.push({
      code: 'tipe_swakelola', label: 'Risiko Tipe Swakelola', applicable: true, rawValue: input.tipeSwakelola, normalizedValue: null,
      score: null, maxScore: 3, reason: 'Tipe Swakelola belum terpetakan.', sourceTable: 'api_paket_swakelola_terumumkan.tipe_swakelola',
    });
  }

  // 3. Status pelaksanaan + sisa waktu (bukti: pencatatan_swakelola_realisasi via jembatan kd_swakelola_pct)
  const exec = resolveSwakelolaExecutionStatus(input.realisasiRecords);
  exec.flags.forEach((f) => flags.add(f));

  let sisaWaktuScoreVal: number | null = null;
  let sisaWaktuReason: string;
  if (exec.status === 'SUDAH_DILAKSANAKAN') {
    sisaWaktuScoreVal = 0;
    sisaWaktuReason = `Sudah dilaksanakan (bukti: ${exec.evidenceSource}, tanggal ${exec.evidenceDate}) sehingga skor waktu 0.`;
  } else {
    const target = input.tglAwalPelaksanaanKontrak ? new Date(input.tglAwalPelaksanaanKontrak) : null;
    if (!target || Number.isNaN(target.getTime())) {
      flags.add(input.tglAwalPelaksanaanKontrak ? 'INVALID_DATE' : 'MISSING_TARGET_DATE');
      sisaWaktuReason = 'Belum dilaksanakan dan tanggal awal pelaksanaan kontrak tidak tersedia/tidak valid.';
    } else {
      const r = sisaWaktuScore(target, today);
      sisaWaktuScoreVal = r.score;
      sisaWaktuReason = `Belum dilaksanakan. ${r.reason}`;
    }
  }
  components.push({
    code: 'sisa_waktu', label: 'Risiko Sisa Waktu Pelaksanaan', applicable: true, rawValue: input.tglAwalPelaksanaanKontrak,
    normalizedValue: exec.status, score: sisaWaktuScoreVal, maxScore: 3, reason: sisaWaktuReason,
    sourceTable: 'api_paket_swakelola_terumumkan.tgl_awal_pelaksanaan_kontrak',
  });

  // 4. Revisi (aturan & sumber sama dengan Penyedia)
  const revisi = revisiScore(input.revisionChain);
  if (revisi.cycleDetected) flags.add('REVISION_CHAIN_ANOMALY');
  components.push({
    code: 'revisi', label: 'Risiko Jumlah Revisi RUP', applicable: true, rawValue: revisi.count, normalizedValue: String(revisi.count),
    score: revisi.score, maxScore: 3, reason: revisi.reason, sourceTable: 'history_kaji_ulang',
  });

  // Komponen TIDAK BERLAKU — ditampilkan di detail (badge "Tidak Berlaku"), tidak dihitung.
  components.push(notApplicableComponent('metode', 'Risiko Metode Pemilihan'));
  components.push(notApplicableComponent('jenis', 'Risiko Jenis Pengadaan'));
  components.push(notApplicableComponent('sumber_dana', 'Risiko Sumber Dana'));

  const applicableComponents = components.filter((c) => c.applicable);
  const scores = applicableComponents.map((c) => c.score);
  const hasNull = scores.some((s) => s == null);
  const totalScore = hasNull ? null : (scores as number[]).reduce((a, b) => a + b, 0);
  const kategori: RiskKategori = totalScore == null ? 'DATA_TIDAK_LENGKAP' : pickKategori(totalScore, KATEGORI_BANDS_SWAKELOLA);

  let mainRiskDriver: string | null = null;
  if (totalScore != null) {
    const maxComp = applicableComponents.reduce((a, b) => ((b.score ?? -1) > (a.score ?? -1) ? b : a));
    mainRiskDriver = maxComp.label;
  }

  return {
    components,
    totalScore,
    maxScore: 12,
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
