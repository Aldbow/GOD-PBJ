import { supabase } from '@/lib/supabase';
import type { ItkpAInput } from './calcA';
import { buildFineSatkerToKpa, normSatker, resolveAfirmasiUnit, resolveEselon1 } from './crosswalk';

export interface ItkpAUnit {
  name: string;
  eselon1: string;
  input: ItkpAInput;
}

export interface ItkpAFetchResult {
  units: ItkpAUnit[];
  kementerian: ItkpAInput;
  unidentifiedValue: number;
  unidentifiedRows: number;
  dataUpdatedAt: string | null;
}

interface AfirmasiRow {
  nama_satuan_kerja: string | null;
  belanja_pengadaan: number | string | null;
  total_rup: number | string | null;
  total_perencanaan_penyedia: number | string | null;
  tender_seleksi: number | string | null;
  epurchasing: number | string | null;
  pengadaan_langsung: number | string | null;
  penunjukan_langsung: number | string | null;
  created_at: string | null;
}

interface MasterDataRow {
  'SATUAN KERJA': string | null;
  SATKER: string | null;
  KPA: string | null;
  'UNIT KERJA': string | null;
}

interface RealisasiRow {
  satker: string | null;
  total?: number | string | null;
  total_transaksional?: number | string | null;
  total_pencatatan?: number | string | null;
}

function emptyInput(): ItkpAInput {
  return {
    totalNilaiBelanjaPBJ: 0,
    totalPengumumanRUP: 0,
    rupPenyedia: 0,
    rupETendering: 0,
    rupEPurchasing: 0,
    rupPengadaanLangsung: 0,
    rupPenunjukanLangsung: 0,
    realisasiETendering: 0,
    realisasiEPurchasing: 0,
    realisasiPLTransaksional: 0,
    realisasiPnLTransaksional: 0,
    pencatatanNonTender: 0,
    pencatatanSwakelola: 0,
  };
}

async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  let all: T[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + limit - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

function addToKementerian(k: ItkpAInput, field: keyof ItkpAInput, value: number) {
  k[field] += Number(value) || 0;
}

export async function fetchItkpAData(): Promise<ItkpAFetchResult> {
  const [afirmasiRows, masterRows] = await Promise.all([
    fetchAll<AfirmasiRow>(
      'data_afirmasi_pdn_perencanaan',
      'nama_satuan_kerja,belanja_pengadaan,total_rup,total_perencanaan_penyedia,tender_seleksi,epurchasing,pengadaan_langsung,penunjukan_langsung,created_at'
    ),
    fetchAll<MasterDataRow>('master_data', '"SATUAN KERJA",SATKER,KPA,"UNIT KERJA"'),
  ]);

  const [tenderRows, epurchRows, plRows, pnlRows, swakelolaRows] = await Promise.all([
    fetchAll<RealisasiRow>('view_dashboard_tender', 'satker,total'),
    fetchAll<RealisasiRow>('view_dashboard_epurchasing_v6', 'satker,total'),
    fetchAll<RealisasiRow>('view_dashboard_pengadaan_langsung', 'satker,total_transaksional,total_pencatatan'),
    fetchAll<RealisasiRow>('view_dashboard_penunjukan_langsung', 'satker,total_transaksional,total_pencatatan'),
    fetchAll<RealisasiRow>('view_dashboard_swakelola_v1', 'satker,total'),
  ]);

  const unitsMap = new Map<string, ItkpAUnit>();
  const afirmasiUnitsNorm: string[] = [];
  let dataUpdatedAt: string | null = null;

  for (const row of afirmasiRows) {
    const displayName = row.nama_satuan_kerja || 'Tidak Diketahui';
    const key = normSatker(displayName);
    afirmasiUnitsNorm.push(key);
    const input = emptyInput();
    input.totalNilaiBelanjaPBJ = Number(row.belanja_pengadaan) || 0;
    input.totalPengumumanRUP = Number(row.total_rup) || 0;
    input.rupPenyedia = Number(row.total_perencanaan_penyedia) || 0;
    input.rupETendering = Number(row.tender_seleksi) || 0;
    input.rupEPurchasing = Number(row.epurchasing) || 0;
    input.rupPengadaanLangsung = Number(row.pengadaan_langsung) || 0;
    input.rupPenunjukanLangsung = Number(row.penunjukan_langsung) || 0;
    const eselon1 = resolveEselon1(key, masterRows);
    unitsMap.set(key, { name: displayName, eselon1, input });

    if (row.created_at && (!dataUpdatedAt || row.created_at > dataUpdatedAt)) {
      dataUpdatedAt = row.created_at;
    }
  }

  const fineSatkerToKpa = buildFineSatkerToKpa(masterRows);

  const kementerian = emptyInput();
  for (const unit of unitsMap.values()) {
    addToKementerian(kementerian, 'totalNilaiBelanjaPBJ', unit.input.totalNilaiBelanjaPBJ);
    addToKementerian(kementerian, 'totalPengumumanRUP', unit.input.totalPengumumanRUP);
    addToKementerian(kementerian, 'rupPenyedia', unit.input.rupPenyedia);
    addToKementerian(kementerian, 'rupETendering', unit.input.rupETendering);
    addToKementerian(kementerian, 'rupEPurchasing', unit.input.rupEPurchasing);
    addToKementerian(kementerian, 'rupPengadaanLangsung', unit.input.rupPengadaanLangsung);
    addToKementerian(kementerian, 'rupPenunjukanLangsung', unit.input.rupPenunjukanLangsung);
  }

  let unidentifiedValue = 0;
  let unidentifiedRows = 0;

  function distribute(satkerName: string | null | undefined, field: keyof ItkpAInput, value: number | string | null | undefined) {
    const v = Number(value) || 0;
    addToKementerian(kementerian, field, v);
    const resolved = resolveAfirmasiUnit(satkerName || '', afirmasiUnitsNorm, fineSatkerToKpa);
    if (resolved) {
      const unit = unitsMap.get(resolved);
      if (unit) unit.input[field] += v;
      return;
    }
    unidentifiedValue += v;
    unidentifiedRows += 1;
  }

  for (const row of tenderRows) distribute(row.satker, 'realisasiETendering', row.total);
  for (const row of epurchRows) distribute(row.satker, 'realisasiEPurchasing', row.total);
  for (const row of plRows) {
    distribute(row.satker, 'realisasiPLTransaksional', row.total_transaksional);
    distribute(row.satker, 'pencatatanNonTender', row.total_pencatatan);
  }
  for (const row of pnlRows) {
    distribute(row.satker, 'realisasiPnLTransaksional', row.total_transaksional);
    distribute(row.satker, 'pencatatanNonTender', row.total_pencatatan);
  }
  for (const row of swakelolaRows) distribute(row.satker, 'pencatatanSwakelola', row.total);

  const units = Array.from(unitsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return { units, kementerian, unidentifiedValue, unidentifiedRows, dataUpdatedAt };
}
