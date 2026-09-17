import { describe, it, expect } from 'vitest';
import { aggregate, listTahunAnggaran, type GabunganRow } from '../ringkasanData';

/**
 * Filter tahun anggaran dana pada halaman Ringkasan.
 *
 * Latar belakangnya nyata: tabel paket_anggaran_* memecah pagu satu paket per
 * MAK dan per tahun dana, dan paket tender multi-tahun 2026-2027 sempat
 * terhitung dua kali karena view merekonstruksi porsi 2026 dari pagu terumumkan
 * (lihat sql/migrations/78_pagu_per_tahun_anggaran.sql). Yang dikunci di sini:
 * pagu boleh dilingkupi per tahun, tapi jumlah paket dan realisasi tidak boleh
 * ikut berubah karenanya.
 */

function row(over: Partial<GabunganRow> = {}): GabunganRow {
  return {
    kd_rup: '1001',
    rup_name: 'Renovasi Gedung',
    satker: 'Sekretariat Jenderal',
    nama_ppk: 'Budi',
    metode_pengadaan: 'Tender',
    jenis_pengadaan: 'Pekerjaan Konstruksi',
    pagu: 1_000_000_000,
    pagu_per_tahun: { '2026': 1_000_000_000 },
    total: 400_000_000,
    status: 'Selesai',
    status_kurasi: 'Akurat',
    catatan_kurasi: null,
    rekomendasi_kurasi: null,
    is_from_sirup: true,
    ...over,
  };
}

// Satu paket satu tahun, satu paket multi-tahun, dan satu paket anomali yang
// punya realisasi tapi tidak punya pagu sama sekali.
const ROWS: GabunganRow[] = [
  row(),
  row({
    kd_rup: '1002',
    pagu: 500_000_000,
    pagu_per_tahun: { '2026': 300_000_000, '2027': 200_000_000 },
    total: 0,
  }),
  row({ kd_rup: '1003', pagu: 0, pagu_per_tahun: null, total: 250_000_000, is_from_sirup: false }),
];

const semuaTahun = { satker: '', ppk: '', tahun: '' };

describe('listTahunAnggaran', () => {
  it('mengumpulkan tahun yang ada di data, terlama dulu', () => {
    expect(listTahunAnggaran(ROWS)).toEqual(['2026', '2027']);
  });

  it('mengembalikan daftar kosong kalau tidak ada breakdown tahunan', () => {
    expect(listTahunAnggaran([row({ pagu_per_tahun: null })])).toEqual([]);
  });
});

describe('aggregate dengan lingkup tahun anggaran', () => {
  it('tanpa tahun terpilih memakai pagu penuh seluruh tahun', () => {
    expect(aggregate(ROWS, semuaTahun).kpi.totalPagu).toBe(1_500_000_000);
  });

  it('memecah pagu paket multi-tahun sesuai tahun terpilih', () => {
    expect(aggregate(ROWS, { ...semuaTahun, tahun: '2026' }).kpi.totalPagu).toBe(1_300_000_000);
    expect(aggregate(ROWS, { ...semuaTahun, tahun: '2027' }).kpi.totalPagu).toBe(200_000_000);
  });

  it('menjumlah tiap tahun kembali ke pagu penuh', () => {
    const p2026 = aggregate(ROWS, { ...semuaTahun, tahun: '2026' }).kpi.totalPagu;
    const p2027 = aggregate(ROWS, { ...semuaTahun, tahun: '2027' }).kpi.totalPagu;
    expect(p2026 + p2027).toBe(aggregate(ROWS, semuaTahun).kpi.totalPagu);
  });

  it('tidak menghilangkan satu paket pun saat tahun dipilih', () => {
    for (const tahun of ['', '2026', '2027']) {
      expect(aggregate(ROWS, { ...semuaTahun, tahun }).kpi.totalPaket).toBe(3);
    }
  });

  it('menghitung realisasi pada tahun belanjanya saja', () => {
    // 2026 adalah tahun RUP-nya, jadi di situlah seluruh realisasi tercatat.
    expect(aggregate(ROWS, semuaTahun).kpi.totalRealisasi).toBe(650_000_000);
    expect(aggregate(ROWS, { ...semuaTahun, tahun: '2026' }).kpi.totalRealisasi).toBe(650_000_000);
    expect(aggregate(ROWS, { ...semuaTahun, tahun: '2027' }).kpi.totalRealisasi).toBe(0);
  });

  it('tidak pernah melaporkan capaian di atas 100 persen', () => {
    for (const tahun of ['', '2026', '2027']) {
      expect(aggregate(ROWS, { ...semuaTahun, tahun }).kpi.pctRealisasi).toBeLessThanOrEqual(100);
    }
  });

  it('menandai seluruh pagu tahun berikutnya sebagai belum direalisasi', () => {
    const kpi = aggregate(ROWS, { ...semuaTahun, tahun: '2027' }).kpi;
    expect(kpi.belumRealisasi).toBe(200_000_000);
    expect(kpi.paketSudah).toBe(0);
  });

  it('memberi pagu nol pada paket anomali, realisasinya tetap terhitung di tahun belanja', () => {
    const anomali = [ROWS[2]];
    const kpi = aggregate(anomali, { ...semuaTahun, tahun: '' }).kpi;
    expect(kpi.totalPagu).toBe(0);
    expect(kpi.totalRealisasi).toBe(250_000_000);
  });

  it('memberi pagu nol untuk tahun yang tidak didanai paket itu', () => {
    expect(aggregate([row()], { ...semuaTahun, tahun: '2027' }).kpi.totalPagu).toBe(0);
  });
});
