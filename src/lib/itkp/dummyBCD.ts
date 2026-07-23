import type { ItkpBCDInput } from './calcBCD';

/**
 * Data B/C/D belum tersambung ke sumber resmi. Sementara memakai satu nilai
 * tetap (bukan simulasi acak per satker) sesuai data yang diberikan user,
 * berlaku sama untuk seluruh satker maupun Kementerian (Total).
 */
const FIXED_BCD_INPUT: ItkpBCDInput = {
  kebutuhanFormasi: 60,
  formasiTerisi: 14,
  penugasan: 'd', // Sebagian JF/Personel Lainnya ditugaskan sebagai Pokja Pemilihan
  renaksi: 'ppk', // Menyusun Renaksi PPK bersertifikat kompetensi saja
  kematangan: 'sembilan_sembilan', // 9/9 Proaktif
  nilaiSpi: 66.12,
  tahunPenilaianSpi: 2026,
};

export function getDummyBCDForUnit(_unitName: string): ItkpBCDInput {
  return FIXED_BCD_INPUT;
}
