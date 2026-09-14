import { describe, it, expect } from 'vitest';
import { computeRisikoPenyedia, type PenyediaCalcInput } from '../calcPenyedia';
import type { ExecutionInput } from '../calcExecutionStatus';

const today = new Date('2026-01-15T00:00:00Z');
const emptyExecution: ExecutionInput = { metode: 'Tender', tenderRecords: [], nonTenderRecords: [], pencatatanRecords: [], epurchasingRecords: [] };

function baseInput(overrides: Partial<PenyediaCalcInput> = {}): PenyediaCalcInput {
  return {
    pagu: 300_000_000, // skor 1
    metode: 'Tender', // skor 3
    jenis: 'Barang', // skor 0
    sumberDanaList: ['Rupiah Murni'], // skor 0
    tglAkhirPemilihan: '2026-06-01', // jauh > 3 bulan dari today -> skor 0
    revisionChain: [], // skor 0
    executionInput: emptyExecution,
    ...overrides,
  };
}

describe('computeRisikoPenyedia — kasus lengkap', () => {
  it('menjumlahkan seluruh komponen dan menentukan kategori dengan benar', () => {
    const result = computeRisikoPenyedia(baseInput(), today);
    // pagu(1) + metode(3) + jenis(0) + sumber_dana(0) + sisa_waktu(0) + revisi(0) = 4
    expect(result.totalScore).toBe(4);
    expect(result.kategori).toBe('RENDAH');
    expect(result.dataQualityFlags).toEqual([]);
    expect(result.mainRiskDriver).toBe('Risiko Metode Pemilihan');
  });

  it('kategori TINGGI ketika total skor tinggi', () => {
    const result = computeRisikoPenyedia(
      baseInput({
        pagu: 10_000_000_000, // 3
        metode: 'Tender', // 3
        jenis: 'Jasa Konsultansi', // 3
        sumberDanaList: ['Pinjaman Luar Negeri'], // 3
        tglAkhirPemilihan: '2026-01-16', // besok -> skor 3
        revisionChain: [
          { jenis_revisi: 'x', tgl_kaji_ulang: '', kd_rup_lama: '1', kd_rup_baru: '2' },
          { jenis_revisi: 'x', tgl_kaji_ulang: '', kd_rup_lama: '2', kd_rup_baru: '3' },
          { jenis_revisi: 'x', tgl_kaji_ulang: '', kd_rup_lama: '3', kd_rup_baru: '4' },
        ], // 3
      }),
      today
    );
    expect(result.totalScore).toBe(18);
    expect(result.kategori).toBe('TINGGI');
  });
});

describe('computeRisikoPenyedia — data tidak lengkap', () => {
  it('pagu null -> total null, kategori DATA_TIDAK_LENGKAP, flag MISSING_PAGU', () => {
    const result = computeRisikoPenyedia(baseInput({ pagu: null }), today);
    expect(result.totalScore).toBeNull();
    expect(result.kategori).toBe('DATA_TIDAK_LENGKAP');
    expect(result.dataQualityFlags).toContain('MISSING_PAGU');
    expect(result.mainRiskDriver).toBeNull();
  });

  it('metode tidak dikenal -> DATA_TIDAK_LENGKAP, flag UNMAPPED_METHOD, execution TIDAK_DAPAT_DITENTUKAN', () => {
    const result = computeRisikoPenyedia(
      baseInput({ metode: 'Metode Asing', executionInput: { ...emptyExecution, metode: 'Metode Asing' } }),
      today
    );
    expect(result.totalScore).toBeNull();
    expect(result.kategori).toBe('DATA_TIDAK_LENGKAP');
    expect(result.dataQualityFlags).toContain('UNMAPPED_METHOD');
    expect(result.executionStatus).toBe('TIDAK_DAPAT_DITENTUKAN');
  });

  it('tgl_akhir_pemilihan kosong dan belum dilaksanakan -> MISSING_TARGET_DATE', () => {
    const result = computeRisikoPenyedia(baseInput({ tglAkhirPemilihan: null }), today);
    expect(result.totalScore).toBeNull();
    expect(result.dataQualityFlags).toContain('MISSING_TARGET_DATE');
  });

  it('kategori TIDAK PERNAH "Rendah" ketika skor null akibat data tidak lengkap', () => {
    const result = computeRisikoPenyedia(baseInput({ pagu: null }), today);
    expect(result.kategori).not.toBe('RENDAH');
  });
});

describe('computeRisikoPenyedia — jenis pengadaan gabungan', () => {
  it('kombinasi tanpa exact mapping -> pecah & ambil skor tertinggi', () => {
    const result = computeRisikoPenyedia(baseInput({ jenis: 'Barang;Pekerjaan Konstruksi' }), today);
    const jenisComp = result.components.find((c) => c.code === 'jenis');
    expect(jenisComp?.score).toBe(2); // max(Barang=0, Pekerjaan Konstruksi=2)
  });

  it('exact mapping kombinasi "Barang;Jasa Lainnya" dipakai langsung', () => {
    const result = computeRisikoPenyedia(baseInput({ jenis: 'Barang;Jasa Lainnya' }), today);
    const jenisComp = result.components.find((c) => c.code === 'jenis');
    expect(jenisComp?.score).toBe(1);
  });
});

describe('computeRisikoPenyedia — sumber dana jamak', () => {
  it('beberapa sumber dana -> skor tertinggi dipakai', () => {
    const result = computeRisikoPenyedia(baseInput({ sumberDanaList: ['Rupiah Murni', 'PNBP', 'Pinjaman Luar Negeri'] }), today);
    const sdComp = result.components.find((c) => c.code === 'sumber_dana');
    expect(sdComp?.score).toBe(3);
  });

  it('mengenali sumber dana UPPERCASE seperti data live paket_anggaran_penyedia.jenis_dana_apbn', () => {
    // Regresi: paket_anggaran_penyedia.jenis_dana_apbn di database sungguhan memakai UPPERCASE
    // ("RUPIAH MURNI", "PNBP") — ditemukan saat smoke test langsung ke Supabase (19/20 paket
    // salah dianggap DATA_TIDAK_LENGKAP sebelum fix normalisasi kasus-tak-peka ini).
    const result = computeRisikoPenyedia(baseInput({ sumberDanaList: ['RUPIAH MURNI'] }), today);
    const sdComp = result.components.find((c) => c.code === 'sumber_dana');
    expect(sdComp?.score).toBe(0);
    expect(result.dataQualityFlags).not.toContain('UNMAPPED_FUNDING_SOURCE');
  });
});

describe('computeRisikoPenyedia — sudah dilaksanakan', () => {
  it('skor waktu 0 ketika sudah dilaksanakan, walau tgl_akhir_pemilihan sudah lewat', () => {
    const result = computeRisikoPenyedia(
      baseInput({
        tglAkhirPemilihan: '2025-01-01', // sudah lama lewat
        executionInput: {
          metode: 'Tender',
          tenderRecords: [{ date: '2025-06-01', sourceTable: 'tender_selesai_nilai.tgl_pengumuman_tender', code: 'TDR-1' }],
          nonTenderRecords: [],
          pencatatanRecords: [],
          epurchasingRecords: [],
        },
      }),
      today
    );
    const waktuComp = result.components.find((c) => c.code === 'sisa_waktu');
    expect(waktuComp?.score).toBe(0);
    expect(result.executionStatus).toBe('SUDAH_DILAKSANAKAN');
  });
});
