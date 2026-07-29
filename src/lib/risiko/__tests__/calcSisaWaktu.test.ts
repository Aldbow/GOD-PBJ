import { describe, it, expect } from 'vitest';
import { sisaWaktuScore } from '../calcSisaWaktu';

const today = new Date('2026-01-15T00:00:00Z');

function addMonthsUTC(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

describe('sisaWaktuScore — batas bulan kalender (today injected, deterministik)', () => {
  it('skor 0 untuk target lebih dari 3 bulan dari hari ini', () => {
    const target = addMonthsUTC(today, 4);
    expect(sisaWaktuScore(target, today).score).toBe(0);
  });

  it('skor 1 tepat pada batas 3 bulan (tidak > 3 bulan)', () => {
    const target = addMonthsUTC(today, 3);
    expect(sisaWaktuScore(target, today).score).toBe(1);
  });

  it('skor 1 tepat pada batas 2 bulan', () => {
    const target = addMonthsUTC(today, 2);
    expect(sisaWaktuScore(target, today).score).toBe(1);
  });

  it('skor 1 untuk target tepat di bawah batas 3 bulan (masih dalam rentang 2-3 bulan)', () => {
    const threeMonths = addMonthsUTC(today, 3);
    const target = new Date(threeMonths.getTime() - 86_400_000);
    expect(sisaWaktuScore(target, today).score).toBe(1);
  });

  it('skor 2 untuk target tepat di bawah batas 2 bulan (masuk rentang 1-<2 bulan)', () => {
    const twoMonths = addMonthsUTC(today, 2);
    const target = new Date(twoMonths.getTime() - 86_400_000);
    expect(sisaWaktuScore(target, today).score).toBe(2);
  });

  it('skor 2 tepat pada batas 1 bulan', () => {
    const target = addMonthsUTC(today, 1);
    expect(sisaWaktuScore(target, today).score).toBe(2);
  });

  it('skor 3 untuk target kurang dari 1 bulan', () => {
    const oneMonth = addMonthsUTC(today, 1);
    const target = new Date(oneMonth.getTime() - 86_400_000);
    expect(sisaWaktuScore(target, today).score).toBe(3);
  });

  it('skor 3 untuk target hari ini juga (sisa 0 hari)', () => {
    expect(sisaWaktuScore(today, today).score).toBe(3);
  });

  it('skor 3 untuk target yang sudah terlewati, dengan reason menyebut "terlewati"', () => {
    const target = new Date(today.getTime() - 10 * 86_400_000);
    const result = sisaWaktuScore(target, today);
    expect(result.score).toBe(3);
    expect(result.sisaHari).toBeLessThan(0);
    expect(result.reason).toContain('terlewati');
  });
});
