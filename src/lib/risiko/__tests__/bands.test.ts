import { describe, it, expect } from 'vitest';
import { paguBand, pickKategori, KATEGORI_BANDS_PENYEDIA, KATEGORI_BANDS_SWAKELOLA } from '../bands';

describe('paguBand', () => {
  it('skor 0 tepat di bawah Rp200 juta', () => {
    expect(paguBand(199_999_999).score).toBe(0);
  });
  it('skor 1 tepat pada Rp200 juta (batas bawah inklusif)', () => {
    expect(paguBand(200_000_000).score).toBe(1);
  });
  it('skor 1 tepat di bawah Rp1 miliar', () => {
    expect(paguBand(999_999_999).score).toBe(1);
  });
  it('skor 2 tepat pada Rp1 miliar', () => {
    expect(paguBand(1_000_000_000).score).toBe(2);
  });
  it('skor 2 tepat di bawah Rp5 miliar', () => {
    expect(paguBand(4_999_999_999).score).toBe(2);
  });
  it('skor 3 tepat pada Rp5 miliar', () => {
    expect(paguBand(5_000_000_000).score).toBe(3);
  });
  it('skor 3 untuk pagu jauh di atas Rp5 miliar', () => {
    expect(paguBand(50_000_000_000).score).toBe(3);
  });
  it('skor 0 untuk pagu nol', () => {
    expect(paguBand(0).score).toBe(0);
  });
});

describe('pickKategori (Penyedia, maks 18)', () => {
  it.each([
    [0, 'RENDAH'],
    [6, 'RENDAH'],
    [7, 'SEDANG'],
    [12, 'SEDANG'],
    [13, 'TINGGI'],
    [18, 'TINGGI'],
  ] as const)('skor %i -> %s', (score, expected) => {
    expect(pickKategori(score, KATEGORI_BANDS_PENYEDIA)).toBe(expected);
  });
});

describe('pickKategori (Swakelola, maks 12)', () => {
  it.each([
    [0, 'RENDAH'],
    [4, 'RENDAH'],
    [5, 'SEDANG'],
    [8, 'SEDANG'],
    [9, 'TINGGI'],
    [12, 'TINGGI'],
  ] as const)('skor %i -> %s', (score, expected) => {
    expect(pickKategori(score, KATEGORI_BANDS_SWAKELOLA)).toBe(expected);
  });
});
