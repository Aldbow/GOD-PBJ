import { describe, it, expect } from 'vitest';
import { isEpurchasingStatusExecuted, EPURCHASING_EXECUTED_STATUSES, sumberDanaScoreOf } from '../mappings';

describe('sumberDanaScoreOf — case-insensitive (data live pakai UPPERCASE)', () => {
  it.each([
    ['RUPIAH MURNI', 0],
    ['Rupiah Murni', 0],
    ['PNBP', 1],
    ['PINJAMAN DALAM NEGERI', 2],
    ['Pinjaman Luar Negeri', 3],
  ] as const)('%s -> skor %i', (raw, expected) => {
    expect(sumberDanaScoreOf(raw)).toBe(expected);
  });

  it('nilai tidak dikenal -> undefined', () => {
    expect(sumberDanaScoreOf('Sumber Asing')).toBeUndefined();
  });
});

describe('EPURCHASING_EXECUTED_STATUSES', () => {
  it('harus persis 4 status sesuai sql/migrations/63_view_epurchasing_status_filter.sql', () => {
    expect([...EPURCHASING_EXECUTED_STATUSES].sort()).toEqual(
      ['COMPLETED', 'ON_ADDENDUM', 'ON_PROCESS', 'PAYMENT_OUTSIDE_SYSTEM'].sort()
    );
  });
});

describe('isEpurchasingStatusExecuted', () => {
  it.each(['ON_PROCESS', 'ON_ADDENDUM', 'COMPLETED', 'PAYMENT_OUTSIDE_SYSTEM'])('%s valid (exact case)', (status) => {
    expect(isEpurchasingStatusExecuted(status)).toBe(true);
  });

  it('normalisasi lowercase tetap dianggap valid', () => {
    expect(isEpurchasingStatusExecuted('on_process')).toBe(true);
  });

  it('normalisasi dengan spasi tersembunyi tetap dianggap valid', () => {
    expect(isEpurchasingStatusExecuted('  COMPLETED  ')).toBe(true);
  });

  it.each(['ON_NEGOTIATION', 'WAITING_PPK_REVIEW', 'WAITING_SELLER_CONFIRMATION', 'CANCELLED', 'DRAFT'])(
    '%s TIDAK valid',
    (status) => {
      expect(isEpurchasingStatusExecuted(status)).toBe(false);
    }
  );

  it('null/undefined/kosong tidak valid', () => {
    expect(isEpurchasingStatusExecuted(null)).toBe(false);
    expect(isEpurchasingStatusExecuted(undefined)).toBe(false);
    expect(isEpurchasingStatusExecuted('')).toBe(false);
  });
});
