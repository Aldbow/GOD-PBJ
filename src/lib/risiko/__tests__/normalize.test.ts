import { describe, it, expect } from 'vitest';
import { splitCompositeIds, primaryId } from '../normalize';

describe('splitCompositeIds', () => {
  it('memecah dua kode RUP dipisah titik koma', () => {
    expect(splitCompositeIds('35830905;35831357')).toEqual(['35830905', '35831357']);
  });

  it('mendukung pemisah koma, line break, dan pipe', () => {
    expect(splitCompositeIds('a,b\nc|d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('trim spasi di sekitar tiap kode', () => {
    expect(splitCompositeIds(' 123 ; 456 ')).toEqual(['123', '456']);
  });

  it('menghilangkan akhiran .0 hasil konversi spreadsheet', () => {
    expect(splitCompositeIds('12345.0;67890.0')).toEqual(['12345', '67890']);
  });

  it('tidak menghapus nol di depan (kd_rup sebagai string)', () => {
    expect(splitCompositeIds('0012345')).toEqual(['0012345']);
  });

  it('kembalikan array kosong untuk input kosong/null/undefined', () => {
    expect(splitCompositeIds('')).toEqual([]);
    expect(splitCompositeIds(null)).toEqual([]);
    expect(splitCompositeIds(undefined)).toEqual([]);
  });

  it('satu kode tunggal tetap jadi array satu elemen', () => {
    expect(splitCompositeIds('35830905')).toEqual(['35830905']);
  });
});

describe('primaryId', () => {
  it('mengambil kode pertama dari field komposit', () => {
    expect(primaryId('35830905;35831357')).toBe('35830905');
  });
  it('null untuk input kosong', () => {
    expect(primaryId('')).toBeNull();
  });
});
