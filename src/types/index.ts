export type RiskLevel = 'tinggi' | 'sedang' | 'rendah';

export type Role = 'admin' | 'sekjend' | 'ppk';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  ppk_name: string | null;
  eselon1: string | null;
  satker: string | null;
  is_active: boolean;
}

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
  metode?: string;
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
