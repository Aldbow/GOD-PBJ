export type RiskLevel = 'tinggi' | 'sedang' | 'rendah';

export interface Package {
  id: string;
  nama: string;
  nilai: number;
  spse: string;
  sirup: boolean;
  realisasi: number;
  risiko: RiskLevel;
  pic: string;
  satkerId: string;
  // Detail fields
  deskripsi?: string;
  timeline?: { date: string, event: string }[];
  alasanRisiko?: string;
}

export interface Satker {
  id: string;
  name: string;
  packages: Package[];
}

export interface PPK {
  id: string;
  name: string;
  satkerId: string;
  satkerName: string;
}

export interface DashboardMetrics {
  reviuRUP: number;
  pemilihanPenyedia: number;
  kematanganUKPBJ: number;
  sdmPBJ: number;
  targetITKP: number;
  skorITKP: number;
}

export interface MasterDataPN {
  id: string;
  No: string;
  Unit: string;
  'Kode RO': string;
  'Nama RO': string;
  Satuan: string;
  'Target Volume (Capaian)': string;
  'Pagu (Capaian)': string;
  'Realisasi Anggaran': string;
  'Realisasi Volume': string;
  '% Capaian Anggaran': string;
  '% Capaian Fisik/Volume': string;
  'Selisih Pagu': string;
  Status: string;
}
