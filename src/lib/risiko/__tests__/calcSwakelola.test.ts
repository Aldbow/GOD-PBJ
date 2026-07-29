import { describe, it, expect } from 'vitest';
import { computeRisikoSwakelola, type SwakelolaCalcInput } from '../calcSwakelola';
import type { EvidenceRecord } from '../calcExecutionStatus';

const today = new Date('2026-01-15T00:00:00Z');

function baseInput(overrides: Partial<SwakelolaCalcInput> = {}): SwakelolaCalcInput {
  return {
    pagu: 300_000_000, // skor 1
    tipeSwakelola: '1', // skor 1
    tglAwalPelaksanaanKontrak: '2026-06-01', // jauh > 3 bulan -> skor 0
    revisionChain: [], // skor 0
    realisasiRecords: [] as EvidenceRecord[],
    ...overrides,
  };
}

describe('computeRisikoSwakelola — kasus lengkap', () => {
  it('menjumlahkan 4 komponen dan menentukan kategori Swakelola (maks 12)', () => {
    const result = computeRisikoSwakelola(baseInput(), today);
    // pagu(1) + tipe(1) + sisa_waktu(0) + revisi(0) = 2
    expect(result.totalScore).toBe(2);
    expect(result.maxScore).toBe(12);
    expect(result.kategori).toBe('RENDAH');
  });

  it('kategori TINGGI untuk skor tinggi (maks 12, bukan 18 seperti Penyedia)', () => {
    const result = computeRisikoSwakelola(
      baseInput({
        pagu: 10_000_000_000, // 3
        tipeSwakelola: '4', // 3
        tglAwalPelaksanaanKontrak: '2026-01-16', // besok -> 3
        revisionChain: [
          { jenis_revisi: 'x', tgl_kaji_ulang: '', kd_rup_lama: '1', kd_rup_baru: '2' },
          { jenis_revisi: 'x', tgl_kaji_ulang: '', kd_rup_lama: '2', kd_rup_baru: '3' },
          { jenis_revisi: 'x', tgl_kaji_ulang: '', kd_rup_lama: '3', kd_rup_baru: '4' },
        ], // 3
      }),
      today
    );
    expect(result.totalScore).toBe(12);
    expect(result.kategori).toBe('TINGGI');
  });
});

describe('computeRisikoSwakelola — komponen TIDAK BERLAKU', () => {
  it('metode/jenis/sumber_dana selalu applicable:false dan TIDAK memengaruhi total', () => {
    const result = computeRisikoSwakelola(baseInput(), today);
    const naComponents = result.components.filter((c) => ['metode', 'jenis', 'sumber_dana'].includes(c.code));
    expect(naComponents).toHaveLength(3);
    for (const c of naComponents) {
      expect(c.applicable).toBe(false);
      expect(c.score).toBeNull();
    }
    // total tetap terhitung normal walau 3 komponen ini null, karena bukan applicable.
    expect(result.totalScore).not.toBeNull();
  });

  it('main_risk_driver tidak pernah menunjuk komponen yang tidak berlaku', () => {
    const result = computeRisikoSwakelola(baseInput({ tipeSwakelola: '4' }), today);
    expect(result.mainRiskDriver).not.toBe('Risiko Metode Pemilihan');
    expect(result.mainRiskDriver).not.toBe('Risiko Jenis Pengadaan');
    expect(result.mainRiskDriver).not.toBe('Risiko Sumber Dana');
  });
});

describe('computeRisikoSwakelola — data tidak lengkap', () => {
  it('pagu null -> DATA_TIDAK_LENGKAP, flag MISSING_PAGU', () => {
    const result = computeRisikoSwakelola(baseInput({ pagu: null }), today);
    expect(result.totalScore).toBeNull();
    expect(result.kategori).toBe('DATA_TIDAK_LENGKAP');
    expect(result.dataQualityFlags).toContain('MISSING_PAGU');
  });

  it('tipe Swakelola belum terpetakan -> DATA_TIDAK_LENGKAP, flag UNMAPPED_SWAKELOLA_TYPE', () => {
    const result = computeRisikoSwakelola(baseInput({ tipeSwakelola: 'Tipe Asing' }), today);
    expect(result.totalScore).toBeNull();
    expect(result.dataQualityFlags).toContain('UNMAPPED_SWAKELOLA_TYPE');
  });

  it('tgl_awal_pelaksanaan_kontrak kosong dan belum dilaksanakan -> MISSING_TARGET_DATE', () => {
    const result = computeRisikoSwakelola(baseInput({ tglAwalPelaksanaanKontrak: null }), today);
    expect(result.totalScore).toBeNull();
    expect(result.dataQualityFlags).toContain('MISSING_TARGET_DATE');
  });
});

describe('computeRisikoSwakelola — tipe swakelola', () => {
  it.each([
    ['1', 1],
    ['I', 1],
    ['Tipe I', 1],
    ['2', 2],
    ['3', 3],
    ['4', 3],
    ['IV', 3],
  ])('tipe "%s" -> skor %i', (tipe, expected) => {
    const result = computeRisikoSwakelola(baseInput({ tipeSwakelola: tipe }), today);
    const comp = result.components.find((c) => c.code === 'tipe_swakelola');
    expect(comp?.score).toBe(expected);
  });
});

describe('computeRisikoSwakelola — bukti realisasi (jembatan kd_swakelola_pct)', () => {
  it('SUDAH_DILAKSANAKAN ketika ada bukti tgl_realisasi valid -> skor waktu 0', () => {
    const result = computeRisikoSwakelola(
      baseInput({
        realisasiRecords: [{ date: '2026-01-10', sourceTable: 'pencatatan_swakelola_realisasi.tgl_realisasi', code: '123' }],
      }),
      today
    );
    expect(result.executionStatus).toBe('SUDAH_DILAKSANAKAN');
    const comp = result.components.find((c) => c.code === 'sisa_waktu');
    expect(comp?.score).toBe(0);
  });

  it('BELUM_DILAKSANAKAN tanpa bukti realisasi (bukan data tidak lengkap)', () => {
    const result = computeRisikoSwakelola(baseInput(), today);
    expect(result.executionStatus).toBe('BELUM_DILAKSANAKAN');
    expect(result.kategori).not.toBe('DATA_TIDAK_LENGKAP');
  });
});
