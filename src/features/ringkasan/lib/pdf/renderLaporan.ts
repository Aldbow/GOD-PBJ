import type { jsPDF } from 'jspdf';
import type { RowInput, CellDef, UserOptions } from 'jspdf-autotable';
import { INK, capaianInk, hexToRgb, tint, type RGB } from './ink';
import { Paper, type TextOptions } from './layout';
import { renderDonutPng } from './donut';
import { sanitizePdfText } from './pdfText';
import type {
  BarListBlock,
  HeadingBlock,
  KpiBlock,
  LaporanBlock,
  MetricBlock,
  NoteBlock,
  ProgressBlock,
  ProporsiBlock,
  ScoreBlock,
  SplitBlock,
  TableBlock,
  TextBlock,
  Tone,
} from './types';
import type { Laporan } from './buildLaporan';

/**
 * Penerjemah `LaporanBlock[]` menjadi halaman A4.
 *
 * Kontrak yang dipegang setiap blok di sini: `measure()` harus mengembalikan
 * tinggi yang PERSIS sama dengan yang nanti dipakai `draw()`. Dari sanalah
 * jaminan "tidak ada seksi yang terpotong" berasal — penata letak menanyakan
 * tinggi dulu, memastikan ruangnya cukup lewat `Paper.ensure()`, baru
 * menggambar. Kalau sebuah blok menggambar lebih tinggi daripada yang ia
 * ukur, jaminan itu bocor; jadi keduanya selalu ditulis berdampingan.
 *
 * Satu-satunya blok yang boleh melintasi halaman adalah `table`, karena
 * autoTable memecahnya di batas baris — bukan di tengah baris — dan mengulang
 * kepala tabel di tiap halaman.
 */

type AutoTable = (doc: jsPDF, options: UserOptions) => void;

export interface RenderContext {
  /** Donat sudah dirender lebih dulu supaya `draw()` tetap sinkron. */
  donuts: Map<ProporsiBlock, string | null>;
  autoTable: AutoTable;
}

// ── Ukuran baku ────────────────────────────────────────────────────────────

const HEADING_TITLE = 12.5;
const HEADING_CAPTION = 8.5;
const KPI_H = 54;
const KPI_GAP = 9;
const METRIC_H = 46;
const METRIC_GAP = 8;
const PROGRESS_H = 44;
const BAR_ROW = 25;
const PANEL_TITLE_H = 15;
const DONUT_PT = 108;
const LEGEND_ROW = 12.5;
const NOTE_PAD = 9;
const TABLE_TITLE_H = 16;
/** Jarak teks judul seksi dari balok aksennya. */
const HEADING_INDENT = 11;
/** Ruang minimal yang harus ikut serta di bawah judul seksi/tabel. */
const KEEP_WITH_NEXT = 96;
/**
 * Lebar minimal yang wajib tersisa untuk SETIAP kolom `auto`.
 *
 * ±120pt memuat dua kata terpanjang bahasa Indonesia pada 8pt. Di bawah itu
 * `splitTextToSize` mulai kehabisan tempat memenggal di spasi, dan kata yang
 * tidak muat digambar utuh sehingga menjulur keluar selnya.
 */
const AUTO_COL_MIN = 120;

const GAP_AFTER: Record<LaporanBlock['kind'], number> = {
  heading: 10,
  text: 8,
  note: 14,
  kpi: 14,
  progress: 16,
  proporsi: 14,
  barList: 14,
  metric: 14,
  score: 16,
  table: 20,
  spacer: 0,
  split: 16,
};

const TONE_INK: Record<Tone, RGB> = {
  info: [29, 78, 216], // blue-700
  warn: [180, 83, 9], // amber-700
  good: [21, 128, 61], // green-700
};

// ── Primitif teks berkoordinat bebas ───────────────────────────────────────

/** Tulis teks yang membungkus pada (x, y) selebar w; kembalikan tingginya. */
function textBlock(p: Paper, text: string, x: number, y: number, w: number, o: TextOptions = {}): number {
  const size = o.size ?? 9.5;
  const leading = o.leading ?? 1.35;
  const rows = p.wrap(text, { ...o, width: w });
  const anchor = o.align === 'center' ? x + w / 2 : o.align === 'right' ? x + w : x;
  p.doc.text(rows, anchor, y + size * 0.82, { align: o.align ?? 'left', lineHeightFactor: leading });
  return rows.length * size * leading;
}

function heightOf(p: Paper, text: string, w: number, o: TextOptions = {}): number {
  const size = o.size ?? 9.5;
  return p.wrap(text, { ...o, width: w }).length * size * (o.leading ?? 1.35);
}

/** Potong satu baris agar muat di lebar w, dengan elipsis. */
function ellipsize(p: Paper, text: string, w: number, o: TextOptions = {}): string {
  if (p.widthOf(text, o) <= w) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (p.widthOf(`${text.slice(0, mid)}…`, o) <= w) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo)}…`;
}

// ── Blok: judul seksi ──────────────────────────────────────────────────────

/**
 * Geometri judul seksi, dihitung SEKALI dan dipakai bersama measure & draw.
 *
 * Sebelumnya keduanya menghitung sendiri-sendiri dan membungkus keterangan pada
 * lebar yang berbeda, sehingga judul dengan keterangan panjang diukur lebih
 * pendek daripada yang digambar — persis jenis selisih yang berujung pada
 * konten yang tertimpa di kaki halaman.
 */
function headingGeometry(p: Paper, b: HeadingBlock, w: number) {
  const inner = w - HEADING_INDENT;
  const label = b.index ? `${b.index}.  ${b.title}` : b.title;
  const titleH = heightOf(p, label, inner, { size: HEADING_TITLE, style: 'bold', leading: 1.25 });
  const captionH = b.caption ? 3 + heightOf(p, b.caption, inner, { size: HEADING_CAPTION }) : 0;
  return { inner, label, titleH, captionH, ruleY: titleH + captionH + 5, total: titleH + captionH + 7 };
}

function measureHeading(p: Paper, b: HeadingBlock, w: number): number {
  return headingGeometry(p, b, w).total;
}

function drawHeading(p: Paper, b: HeadingBlock, x: number, y: number, w: number): number {
  const g = headingGeometry(p, b, w);
  // Balok aksen setinggi judul — penanda awal seksi yang terbaca sekilas saat
  // orang membalik halaman cetakan.
  p.rect(x, y + 1, 3, Math.max(g.titleH - 3, 4), INK.accent, 1.5);
  textBlock(p, g.label, x + HEADING_INDENT, y, g.inner, {
    size: HEADING_TITLE,
    style: 'bold',
    color: INK.heading,
    leading: 1.25,
  });
  if (b.caption) {
    textBlock(p, b.caption, x + HEADING_INDENT, y + g.titleH + 3, g.inner, {
      size: HEADING_CAPTION,
      color: INK.muted,
    });
  }
  p.doc.setDrawColor(...INK.rule);
  p.doc.setLineWidth(0.6);
  p.doc.line(x, y + g.ruleY, x + w, y + g.ruleY);
  return g.total;
}

// ── Blok: paragraf & catatan ───────────────────────────────────────────────

function measureText(p: Paper, b: TextBlock, w: number): number {
  return heightOf(p, b.text, w, { size: b.size ?? 9 });
}

function drawText(p: Paper, b: TextBlock, x: number, y: number, w: number): number {
  return textBlock(p, b.text, x, y, w, { size: b.size ?? 9, color: b.muted ? INK.muted : INK.body });
}

function measureNote(p: Paper, b: NoteBlock, w: number): number {
  const inner = w - NOTE_PAD * 2 - 4;
  const titleH = b.title ? 9.5 * 1.3 + 2 : 0;
  return NOTE_PAD * 2 + titleH + heightOf(p, b.text, inner, { size: 8.5 });
}

function drawNote(p: Paper, b: NoteBlock, x: number, y: number, w: number): number {
  const ink = TONE_INK[b.tone];
  const h = measureNote(p, b, w);
  p.rect(x, y, w, h, tint(ink, 0.92), 3);
  // Pita tebal di tepi kiri: catatan ini harus tetap terbaca sebagai peringatan
  // walau laporannya difotokopi hitam-putih.
  p.rect(x, y, 3, h, ink, 1.5);
  const inner = w - NOTE_PAD * 2 - 4;
  let cy = y + NOTE_PAD;
  if (b.title) {
    cy += textBlock(p, b.title, x + NOTE_PAD + 4, cy, inner, { size: 9.5, style: 'bold', color: ink });
    cy += 2;
  }
  textBlock(p, b.text, x + NOTE_PAD + 4, cy, inner, { size: 8.5, color: INK.body });
  return h;
}

// ── Blok: kartu KPI ────────────────────────────────────────────────────────

function kpiRows(b: KpiBlock): number {
  return Math.ceil(b.items.length / (b.perRow ?? 3));
}

function measureKpi(b: KpiBlock): number {
  const rows = kpiRows(b);
  return rows * KPI_H + (rows - 1) * KPI_GAP;
}

function drawKpi(p: Paper, b: KpiBlock, x: number, y: number, w: number): number {
  const perRow = b.perRow ?? 3;
  const cardW = (w - (perRow - 1) * KPI_GAP) / perRow;
  b.items.forEach((item, i) => {
    const cx = x + (i % perRow) * (cardW + KPI_GAP);
    const cy = y + Math.floor(i / perRow) * (KPI_H + KPI_GAP);
    p.rect(cx, cy, cardW, KPI_H, INK.panel, 3);
    p.strokeRect(cx, cy, cardW, KPI_H, INK.ruleSoft, 3);
    if (item.accent) p.rect(cx, cy + 6, 2.5, KPI_H - 12, hexToRgb(item.accent), 1.25);

    const pad = 11;
    const innerW = cardW - pad - 8;
    textBlock(p, item.label.toUpperCase(), cx + pad, cy + 8, innerW, { size: 7, style: 'bold', color: INK.muted });
    p.textAt(ellipsize(p, item.value, innerW, { size: 15, style: 'bold' }), cx + pad, cy + 33, {
      size: 15,
      style: 'bold',
      color: INK.heading,
    });
    if (item.hint) {
      p.textAt(ellipsize(p, item.hint, innerW, { size: 7.5 }), cx + pad, cy + 45, { size: 7.5, color: INK.muted });
    }
  });
  return measureKpi(b);
}

// ── Blok: ubin metrik ──────────────────────────────────────────────────────

function metricRows(b: MetricBlock): number {
  return Math.ceil(b.items.length / Math.min(b.items.length || 1, 3));
}

function measureMetric(b: MetricBlock): number {
  const rows = metricRows(b);
  return rows * METRIC_H + (rows - 1) * METRIC_GAP;
}

function drawMetric(p: Paper, b: MetricBlock, x: number, y: number, w: number): number {
  const perRow = Math.min(b.items.length || 1, 3);
  const cardW = (w - (perRow - 1) * METRIC_GAP) / perRow;
  b.items.forEach((item, i) => {
    const cx = x + (i % perRow) * (cardW + METRIC_GAP);
    const cy = y + Math.floor(i / perRow) * (METRIC_H + METRIC_GAP);
    p.rect(cx, cy, cardW, METRIC_H, INK.paper, 3);
    p.strokeRect(cx, cy, cardW, METRIC_H, INK.ruleSoft, 3);
    const pad = 10;
    const innerW = cardW - pad * 2;
    textBlock(p, item.label.toUpperCase(), cx + pad, cy + 7, innerW, { size: 6.8, style: 'bold', color: INK.muted });
    p.textAt(ellipsize(p, item.value, innerW, { size: 13, style: 'bold' }), cx + pad, cy + 29, {
      size: 13,
      style: 'bold',
      color: item.tone ? TONE_INK[item.tone] : INK.heading,
    });
    if (item.hint) {
      p.textAt(ellipsize(p, item.hint, innerW, { size: 7 }), cx + pad, cy + 40, { size: 7, color: INK.muted });
    }
  });
  return measureMetric(b);
}

// ── Blok: batang kemajuan ──────────────────────────────────────────────────

function drawProgress(p: Paper, b: ProgressBlock, x: number, y: number, w: number): number {
  textBlock(p, b.label, x, y, w * 0.6, { size: 9.5, style: 'bold', color: INK.heading });
  const pctText = `${b.pct.toFixed(2).replace('.', ',')}%`;
  p.textAt(pctText, x + w, y + 11, { size: 13, style: 'bold', color: capaianInk(b.pct), align: 'right' });

  const barY = y + 20;
  const barH = 9;
  p.rect(x, barY, w, barH, INK.track, 4.5);
  const filled = Math.max(0, Math.min(b.pct / 100, 1)) * w;
  if (filled > 0.5) p.rect(x, barY, Math.max(filled, 3), barH, INK.accent, 4.5);

  p.textAt(b.leftCaption, x, barY + barH + 10, { size: 7.5, color: INK.muted });
  p.textAt(b.rightCaption, x + w, barY + barH + 10, { size: 7.5, color: INK.muted, align: 'right' });
  return PROGRESS_H;
}

// ── Blok: proporsi (donat + legenda) ───────────────────────────────────────

function measureProporsi(b: ProporsiBlock): number {
  const positif = b.items.filter((i) => i.value > 0);
  if (positif.length === 0) return PANEL_TITLE_H + 28;
  return PANEL_TITLE_H + DONUT_PT + 10 + positif.length * LEGEND_ROW;
}

function drawProporsi(p: Paper, b: ProporsiBlock, x: number, y: number, w: number, ctx: RenderContext): number {
  textBlock(p, b.title, x, y, w, { size: 9, style: 'bold', color: INK.heading });
  const positif = b.items.filter((i) => i.value > 0);
  if (positif.length === 0) {
    textBlock(p, 'Tidak ada data untuk lingkup ini.', x, y + PANEL_TITLE_H, w, { size: 8.5, color: INK.muted });
    return PANEL_TITLE_H + 28;
  }

  const png = ctx.donuts.get(b) ?? null;
  const dx = x + (w - DONUT_PT) / 2;
  const dy = y + PANEL_TITLE_H;
  if (png) {
    // 'FAST' = aliran Flate. Tanpa argumen ini jsPDF menyimpan bitmap MENTAH —
    // itulah yang membuat cetakan lama membengkak jadi 28 MB per halaman.
    p.doc.addImage(png, 'PNG', dx, dy, DONUT_PT, DONUT_PT, undefined, 'FAST');
  }
  // Angka total ditulis sebagai teks vektor di pusat cincin, bukan dibakar ke
  // dalam raster — supaya tetap tajam saat di-zoom dan bisa dicari.
  p.textAt(b.centerValue, dx + DONUT_PT / 2, dy + DONUT_PT / 2 + 1, {
    size: 14,
    style: 'bold',
    color: INK.heading,
    align: 'center',
  });
  p.textAt(b.centerLabel, dx + DONUT_PT / 2, dy + DONUT_PT / 2 + 12, { size: 6.5, color: INK.muted, align: 'center' });

  const total = positif.reduce((s, i) => s + i.value, 0);
  let ly = dy + DONUT_PT + 10;
  for (const item of positif) {
    const pct = ((item.value / total) * 100).toFixed(1).replace('.', ',');
    const tail = `${item.value.toLocaleString('id-ID')}  ${pct}%`;
    const tailW = p.widthOf(tail, { size: 8 }) + 6;
    p.rect(x, ly + 2.2, 6, 6, hexToRgb(item.colorHex), 1);
    p.textAt(ellipsize(p, item.label, w - 10 - tailW, { size: 8 }), x + 10, ly + 7.4, { size: 8, color: INK.body });
    p.textAt(tail, x + w, ly + 7.4, { size: 8, color: INK.muted, align: 'right' });
    ly += LEGEND_ROW;
  }
  return measureProporsi(b);
}

// ── Blok: deret batang horizontal (vektor) ─────────────────────────────────

function measureBarList(b: BarListBlock): number {
  if (b.items.length === 0) return PANEL_TITLE_H + 28;
  return PANEL_TITLE_H + b.items.length * BAR_ROW;
}

function drawBarList(p: Paper, b: BarListBlock, x: number, y: number, w: number): number {
  textBlock(p, b.title, x, y, w, { size: 9, style: 'bold', color: INK.heading });
  if (b.items.length === 0) {
    textBlock(p, 'Tidak ada data untuk lingkup ini.', x, y + PANEL_TITLE_H, w, { size: 8.5, color: INK.muted });
    return PANEL_TITLE_H + 28;
  }

  let by = y + PANEL_TITLE_H;
  for (const item of b.items) {
    const pctText = `${item.pct.toFixed(1).replace('.', ',')}%`;
    const pctW = p.widthOf(pctText, { size: 8, style: 'bold' }) + 5;
    p.textAt(ellipsize(p, item.label, w - pctW - 60, { size: 8 }), x, by + 6, { size: 8, color: INK.body });
    p.textAt(`${item.valueText} / ${item.totalText}`, x + w - pctW, by + 6, { size: 7, color: INK.muted, align: 'right' });
    p.textAt(pctText, x + w, by + 6, { size: 8, style: 'bold', color: capaianInk(item.pct), align: 'right' });

    const barY = by + 10;
    p.rect(x, barY, w, 6, INK.track, 3);
    const filled = (Math.max(0, Math.min(item.pct, 100)) / 100) * w;
    if (filled > 0.5) p.rect(x, barY, Math.max(filled, 2.5), 6, hexToRgb(item.colorHex), 3);
    by += BAR_ROW;
  }
  return measureBarList(b);
}

// ── Blok: skor ITKP ────────────────────────────────────────────────────────

function measureScore(b: ScoreBlock): number {
  return 58 + Math.max(b.komponen.length, 1) * 19;
}

function drawScore(p: Paper, b: ScoreBlock, x: number, y: number, w: number): number {
  const h = measureScore(b);
  p.rect(x, y, w, h, INK.panel, 4);
  p.strokeRect(x, y, w, h, INK.ruleSoft, 4);

  const pad = 14;
  const innerW = w - pad * 2;
  textBlock(p, b.scopeLabel.toUpperCase(), x + pad, y + 9, innerW, { size: 7, style: 'bold', color: INK.muted });

  const skor = `${b.value} / ${b.max}`;
  p.textAt(skor, x + pad, y + 36, { size: 20, style: 'bold', color: INK.heading });
  const skorW = p.widthOf(skor, { size: 20, style: 'bold' });
  const capaian = `Capaian ${b.ratioPct.toFixed(2).replace('.', ',')}%`;
  p.textAt(capaian, x + pad + skorW + 12, y + 36, { size: 9, style: 'bold', color: capaianInk(b.ratioPct) });
  if (b.predikat) {
    p.textAt(`Predikat ${b.predikat}`, x + w - pad, y + 36, { size: 9, style: 'bold', color: INK.accent, align: 'right' });
  }

  let cy = y + 50;
  const labelW = innerW * 0.42;
  const barW = innerW * 0.4;
  for (const k of b.komponen) {
    const ratio = k.max > 0 ? Math.max(0, Math.min(k.score / k.max, 1)) : 0;
    p.textAt(ellipsize(p, k.label, labelW, { size: 8 }), x + pad, cy + 7, { size: 8, color: INK.body });
    p.rect(x + pad + labelW, cy + 2.5, barW, 6, INK.track, 3);
    if (ratio > 0) p.rect(x + pad + labelW, cy + 2.5, Math.max(ratio * barW, 2.5), 6, INK.accent, 3);
    const nilai = `${k.score.toLocaleString('id-ID', { maximumFractionDigits: 2 })}/${k.max}${k.bobot ? `  ·  ${k.bobot}%` : ''}`;
    p.textAt(nilai, x + w - pad, cy + 7, { size: 7.5, color: INK.muted, align: 'right' });
    cy += 19;
  }
  return h;
}

// ── Blok: dua kolom berdampingan ───────────────────────────────────────────

function splitGeometry(b: SplitBlock, w: number): { leftW: number; rightW: number; gap: number } {
  const gap = 18;
  const leftW = (w - gap) * (b.leftRatio ?? 0.5);
  return { leftW, rightW: w - gap - leftW, gap };
}

function measureSplit(p: Paper, b: SplitBlock, w: number): number {
  const { leftW, rightW } = splitGeometry(b, w);
  return Math.max(measureBlock(p, b.left, leftW), measureBlock(p, b.right, rightW));
}

function drawSplit(p: Paper, b: SplitBlock, x: number, y: number, w: number, ctx: RenderContext): number {
  const { leftW, rightW, gap } = splitGeometry(b, w);
  drawBlock(p, b.left, x, y, leftW, ctx);
  drawBlock(p, b.right, x + leftW + gap, y, rightW, ctx);
  return measureSplit(p, b, w);
}

// ── Pengiriman blok ────────────────────────────────────────────────────────

/** Diekspor untuk uji: `measureBlock` dan `drawBlock` wajib sepakat. */
export function measureBlock(p: Paper, b: LaporanBlock, w: number): number {
  switch (b.kind) {
    case 'heading':
      return measureHeading(p, b, w);
    case 'text':
      return measureText(p, b, w);
    case 'note':
      return measureNote(p, b, w);
    case 'kpi':
      return measureKpi(b);
    case 'progress':
      return PROGRESS_H;
    case 'proporsi':
      return measureProporsi(b);
    case 'barList':
      return measureBarList(b);
    case 'metric':
      return measureMetric(b);
    case 'score':
      return measureScore(b);
    case 'split':
      return measureSplit(p, b, w);
    case 'spacer':
      return b.height;
    case 'table':
      return 0; // dipagini autoTable, bukan oleh Paper.ensure()
  }
}

export function drawBlock(p: Paper, b: LaporanBlock, x: number, y: number, w: number, ctx: RenderContext): number {
  switch (b.kind) {
    case 'heading':
      return drawHeading(p, b, x, y, w);
    case 'text':
      return drawText(p, b, x, y, w);
    case 'note':
      return drawNote(p, b, x, y, w);
    case 'kpi':
      return drawKpi(p, b, x, y, w);
    case 'progress':
      return drawProgress(p, b, x, y, w);
    case 'proporsi':
      return drawProporsi(p, b, x, y, w, ctx);
    case 'barList':
      return drawBarList(p, b, x, y, w);
    case 'metric':
      return drawMetric(p, b, x, y, w);
    case 'score':
      return drawScore(p, b, x, y, w);
    case 'split':
      return drawSplit(p, b, x, y, w, ctx);
    case 'spacer':
      return b.height;
    case 'table':
      return 0;
  }
}

// ── Tabel ──────────────────────────────────────────────────────────────────

/**
 * Lebar akhir tiap kolom; `undefined` berarti diserahkan ke autoTable.
 *
 * Kolom berlebar tetap dipangkas proporsional bila jumlahnya menyisakan terlalu
 * sedikit untuk kolom `auto`. Tanpa ini, menambah satu kolom saja bisa membuat
 * kolom teks di ujung tersisa beberapa puluh poin — dan kata yang tidak muat
 * di situ akan digambar menjulur keluar sel, bukan dipenggal. Persis itu yang
 * terjadi pada kolom 'Jenis Anomali' ketika kolom tetapnya berjumlah 724pt dari
 * 762pt lebar konten landscape.
 */
function resolveColumnWidths(columns: TableBlock['columns'], contentWidth: number): (number | undefined)[] {
  const tetap = columns.map((c) => (typeof c.width === 'number' ? c.width : undefined));
  const jumlahAuto = tetap.filter((w) => w === undefined).length;
  if (jumlahAuto === 0) return tetap;

  const totalTetap = tetap.reduce<number>((s, w) => s + (w ?? 0), 0);
  const dibutuhkan = AUTO_COL_MIN * jumlahAuto;
  if (contentWidth - totalTetap >= dibutuhkan || totalTetap === 0) return tetap;

  const faktor = Math.max((contentWidth - dibutuhkan) / totalTetap, 0.5);
  return tetap.map((w) => (w === undefined ? undefined : w * faktor));
}

function drawTable(p: Paper, b: TableBlock, ctx: RenderContext): void {
  p.switchTo(b.orientation ?? 'portrait');

  if (b.title) {
    // Judul tabel tidak boleh jadi baris terakhir halaman: pastikan kepala
    // tabel dan beberapa baris pertama ikut serta.
    p.ensure(TABLE_TITLE_H + KEEP_WITH_NEXT);
    textBlock(p, b.title, p.left, p.y, p.contentWidth, { size: 10, style: 'bold', color: INK.heading });
    p.gap(TABLE_TITLE_H);
  } else {
    p.ensure(KEEP_WITH_NEXT);
  }

  const kosong = b.rows.length === 0;
  // Seluruh isi sel dijinakkan SEBELUM diserahkan ke autoTable: autoTable
  // menghitung lebar kolom & memecah baris dari string yang ia terima, jadi
  // string itu harus sudah sama dengan yang nanti benar-benar ditulis jsPDF.
  const body: RowInput[] = kosong
    ? [
        [
          {
            content: sanitizePdfText(b.emptyText ?? 'Tidak ada data.'),
            colSpan: b.columns.length,
            styles: { halign: 'center', textColor: INK.muted, fontStyle: 'italic' },
          } as CellDef,
        ],
      ]
    : b.rows.map((r) => r.map((sel) => sanitizePdfText(sel)) as RowInput);

  const lebar = resolveColumnWidths(b.columns, p.contentWidth);
  const columnStyles: UserOptions['columnStyles'] = {};
  b.columns.forEach((col, i) => {
    columnStyles[i] = {
      halign: col.align ?? 'left',
      ...(lebar[i] !== undefined ? { cellWidth: lebar[i] } : {}),
      // Ruang untuk kotak warna kategori di kolom pertama.
      ...(i === 0 && b.swatches ? { cellPadding: { top: 5, right: 6, bottom: 5, left: 17 } } : {}),
    };
  });

  const toneCols = b.columns.reduce<number[]>((acc, c, i) => (c.tone === 'capaian' ? [...acc, i] : acc), []);
  const highlight = new Set(b.highlightRows ?? []);
  const orientation = p.orientation;
  const pagesBefore = p.doc.getNumberOfPages();

  ctx.autoTable(p.doc, {
    startY: p.y,
    margin: { top: p.margin.top, left: p.margin.left, right: p.margin.right, bottom: p.margin.bottom },
    head: [b.columns.map((c) => sanitizePdfText(c.header))],
    body,
    foot: b.foot ? [b.foot.map((sel) => sanitizePdfText(sel))] : undefined,
    // Inti janji "tidak terpotong" pada tabel: satu baris tidak pernah dibelah
    // dua halaman, dan kepala tabel diulang di setiap halaman supaya baris di
    // halaman ke-7 masih bisa dibaca tanpa membalik kembali ke halaman pertama.
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    showFoot: b.foot ? 'lastPage' : 'never',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      textColor: INK.body,
      lineColor: INK.ruleSoft,
      lineWidth: 0.4,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: INK.headFill,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      valign: 'middle',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: INK.heading,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: INK.zebra },
    columnStyles,
    didParseCell: (data) => {
      if (data.section !== 'body' || kosong) return;
      // % capaian mewarisi semantik warna badge di layar, supaya pembaca yang
      // sudah terbiasa membaca tabelnya tidak perlu belajar kode warna baru.
      if (toneCols.includes(data.column.index)) {
        const angka = parseFloat(String(data.cell.raw).replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(angka)) {
          data.cell.styles.textColor = capaianInk(angka);
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (highlight.has(data.row.index)) {
        data.cell.styles.fillColor = INK.highlight;
        if (data.column.index === 1) data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 0 || kosong) return;
      const warna = b.swatches?.[data.row.index];
      if (!warna) return;
      p.doc.setFillColor(...hexToRgb(warna));
      p.doc.roundedRect(data.cell.x + 6, data.cell.y + data.cell.height / 2 - 3, 6, 6, 1, 1, 'F');
    },
  });

  const finalY = (p.doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? p.y;
  p.syncAfterTable(finalY, p.doc.getNumberOfPages() - pagesBefore, orientation);
}

// ── Kop dokumen ────────────────────────────────────────────────────────────

function drawKop(p: Paper, laporan: Laporan): void {
  const w = p.contentWidth;
  const x = p.left;
  let y = p.y;

  p.rect(x, y, 34, 3, INK.accent, 1.5);
  y += 12;
  y += textBlock(p, laporan.subtitle.toUpperCase(), x, y, w, { size: 8, style: 'bold', color: INK.accent });
  y += 3;
  y += textBlock(p, laporan.title, x, y, w, { size: 19, style: 'bold', color: INK.heading, leading: 1.2 });
  y += 6;
  for (const baris of laporan.meta) {
    y += textBlock(p, baris, x, y, w, { size: 8, color: INK.muted });
    y += 1;
  }
  y += 8;
  p.doc.setDrawColor(...INK.rule);
  p.doc.setLineWidth(0.8);
  p.doc.line(x, y, x + w, y);
  p.y = y + 16;
}

// ── Titik masuk ────────────────────────────────────────────────────────────

export interface RenderResult {
  doc: jsPDF;
  pageCount: number;
}

/**
 * Susun `Laporan` menjadi dokumen PDF siap simpan.
 *
 * `jsPDF` & `jspdf-autotable` disuntikkan pemanggil (bukan diimpor di sini)
 * supaya keduanya bisa dimuat dinamis saat tombol Cetak ditekan, dan tidak
 * ikut membebani bundel awal halaman Ringkasan.
 */
export function renderLaporan(laporan: Laporan, deps: { doc: jsPDF; autoTable: AutoTable }): RenderResult {
  const p = new Paper(deps.doc, {
    orientation: 'portrait',
    footerNote: laporan.footerNote,
    runningHead: laporan.runningHead,
  });

  // Donat dirender lebih dulu supaya seluruh jalur menggambar tetap sinkron —
  // pemecahan halaman jauh lebih mudah dilacak tanpa await di tengah alur.
  const donuts = new Map<ProporsiBlock, string | null>();
  const kumpulkan = (b: LaporanBlock) => {
    if (b.kind === 'proporsi') donuts.set(b, renderDonutPng(b.items));
    else if (b.kind === 'split') {
      kumpulkan(b.left);
      kumpulkan(b.right);
    }
  };
  laporan.blocks.forEach(kumpulkan);

  const ctx: RenderContext = { donuts, autoTable: deps.autoTable };

  drawKop(p, laporan);

  laporan.blocks.forEach((block, i) => {
    if (block.kind === 'table') {
      drawTable(p, block, ctx);
      p.gap(GAP_AFTER.table);
      return;
    }

    // Setiap blok non-tabel selalu kembali ke portrait, supaya konten biasa
    // tidak ikut tercetak menyamping hanya karena tabel sebelumnya landscape.
    p.switchTo('portrait');

    const h = measureBlock(p, block, p.contentWidth);
    if (block.kind === 'heading') {
      // Judul seksi tidak boleh ditinggal sendirian di kaki halaman.
      const berikut = laporan.blocks[i + 1];
      const ikut = berikut && berikut.kind !== 'table' ? measureBlock(p, berikut, p.contentWidth) : KEEP_WITH_NEXT;
      p.ensure(h + GAP_AFTER.heading + Math.min(ikut, KEEP_WITH_NEXT));
    } else {
      p.ensure(h);
    }

    drawBlock(p, block, p.left, p.y, p.contentWidth, ctx);
    p.gap(h + GAP_AFTER[block.kind]);
  });

  p.finish();
  return { doc: deps.doc, pageCount: deps.doc.getNumberOfPages() };
}
