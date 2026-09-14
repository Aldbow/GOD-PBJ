import { describe, it, expect } from 'vitest';
import { resolveExecutionStatus, resolveSwakelolaExecutionStatus, type EvidenceRecord } from '../calcExecutionStatus';

const empty = { tenderRecords: [] as EvidenceRecord[], nonTenderRecords: [] as EvidenceRecord[], pencatatanRecords: [] as EvidenceRecord[], epurchasingRecords: [] as EvidenceRecord[] };

describe('resolveExecutionStatus — metode tidak dikenal', () => {
  it('TIDAK_DAPAT_DITENTUKAN untuk metode null', () => {
    const r = resolveExecutionStatus({ metode: null, ...empty });
    expect(r.status).toBe('TIDAK_DAPAT_DITENTUKAN');
    expect(r.flags).toContain('UNMAPPED_METHOD');
  });

  it('TIDAK_DAPAT_DITENTUKAN untuk metode yang belum terpetakan', () => {
    const r = resolveExecutionStatus({ metode: 'Metode Asing', ...empty });
    expect(r.status).toBe('TIDAK_DAPAT_DITENTUKAN');
    expect(r.flags).toContain('UNMAPPED_METHOD');
  });
});

describe('resolveExecutionStatus — Tender', () => {
  it('BELUM_DILAKSANAKAN ketika tidak ada bukti sama sekali (bukan data tidak lengkap)', () => {
    const r = resolveExecutionStatus({ metode: 'Tender', ...empty });
    expect(r.status).toBe('BELUM_DILAKSANAKAN');
    expect(r.flags).not.toContain('MISSING_EXECUTION_REFERENCE');
  });

  it('SUDAH_DILAKSANAKAN ketika ada tgl_pengumuman_tender valid', () => {
    const r = resolveExecutionStatus({
      metode: 'Tender',
      ...empty,
      tenderRecords: [{ date: '2026-01-10', sourceTable: 'tender_selesai_nilai.tgl_pengumuman_tender', code: 'TDR-1' }],
    });
    expect(r.status).toBe('SUDAH_DILAKSANAKAN');
    expect(r.evidenceDate).toBe('2026-01-10');
    expect(r.transactionRefs).toEqual([{ label: 'tender_selesai_nilai.tgl_pengumuman_tender', code: 'TDR-1' }]);
  });

  it('memilih tanggal PALING AWAL ketika ada beberapa bukti valid', () => {
    const r = resolveExecutionStatus({
      metode: 'Tender',
      ...empty,
      tenderRecords: [
        { date: '2026-03-01', sourceTable: 'tender_selesai_nilai.tgl_pengumuman_tender', code: 'TDR-2' },
        { date: '2026-01-05', sourceTable: 'tender_selesai_nilai.tgl_pengumuman_tender', code: 'TDR-1' },
      ],
    });
    expect(r.evidenceDate).toBe('2026-01-05');
  });

  it('flag SOURCE_METHOD_MISMATCH ketika bukti muncul di sumber yang tidak sesuai metode', () => {
    const r = resolveExecutionStatus({
      metode: 'Tender',
      ...empty,
      epurchasingRecords: [{ date: '2026-01-10', sourceTable: 'paket_e_purchasing', code: 'EP-1', status: 'COMPLETED' }],
    });
    expect(r.status).toBe('BELUM_DILAKSANAKAN');
    expect(r.flags).toContain('SOURCE_METHOD_MISMATCH');
  });
});

describe('resolveExecutionStatus — Pengadaan Langsung (dua sumber valid)', () => {
  it('SUDAH_DILAKSANAKAN via non_tender_selesai', () => {
    const r = resolveExecutionStatus({
      metode: 'Pengadaan Langsung',
      ...empty,
      nonTenderRecords: [{ date: '2026-02-01', sourceTable: 'non_tender_selesai.tgl_pengumuman_nontender', code: 'NT-1' }],
    });
    expect(r.status).toBe('SUDAH_DILAKSANAKAN');
  });

  it('SUDAH_DILAKSANAKAN via pencatatan_non_tender_realisasi', () => {
    const r = resolveExecutionStatus({
      metode: 'Pengadaan Langsung',
      ...empty,
      pencatatanRecords: [{ date: '2026-02-01', sourceTable: 'pencatatan_non_tender_realisasi.tgl_realisasi', code: 'PC-1' }],
    });
    expect(r.status).toBe('SUDAH_DILAKSANAKAN');
  });

  it('menggabungkan kedua sumber dan memilih yang paling awal', () => {
    const r = resolveExecutionStatus({
      metode: 'Pengadaan Langsung',
      ...empty,
      nonTenderRecords: [{ date: '2026-02-10', sourceTable: 'non_tender_selesai.tgl_pengumuman_nontender', code: 'NT-1' }],
      pencatatanRecords: [{ date: '2026-01-05', sourceTable: 'pencatatan_non_tender_realisasi.tgl_realisasi', code: 'PC-1' }],
    });
    expect(r.evidenceDate).toBe('2026-01-05');
  });
});

describe('resolveExecutionStatus — E-Purchasing', () => {
  it('SUDAH_DILAKSANAKAN hanya jika status masuk whitelist DAN order_date valid', () => {
    const r = resolveExecutionStatus({
      metode: 'E-Purchasing',
      ...empty,
      epurchasingRecords: [{ date: '2026-01-10', sourceTable: 'paket_e_purchasing.order_date', code: 'ORD-1', status: 'ON_PROCESS' }],
    });
    expect(r.status).toBe('SUDAH_DILAKSANAKAN');
  });

  it('BELUM_DILAKSANAKAN ketika order_date terisi tapi status di luar whitelist', () => {
    const r = resolveExecutionStatus({
      metode: 'E-Purchasing',
      ...empty,
      epurchasingRecords: [{ date: '2026-01-10', sourceTable: 'paket_e_purchasing.order_date', code: 'ORD-1', status: 'ON_NEGOTIATION' }],
    });
    expect(r.status).toBe('BELUM_DILAKSANAKAN');
  });

  it('BELUM_DILAKSANAKAN ketika status valid tapi order_date kosong', () => {
    const r = resolveExecutionStatus({
      metode: 'E-Purchasing',
      ...empty,
      epurchasingRecords: [{ date: null, sourceTable: 'paket_e_purchasing.order_date', code: 'ORD-1', status: 'COMPLETED' }],
    });
    expect(r.status).toBe('BELUM_DILAKSANAKAN');
  });
});

describe('resolveSwakelolaExecutionStatus', () => {
  it('BELUM_DILAKSANAKAN tanpa bukti realisasi', () => {
    expect(resolveSwakelolaExecutionStatus([]).status).toBe('BELUM_DILAKSANAKAN');
  });

  it('SUDAH_DILAKSANAKAN dengan tgl_realisasi valid', () => {
    const r = resolveSwakelolaExecutionStatus([
      { date: '2026-01-10', sourceTable: 'pencatatan_swakelola_realisasi.tgl_realisasi', code: '123' },
    ]);
    expect(r.status).toBe('SUDAH_DILAKSANAKAN');
    expect(r.evidenceDate).toBe('2026-01-10');
  });
});
