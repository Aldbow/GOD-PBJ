import type { BadgeVariant } from '@/components/ui/Badge';
import type { RiskKategori } from './types';

/** Kategori risiko -> varian Badge. Nama varian sudah cocok persis dengan skema warna yang diminta
 * (rendah=teal/hijau, sedang=amber, tinggi=merah), jadi tidak perlu palet baru untuk badge. */
export function kategoriVariant(kategori: RiskKategori): BadgeVariant {
  switch (kategori) {
    case 'RENDAH':
      return 'rendah';
    case 'SEDANG':
      return 'sedang';
    case 'TINGGI':
      return 'tinggi';
    case 'DATA_TIDAK_LENGKAP':
    default:
      return 'default';
  }
}
