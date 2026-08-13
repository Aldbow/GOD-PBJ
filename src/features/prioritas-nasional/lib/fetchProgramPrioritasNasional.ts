import { supabase } from '@/lib/supabase';
import type { MatchStatus, ProgramPrioritasRow } from './types';

const PAGE_SIZE = 1000;
// Batas aman untuk .in() per query — kd_rup master_data_ro dijadikan chunk
// supaya URL query tidak meledak kalau jumlah paket PN sudah ribuan.
const IN_CHUNK_SIZE = 200;

interface MasterDataRoDb {
  id: string;
  no: string | null;
  kd_rup: string | null;
  nama_paket: string | null;
  nama_ro: string | null;
  nilai_paket: string | null;
  skema: string | null;
  jenis_pengadaan: string | null;
  lokasi: string | null;
  waktu_pengadaan: string | null;
  kendala: string | null;
  mitigasi: string | null;
  realisasi: string | null;
  created_at: string;
}

interface SpseMatch {
  nama_satker: string | null;
  nama_ppk: string | null;
  pagu: number | null;
  status_umumkan_rup: string | null;
  tahun_anggaran: number | null;
  metode_pengadaan_spse: string | null;
}

/** nilai_paket di master_data_ro adalah TEXT hasil impor CSV — bisa polos ("32500000000") atau berformat ID ("1.234.567,50"). */
function parseIdNumber(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/[^0-9.,-]/g, '');
  if (!cleaned) return 0;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchAllMasterDataRo(): Promise<MasterDataRoDb[]> {
  let all: MasterDataRoDb[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('master_data_ro')
      .select('id, no, kd_rup, nama_paket, nama_ro, nilai_paket, skema, jenis_pengadaan, lokasi, waktu_pengadaan, kendala, mitigasi, realisasi, created_at')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data as MasterDataRoDb[]);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function fetchPenyediaMatches(kdRupList: number[]): Promise<Map<number, SpseMatch>> {
  const map = new Map<number, SpseMatch>();
  for (const batch of chunk(kdRupList, IN_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('api_paket_penyedia_terumumkan')
      .select('kd_rup, nama_satker, nama_ppk, pagu, status_umumkan_rup, tahun_anggaran, metode_pengadaan')
      .in('kd_rup', batch);
    if (error) throw error;
    for (const row of data || []) {
      map.set(row.kd_rup, {
        nama_satker: row.nama_satker,
        nama_ppk: row.nama_ppk,
        pagu: row.pagu,
        status_umumkan_rup: row.status_umumkan_rup,
        tahun_anggaran: row.tahun_anggaran,
        metode_pengadaan_spse: row.metode_pengadaan,
      });
    }
  }
  return map;
}

async function fetchSwakelolaMatches(kdRupList: number[]): Promise<Map<number, SpseMatch>> {
  const map = new Map<number, SpseMatch>();
  for (const batch of chunk(kdRupList, IN_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('api_paket_swakelola_terumumkan')
      .select('kd_rup, nama_satker, nama_ppk, pagu, status_umumkan_rup, tahun_anggaran')
      .in('kd_rup', batch);
    if (error) throw error;
    for (const row of data || []) {
      map.set(row.kd_rup, {
        nama_satker: row.nama_satker,
        nama_ppk: row.nama_ppk,
        pagu: row.pagu,
        status_umumkan_rup: row.status_umumkan_rup,
        tahun_anggaran: row.tahun_anggaran,
        metode_pengadaan_spse: 'Swakelola',
      });
    }
  }
  return map;
}

/**
 * Memuat seluruh baris master_data_ro (paket Program Prioritas Nasional) dan
 * menggabungkannya runtime ke api_paket_penyedia_terumumkan /
 * api_paket_swakelola_terumumkan lewat kd_rup — tidak ada foreign key di
 * database, jadi kecocokan divalidasi di sini, bukan dijamin skema.
 *
 * kd_rup di master_data_ro adalah TEXT hasil impor CSV (kolom sumber "Kode/ID
 * paket"), sedangkan di kedua tabel SPSE bertipe number. Baris dengan kd_rup
 * kosong/tidak valid tetap disertakan dengan match_status 'tidak_ditemukan'
 * supaya data tidak hilang diam-diam.
 */
export async function fetchProgramPrioritasNasional(): Promise<ProgramPrioritasRow[]> {
  const masterRows = await fetchAllMasterDataRo();

  const kdRupNumericSet = new Set<number>();
  for (const row of masterRows) {
    const n = Number(row.kd_rup);
    if (row.kd_rup && Number.isFinite(n) && n > 0) kdRupNumericSet.add(n);
  }
  const kdRupList = Array.from(kdRupNumericSet);

  const [penyediaMap, swakelolaMap] = kdRupList.length
    ? await Promise.all([fetchPenyediaMatches(kdRupList), fetchSwakelolaMatches(kdRupList)])
    : [new Map<number, SpseMatch>(), new Map<number, SpseMatch>()];

  return masterRows.map((row) => {
    const kdRupNumeric = Number(row.kd_rup);
    const isValidKdRup = Boolean(row.kd_rup) && Number.isFinite(kdRupNumeric);
    const penyedia = isValidKdRup ? penyediaMap.get(kdRupNumeric) : undefined;
    const swakelola = !penyedia && isValidKdRup ? swakelolaMap.get(kdRupNumeric) : undefined;
    const match = penyedia || swakelola;
    const match_status: MatchStatus = penyedia ? 'penyedia' : swakelola ? 'swakelola' : 'tidak_ditemukan';

    return {
      id: row.id,
      no: row.no,
      kd_rup: row.kd_rup,
      nama_paket: row.nama_paket,
      nama_ro: row.nama_ro,
      nilai_paket: parseIdNumber(row.nilai_paket),
      skema: row.skema,
      jenis_pengadaan: row.jenis_pengadaan,
      lokasi: row.lokasi,
      waktu_pengadaan: row.waktu_pengadaan,
      kendala: row.kendala,
      mitigasi: row.mitigasi,
      realisasi: row.realisasi,
      match_status,
      nama_satker: match?.nama_satker ?? null,
      nama_ppk: match?.nama_ppk ?? null,
      pagu_spse: match?.pagu ?? null,
      status_umumkan_rup: match?.status_umumkan_rup ?? null,
      tahun_anggaran: match?.tahun_anggaran ?? null,
      metode_pengadaan_spse: match?.metode_pengadaan_spse ?? null,
      created_at: row.created_at,
    };
  });
}
