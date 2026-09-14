import type { RiskRow } from './types';

// Kolom JSONB (components_json dst.) di-select terpisah dari kolom listing supaya baris di tabel
// utama ringan; kolom penuh (termasuk JSONB) diambil saat baris diklik untuk detail modal.
export const RISK_LIST_COLUMNS =
  'kd_rup,jenis_paket,nama_paket,satker,eselon1,nama_ppk,tahun_anggaran,pagu,metode_pengadaan,jenis_pengadaan,sumber_dana,tipe_swakelola,total_score,max_score,kategori,main_risk_driver,execution_status,execution_evidence_source,execution_evidence_date,jumlah_revisi,data_quality_flags,calculated_at,rules_version,components_json';

export function mapRiskRow(raw: any): RiskRow {
  return {
    kd_rup: String(raw.kd_rup),
    nama_paket: raw.nama_paket,
    jenis_paket: raw.jenis_paket,
    satker: raw.satker,
    eselon1: raw.eselon1,
    nama_ppk: raw.nama_ppk,
    tahun_anggaran: raw.tahun_anggaran,
    pagu: raw.pagu != null ? Number(raw.pagu) : null,
    metode_pengadaan: raw.metode_pengadaan,
    jenis_pengadaan: raw.jenis_pengadaan,
    sumber_dana: raw.sumber_dana,
    tipe_swakelola: raw.tipe_swakelola,
    total_score: raw.total_score != null ? Number(raw.total_score) : null,
    max_score: Number(raw.max_score) || 0,
    kategori: raw.kategori,
    main_risk_driver: raw.main_risk_driver,
    execution_status: raw.execution_status,
    execution_evidence_source: raw.execution_evidence_source,
    execution_evidence_date: raw.execution_evidence_date,
    jumlah_revisi: raw.jumlah_revisi,
    data_quality_flags: raw.data_quality_flags || [],
    calculated_at: raw.calculated_at,
    rules_version: raw.rules_version,
    components_json: raw.components_json,
  };
}
