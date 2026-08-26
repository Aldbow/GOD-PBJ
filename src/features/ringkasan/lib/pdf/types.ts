import type { Orientation } from './layout';

/**
 * Kosakata blok laporan cetak.
 *
 * Seluruh isi Cetak Laporan dinyatakan sebagai deretan blok ini, dan bukan
 * sebagai perintah menggambar. Pemisahan itu yang membuat laporan bisa diuji:
 * `buildLaporan()` adalah fungsi murni yang menghasilkan `LaporanBlock[]`, jadi
 * pertanyaan "apakah PPK di lingkup Kementerian benar-benar tidak mendapat
 * tabel identitas paket?" bisa dijawab assertion, tanpa browser dan tanpa PDF.
 *
 * Tinggi tiap blok harus bisa dihitung penata letak SEBELUM digambar — itu
 * syarat supaya `Paper.ensure()` bisa menjamin tidak ada blok yang terbelah.
 * Blok yang memang boleh melintasi halaman hanya `table`, karena autoTable
 * memecahnya di batas baris dan mengulang kepala tabelnya sendiri.
 */

export type Tone = 'info' | 'warn' | 'good';

/** Judul seksi bernomor. */
export interface HeadingBlock {
  kind: 'heading';
  /** Nomor urut seksi, mis. '3'. Kosong = judul tanpa nomor. */
  index?: string;
  title: string;
  caption?: string;
}

export interface TextBlock {
  kind: 'text';
  text: string;
  size?: number;
  muted?: boolean;
}

/** Catatan berbingkai — hal yang tidak boleh hilang dari cetakan. */
export interface NoteBlock {
  kind: 'note';
  tone: Tone;
  title?: string;
  text: string;
}

export interface KpiItem {
  label: string;
  value: string;
  /** Baris kecil di bawah nilai. */
  hint?: string;
  /** Warna aksen batang kiri kartu, hex. */
  accent?: string;
}

/** Grid kartu angka utama. Tinggi = jumlah baris x tinggi kartu. */
export interface KpiBlock {
  kind: 'kpi';
  items: KpiItem[];
  /** Kartu per baris. */
  perRow?: number;
}

/** Satu batang kemajuan lebar penuh — capaian realisasi keseluruhan. */
export interface ProgressBlock {
  kind: 'progress';
  label: string;
  pct: number;
  leftCaption: string;
  rightCaption: string;
}

export interface ProporsiItem {
  label: string;
  value: number;
  colorHex: string;
}

/** Donat proporsi + legenda. Satu-satunya blok yang memuat raster. */
export interface ProporsiBlock {
  kind: 'proporsi';
  title: string;
  items: ProporsiItem[];
  centerValue: string;
  centerLabel: string;
}

export interface BarItem {
  label: string;
  /** Nilai terisi (realisasi / paket sudah). */
  value: number;
  /** Nilai penuh (pagu / jumlah paket). */
  total: number;
  valueText: string;
  totalText: string;
  pct: number;
  colorHex: string;
}

/** Deret batang horizontal — digambar vektor, bukan tangkapan chart layar. */
export interface BarListBlock {
  kind: 'barList';
  title: string;
  items: BarItem[];
}

export interface MetricItem {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}

/** Deret ubin angka kecil — ringkasan kurasi & anomali. */
export interface MetricBlock {
  kind: 'metric';
  items: MetricItem[];
}

/** Skor besar + rincian komponen berbatang — dipakai seksi ITKP. */
export interface ScoreBlock {
  kind: 'score';
  /** Lingkup yang skornya dihitung — mis. 'Kementerian (Total)'. */
  scopeLabel: string;
  value: string;
  max: string;
  ratioPct: number;
  predikat?: string;
  komponen: { label: string; score: number; max: number; bobot?: number }[];
}

export interface TableColumn {
  header: string;
  /** Lebar tetap dalam pt; 'auto' membiarkan autoTable membaginya. */
  width?: number | 'auto';
  align?: 'left' | 'right' | 'center';
  /** Warnai isi sel menurut ambang % capaian, seperti badge di layar. */
  tone?: 'capaian';
}

export interface TableBlock {
  kind: 'table';
  title?: string;
  columns: TableColumn[];
  rows: string[][];
  /** Baris total di kaki tabel. */
  foot?: string[];
  /** Index baris yang disorot — satker milik pembaca laporan. */
  highlightRows?: number[];
  /** Warna kotak kecil di kolom pertama, sejajar dengan `rows`. */
  swatches?: (string | null)[];
  /** Paksa halaman ke orientasi ini sebelum tabel digambar. */
  orientation?: Orientation;
  emptyText?: string;
}

export interface SpacerBlock {
  kind: 'spacer';
  height: number;
}

/** Dua blok berdampingan pada satu baris — dipakai donat + batang. */
export interface SplitBlock {
  kind: 'split';
  left: LaporanBlock;
  right: LaporanBlock;
  /** Porsi lebar kolom kiri, 0..1. */
  leftRatio?: number;
}

export type LaporanBlock =
  | HeadingBlock
  | TextBlock
  | NoteBlock
  | KpiBlock
  | ProgressBlock
  | ProporsiBlock
  | BarListBlock
  | MetricBlock
  | ScoreBlock
  | TableBlock
  | SpacerBlock
  | SplitBlock;

// ── Muatan seksi yang datanya dimiliki komponennya sendiri ─────────────────

/**
 * ITKP dan Risiko memuat datanya sendiri secara asinkron di dalam komponennya,
 * jadi angkanya tidak ada di `RingkasanAggregate`. Alih-alih memindahkan dua
 * pemuatan itu ke RingkasanView (perombakan besar yang tidak diminta) atau
 * mengambil ulang datanya saat mencetak (berisiko cetakan berbeda dari layar),
 * kedua komponen MENERBITKAN ringkasan cetaknya lewat `printSections`. Cetakan
 * dengan begitu dijamin memuat angka yang sama persis dengan yang dibaca.
 */
export interface ItkpPrintData {
  headline: string;
  scopeLabel: string;
  componentAOnly: boolean;
  total: number;
  max: number;
  ratioPct: number;
  predikat: string | null;
  komponen: { label: string; score: number; max: number; bobot: number }[];
  indikatorA: { label: string; skor: number; skorMax: number; applicable: boolean }[];
  note: string | null;
}

export interface RisikoPrintData {
  totalPaket: number;
  kategori: { label: string; count: number; pagu: number; colorHex: string }[];
  drivers: { label: string; tinggi: number; sedang: number; rendah: number; lainnya: number }[];
  satkerTinggi: { satker: string; count: number; pagu: number }[];
}

export interface PrintSections {
  itkp: ItkpPrintData | null;
  risiko: RisikoPrintData | null;
}
