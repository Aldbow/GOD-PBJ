import { describe, it, expect } from 'vitest';
import { revisiScore } from '../calcRevisi';
import type { RupHistoryEntry } from '@/lib/paket/rupHistory';

function entry(kdLama: string, kdBaru: string): RupHistoryEntry {
  return { jenis_revisi: 'Kaji Ulang', tgl_kaji_ulang: '2026-01-01T00:00:00Z', kd_rup_lama: kdLama, kd_rup_baru: kdBaru, alasan_kajiulang: 'test' };
}

describe('revisiScore', () => {
  it('0 revisi -> skor 0', () => {
    const r = revisiScore([]);
    expect(r.count).toBe(0);
    expect(r.score).toBe(0);
    expect(r.cycleDetected).toBe(false);
  });

  it('1 revisi -> skor 1', () => {
    const r = revisiScore([entry('1001', '2001')]);
    expect(r.count).toBe(1);
    expect(r.score).toBe(1);
  });

  it('2 revisi -> skor 2', () => {
    const r = revisiScore([entry('1001', '2001'), entry('2001', '3001')]);
    expect(r.count).toBe(2);
    expect(r.score).toBe(2);
  });

  it('lebih dari 2 revisi -> skor 3', () => {
    const r = revisiScore([entry('1001', '2001'), entry('2001', '3001'), entry('3001', '4001')]);
    expect(r.count).toBe(3);
    expect(r.score).toBe(3);
  });

  it('banyak revisi (>3) tetap skor 3, tidak melebihi maksimum', () => {
    const chain = [entry('1', '2'), entry('2', '3'), entry('3', '4'), entry('4', '5'), entry('5', '6')];
    expect(revisiScore(chain).score).toBe(3);
  });

  it('mendeteksi siklus ketika kd_rup_baru muncul berulang pada rantai sintetis', () => {
    // Rantai buatan (bukan hasil RPC sungguhan) untuk menguji heuristik deteksi siklus itu sendiri.
    const chain = [entry('1001', '2001'), entry('2001', '3001'), entry('3001', '2001')];
    expect(revisiScore(chain).cycleDetected).toBe(true);
  });

  it('tidak mendeteksi siklus pada rantai linear normal', () => {
    const chain = [entry('1001', '2001'), entry('2001', '3001')];
    expect(revisiScore(chain).cycleDetected).toBe(false);
  });
});
