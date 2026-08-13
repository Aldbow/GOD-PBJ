export type MatchStatus = 'penyedia' | 'swakelola' | 'tidak_ditemukan';

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  penyedia: 'Match Penyedia',
  swakelola: 'Match Swakelola',
  tidak_ditemukan: 'Tidak Ditemukan',
};

/**
 * Satu baris Program Prioritas Nasional (master_data_ro) yang sudah digabung
 * runtime ke api_paket_penyedia_terumumkan / api_paket_swakelola_terumumkan
 * lewat kd_rup. Field ber-suffix `_spse` hanya terisi kalau match_status !==
 * 'tidak_ditemukan' — lihat fetchProgramPrioritasNasional.ts untuk kaveat
 * kualitas data (kd_rup master_data_ro adalah teks bebas hasil impor CSV).
 */
export interface ProgramPrioritasRow {
  id: string;
  no: string | null;
  kd_rup: string | null;
  nama_paket: string | null;
  nama_ro: string | null;
  nilai_paket: number;
  skema: string | null;
  jenis_pengadaan: string | null;
  lokasi: string | null;
  waktu_pengadaan: string | null;
  kendala: string | null;
  mitigasi: string | null;
  realisasi: string | null;
  match_status: MatchStatus;
  nama_satker: string | null;
  nama_ppk: string | null;
  pagu_spse: number | null;
  status_umumkan_rup: string | null;
  tahun_anggaran: number | null;
  metode_pengadaan_spse: string | null;
  created_at: string;
}
