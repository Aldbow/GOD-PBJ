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
