import type { RupHistoryEntry } from '@/lib/paket/rupHistory';
import type { RiskCalcResult } from './calcPenyedia';

/** Naikkan versi ini setiap kali business rule (bands.ts/mappings.ts/calc*.ts) berubah, supaya
 * baris lama di risiko_pengadaan bisa dibedakan dari hasil kalkulasi aturan terbaru. */
export const RULES_VERSION = 'risiko-v1-2026';

export interface PenyediaMasterMeta {
  kd_rup: string;
  nama_paket: string | null;
  satker: string | null;
  eselon1: string | null;
  nama_ppk: string | null;
  tahun_anggaran: number | null;
  pagu: number | null;
  metode_pengadaan: string | null;
  jenis_pengadaan: string | null;
}

export interface SwakelolaMasterMeta {
  kd_rup: string;
  nama_paket: string | null;
  satker: string | null;
  eselon1: string | null;
  nama_ppk: string | null;
  tahun_anggaran: number | null;
  pagu: number | null;
  tipe_swakelola: string | null;
}

/** Baris siap upsert ke tabel risiko_pengadaan (lihat sql/migrations/64_table_risiko_pengadaan.sql). */
export interface RisikoPengadaanRow {
  kd_rup: string;
  jenis_paket: 'Penyedia' | 'Swakelola';
  nama_paket: string | null;
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
  kategori: string;
  main_risk_driver: string | null;
  execution_status: string;
  execution_evidence_source: string | null;
  execution_evidence_date: string | null;
  jumlah_revisi: number | null;
  data_quality_flags: string[];
  components_json: RiskCalcResult['components'];
  revision_chain_json: RupHistoryEntry[];
  transaction_refs_json: RiskCalcResult['transactionRefs'];
  calculated_at: string;
  rules_version: string;
}

export function buildPenyediaRow(meta: PenyediaMasterMeta, calc: RiskCalcResult, revisionChain: RupHistoryEntry[]): RisikoPengadaanRow {
  const sumberDanaComponent = calc.components.find((c) => c.code === 'sumber_dana');
  return {
    kd_rup: meta.kd_rup,
    jenis_paket: 'Penyedia',
    nama_paket: meta.nama_paket,
    satker: meta.satker,
    eselon1: meta.eselon1,
    nama_ppk: meta.nama_ppk,
    tahun_anggaran: meta.tahun_anggaran,
    pagu: meta.pagu,
    metode_pengadaan: meta.metode_pengadaan,
    jenis_pengadaan: meta.jenis_pengadaan,
    sumber_dana: sumberDanaComponent?.normalizedValue ?? null,
    tipe_swakelola: null,
    total_score: calc.totalScore,
    max_score: calc.maxScore,
    kategori: calc.kategori,
    main_risk_driver: calc.mainRiskDriver,
    execution_status: calc.executionStatus,
    execution_evidence_source: calc.executionEvidenceSource,
    execution_evidence_date: calc.executionEvidenceDate,
    jumlah_revisi: calc.jumlahRevisi,
    data_quality_flags: calc.dataQualityFlags,
    components_json: calc.components,
    revision_chain_json: revisionChain,
    transaction_refs_json: calc.transactionRefs,
    calculated_at: new Date().toISOString(),
    rules_version: RULES_VERSION,
  };
}

export function buildSwakelolaRow(meta: SwakelolaMasterMeta, calc: RiskCalcResult, revisionChain: RupHistoryEntry[]): RisikoPengadaanRow {
  return {
    kd_rup: meta.kd_rup,
    jenis_paket: 'Swakelola',
    nama_paket: meta.nama_paket,
    satker: meta.satker,
    eselon1: meta.eselon1,
    nama_ppk: meta.nama_ppk,
    tahun_anggaran: meta.tahun_anggaran,
    pagu: meta.pagu,
    metode_pengadaan: null,
    jenis_pengadaan: null,
    sumber_dana: null,
    tipe_swakelola: meta.tipe_swakelola,
    total_score: calc.totalScore,
    max_score: calc.maxScore,
    kategori: calc.kategori,
    main_risk_driver: calc.mainRiskDriver,
    execution_status: calc.executionStatus,
    execution_evidence_source: calc.executionEvidenceSource,
    execution_evidence_date: calc.executionEvidenceDate,
    jumlah_revisi: calc.jumlahRevisi,
    data_quality_flags: calc.dataQualityFlags,
    components_json: calc.components,
    revision_chain_json: revisionChain,
    transaction_refs_json: calc.transactionRefs,
    calculated_at: new Date().toISOString(),
    rules_version: RULES_VERSION,
  };
}
