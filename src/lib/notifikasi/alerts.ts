import { supabase } from '@/lib/supabase';
import { anomaliOf } from '@/lib/anomali';

/**
 * Sumber tunggal untuk "notifikasi paket PPK" — dipakai lonceng di Topbar
 * (PpkNotificationBell) dan halaman /notifikasi (NotifikasiView). Keduanya harus
 * memakai definisi yang sama, kalau tidak jumlah di badge akan berbeda dari isi
 * halaman.
 *
 * Notifikasi digabung dari DUA sumber yang berbeda bentuk:
 *   1. risiko_pengadaan            -> kategori risiko + status pelaksanaan
 *   2. view_dashboard_gabungan_satker -> anomali realisasi + hasil kurasi AI
 * Satu paket bisa muncul di keduanya, jadi hasilnya digabung per kode RUP.
 */

/* ------------------------------------------------------------------ */
/* Jenis notifikasi                                                     */
/* ------------------------------------------------------------------ */

export type AlertType =
  | 'risiko_tinggi'
  | 'belum_dilaksanakan'
  | 'anomali_tanpa_rup'
  | 'anomali_lebih_pagu'
  | 'tidak_akurat'
  | 'data_tidak_lengkap'
  | 'risiko_sedang';

export type AlertTone = 'danger' | 'warning' | 'info';

export interface AlertTypeMeta {
  label: string;
  tone: AlertTone;
  /** Makin tinggi makin mendesak; menentukan urutan daftar dan isi badge. */
  severity: number;
  description: string;
}

export const ALERT_TYPE_META: Record<AlertType, AlertTypeMeta> = {
  risiko_tinggi: {
    label: 'Risiko Tinggi',
    tone: 'danger',
    severity: 5,
    description: 'Skor risiko paket masuk kategori tinggi.',
  },
  anomali_tanpa_rup: {
    label: 'Realisasi Tanpa RUP',
    tone: 'danger',
    severity: 4,
    description: 'Ada realisasi tercatat tanpa RUP yang terumumkan di SIRUP.',
  },
  anomali_lebih_pagu: {
    label: 'Realisasi > Pagu',
    tone: 'danger',
    severity: 4,
    description: 'Nilai realisasi melampaui pagu yang direncanakan.',
  },
  belum_dilaksanakan: {
    label: 'Belum Dilaksanakan',
    tone: 'warning',
    severity: 4,
    description: 'Belum ditemukan bukti pelaksanaan untuk paket ini.',
  },
  tidak_akurat: {
    label: 'Kurasi Tidak Akurat',
    tone: 'warning',
    severity: 3,
    description: 'Kurasi AI menandai data paket ini belum akurat.',
  },
  data_tidak_lengkap: {
    label: 'Data Tidak Lengkap',
    tone: 'info',
    severity: 2,
    description: 'Skor risiko belum bisa dihitung penuh karena data kurang.',
  },
  risiko_sedang: {
    label: 'Risiko Sedang',
    tone: 'info',
    severity: 1,
    description: 'Skor risiko paket masuk kategori sedang.',
  },
};

/** Urutan tampil yang konsisten di semua daftar (paling mendesak dulu). */
export const ALERT_TYPE_ORDER = (Object.keys(ALERT_TYPE_META) as AlertType[]).sort(
  (a, b) => ALERT_TYPE_META[b].severity - ALERT_TYPE_META[a].severity
);

/**
 * Ambang "perlu tindakan" — mencakup risiko tinggi, dua jenis anomali, belum
 * dilaksanakan, dan kurasi tidak akurat. Notifikasi di bawah ambang ini (risiko
 * sedang, data tidak lengkap) tetap tampil di halaman /notifikasi tapi TIDAK
 * menaikkan angka di badge lonceng — kalau ikut dihitung, badge seorang PPK
 * dengan ratusan paket akan permanen "99+" dan berhenti berarti apa pun.
 */
export const ACTION_SEVERITY_THRESHOLD = 3;

export function needsAction(type: AlertType): boolean {
  return ALERT_TYPE_META[type].severity >= ACTION_SEVERITY_THRESHOLD;
}

/* ------------------------------------------------------------------ */
/* Bentuk data gabungan                                                 */
/* ------------------------------------------------------------------ */

export interface NotifikasiItem {
  kd_rup: string;
  nama_paket: string | null;
  satker: string | null;
  pagu: number | null;
  /** Nilai realisasi dari view gabungan; null bila paket belum punya baris realisasi. */
  realisasi: number | null;
  jenis_paket: string | null;
  metode_pengadaan: string | null;
  kategori: string | null;
  execution_status: string | null;
  status_kurasi: string | null;
  catatan_kurasi: string | null;
  types: AlertType[];
  /** Severity tertinggi di antara `types` — dipakai untuk mengurutkan. */
  severity: number;
}

export function hasActionableType(item: NotifikasiItem): boolean {
  return item.types.some(needsAction);
}

/* ------------------------------------------------------------------ */
/* Pengambilan data                                                     */
/* ------------------------------------------------------------------ */

interface RisikoRow {
  kd_rup: string;
  nama_paket: string | null;
  satker: string | null;
  pagu: number | null;
  execution_status: string | null;
  kategori: string | null;
  jenis_paket: string | null;
  metode_pengadaan: string | null;
}

interface GabunganRow {
  kd_rup: string;
  rup_name: string | null;
  satker: string | null;
  metode_pengadaan: string | null;
  pagu: number | null;
  total: number | null;
  status_kurasi: string | null;
  catatan_kurasi: string | null;
  is_from_sirup: boolean | null;
}

const RISIKO_COLUMNS =
  'kd_rup, nama_paket, satker, pagu, execution_status, kategori, jenis_paket, metode_pengadaan';
const GABUNGAN_COLUMNS =
  'kd_rup, rup_name, satker, metode_pengadaan, pagu, total, status_kurasi, catatan_kurasi, is_from_sirup';

const PAGE_SIZE = 1000;

/** Supabase membatasi 1000 baris per query — ambil seluruhnya via paginasi
 * (pola sama seperti fetchGabunganRows di features/ringkasan/lib/ringkasanData.ts). */
async function fetchAll<T>(table: string, columns: string, ppkName: string): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('nama_ppk', ppkName)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as T[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

/**
 * kd_rup bisa berupa gabungan beberapa kode ("a;b") untuk paket yang punya
 * beberapa RUP dalam satu transaksi. Halaman Realisasi mencari per satu kode,
 * dan penggabungan dua sumber di sini juga memakai kode pertama sebagai kunci.
 */
export function primaryRupCode(kdRup: string): string {
  return String(kdRup).split(';')[0].trim();
}

const num = (v: number | null | undefined): number => Number(v) || 0;

/**
 * Satu kode RUP bisa muncul lebih dari sekali di view gabungan (mis. satu paket
 * e-purchasing dengan banyak order_id, atau RUP yang sama muncul di dua cabang
 * UNION). Realisasi dijumlahkan — pola yang sama dipakai /api/paket — supaya
 * pembandingan "realisasi > pagu" tidak salah pecah per baris.
 */
function mergeGabungan(rows: GabunganRow[]): Map<string, GabunganRow> {
  const byRup = new Map<string, GabunganRow>();

  for (const row of rows) {
    const key = primaryRupCode(row.kd_rup);
    const prev = byRup.get(key);
    if (!prev) {
      byRup.set(key, { ...row });
      continue;
    }
    prev.total = num(prev.total) + num(row.total);
    prev.pagu = Math.max(num(prev.pagu), num(row.pagu));
    // Cukup satu baris tanpa pasangan RUP untuk menandai anomali tanpa_rup.
    if (row.is_from_sirup === false) prev.is_from_sirup = false;
    else if (prev.is_from_sirup == null) prev.is_from_sirup = row.is_from_sirup;
    if (row.status_kurasi === 'Tidak Akurat') {
      prev.status_kurasi = 'Tidak Akurat';
      prev.catatan_kurasi = prev.catatan_kurasi ?? row.catatan_kurasi;
    }
    prev.rup_name = prev.rup_name ?? row.rup_name;
    prev.satker = prev.satker ?? row.satker;
    prev.metode_pengadaan = prev.metode_pengadaan ?? row.metode_pengadaan;
  }

  return byRup;
}

function typesFromRisiko(row: RisikoRow): AlertType[] {
  const types: AlertType[] = [];
  if (row.execution_status === 'BELUM_DILAKSANAKAN') types.push('belum_dilaksanakan');
  if (row.kategori === 'TINGGI') types.push('risiko_tinggi');
  else if (row.kategori === 'SEDANG') types.push('risiko_sedang');
  else if (row.kategori === 'DATA_TIDAK_LENGKAP') types.push('data_tidak_lengkap');
  // Kategori RENDAH sengaja tidak dijadikan notifikasi: paket berisiko rendah
  // adalah kondisi normal, dan jumlahnya akan menenggelamkan yang lain. Paket
  // RENDAH tetap muncul bila punya alasan lain (belum dilaksanakan, anomali,
  // atau kurasi tidak akurat).
  return types;
}

function typesFromGabungan(row: GabunganRow): AlertType[] {
  const types: AlertType[] = [];
  // anomaliOf adalah definisi yang sama dipakai seluruh dashboard Realisasi &
  // Ringkasan — jangan diduplikasi di sini supaya angkanya tidak pernah beda.
  for (const jenis of anomaliOf(row)) {
    types.push(jenis === 'tanpa_rup' ? 'anomali_tanpa_rup' : 'anomali_lebih_pagu');
  }
  if (row.status_kurasi === 'Tidak Akurat') types.push('tidak_akurat');
  return types;
}

function maxSeverity(types: AlertType[]): number {
  return types.reduce((max, t) => Math.max(max, ALERT_TYPE_META[t].severity), -1);
}

function sortTypes(types: AlertType[]): AlertType[] {
  return Array.from(new Set(types)).sort(
    (a, b) => ALERT_TYPE_META[b].severity - ALERT_TYPE_META[a].severity
  );
}

/**
 * Seluruh notifikasi milik satu PPK, terurut dari yang paling mendesak lalu
 * dari pagu terbesar.
 */
export async function fetchPpkNotifikasi(ppkName: string): Promise<NotifikasiItem[]> {
  const [risikoRows, gabunganRows] = await Promise.all([
    fetchAll<RisikoRow>('risiko_pengadaan', RISIKO_COLUMNS, ppkName),
    fetchAll<GabunganRow>('view_dashboard_gabungan_satker', GABUNGAN_COLUMNS, ppkName),
  ]);

  const gabungan = mergeGabungan(gabunganRows);
  const items = new Map<string, NotifikasiItem>();

  for (const row of risikoRows) {
    const key = primaryRupCode(row.kd_rup);
    items.set(key, {
      kd_rup: row.kd_rup,
      nama_paket: row.nama_paket,
      satker: row.satker,
      pagu: row.pagu,
      realisasi: null,
      jenis_paket: row.jenis_paket,
      metode_pengadaan: row.metode_pengadaan,
      kategori: row.kategori,
      execution_status: row.execution_status,
      status_kurasi: null,
      catatan_kurasi: null,
      types: typesFromRisiko(row),
      severity: 0,
    });
  }

  // Lapisi dengan anomali & kurasi. Paket yang hanya ada di view realisasi
  // (belum masuk risiko_pengadaan) tetap ikut muncul sebagai notifikasi.
  for (const [key, row] of gabungan) {
    const extraTypes = typesFromGabungan(row);
    const existing = items.get(key);

    if (existing) {
      existing.types = existing.types.concat(extraTypes);
      existing.realisasi = num(row.total);
      existing.status_kurasi = row.status_kurasi;
      existing.catatan_kurasi = row.catatan_kurasi;
      existing.pagu = existing.pagu ?? row.pagu;
      existing.metode_pengadaan = existing.metode_pengadaan ?? row.metode_pengadaan;
      continue;
    }

    if (extraTypes.length === 0) continue;

    items.set(key, {
      kd_rup: row.kd_rup,
      nama_paket: row.rup_name,
      satker: row.satker,
      pagu: row.pagu,
      realisasi: num(row.total),
      jenis_paket: row.metode_pengadaan === 'Swakelola' ? 'Swakelola' : null,
      metode_pengadaan: row.metode_pengadaan,
      kategori: null,
      execution_status: null,
      status_kurasi: row.status_kurasi,
      catatan_kurasi: row.catatan_kurasi,
      types: extraTypes,
      severity: 0,
    });
  }

  const result: NotifikasiItem[] = [];
  for (const item of items.values()) {
    item.types = sortTypes(item.types);
    if (item.types.length === 0) continue;
    item.severity = maxSeverity(item.types);
    result.push(item);
  }

  return result.sort(
    (a, b) =>
      b.severity - a.severity ||
      b.types.length - a.types.length ||
      num(b.pagu) - num(a.pagu)
  );
}

/* ------------------------------------------------------------------ */
/* Pemetaan paket -> halaman Realisasi                                  */
/* ------------------------------------------------------------------ */

export const RISIKO_PATH = '/risiko-pengadaan';
export const NOTIFIKASI_PATH = '/notifikasi';

/**
 * Nilai metode_pengadaan di bawah ini persis seperti yang tersimpan di database
 * (lihat METODE_SCORE di lib/risiko/mappings.ts — string-nya sudah dikonfirmasi
 * sama dengan yang dipakai view_dashboard_*.sql).
 */
const METODE_TO_REALISASI: Record<string, { href: string; label: string }> = {
  Tender: { href: '/tender', label: 'Realisasi Tender' },
  Seleksi: { href: '/tender', label: 'Realisasi Tender' },
  'Tender Cepat': { href: '/tender', label: 'Realisasi Tender' },
  'E-Purchasing': { href: '/epurchasing', label: 'Realisasi E-Purchasing' },
  'Pengadaan Langsung': { href: '/pengadaan-langsung', label: 'Realisasi Pengadaan Langsung' },
  'Penunjukan Langsung': { href: '/penunjukan-langsung', label: 'Realisasi Penunjukan Langsung' },
  Swakelola: { href: '/swakelola', label: 'Realisasi Swakelola' },
};

const SWAKELOLA_TARGET = METODE_TO_REALISASI.Swakelola;

/** Fallback untuk metode yang bukti pelaksanaannya hanya lewat pencatatan
 * (Dikecualikan, Pembayaran untuk Kontrak Tahun Jamak) — tidak punya halaman
 * Realisasi sendiri, jadi diarahkan kembali ke Risiko Pengadaan. */
const FALLBACK_TARGET = { href: RISIKO_PATH, label: 'Risiko Pengadaan' };

/**
 * Halaman Realisasi yang sesuai untuk sebuah paket, lengkap dengan filter
 * PPK (p) dan pencarian kode RUP (q) — sesuai kontrak useOrgFilters yang
 * dipakai seluruh view Realisasi.
 */
export function realisasiTargetFor(
  row: Pick<NotifikasiItem, 'kd_rup' | 'jenis_paket' | 'metode_pengadaan'>,
  ppkName: string
): { href: string; label: string; isFallback: boolean } {
  const target =
    row.jenis_paket === 'Swakelola'
      ? SWAKELOLA_TARGET
      : (row.metode_pengadaan && METODE_TO_REALISASI[row.metode_pengadaan]) || FALLBACK_TARGET;

  const params = new URLSearchParams();
  if (ppkName) params.set('p', ppkName);
  params.set('q', primaryRupCode(row.kd_rup));

  return {
    href: `${target.href}?${params.toString()}`,
    label: target.label,
    isFallback: target === FALLBACK_TARGET,
  };
}
