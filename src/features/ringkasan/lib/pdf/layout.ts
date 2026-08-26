import type { jsPDF } from 'jspdf';
import { INK, type RGB } from './ink';
import { sanitizePdfText } from './pdfText';

/**
 * Mesin aliran (flow) di atas jsPDF.
 *
 * Masalah yang diselesaikan: jsPDF tidak punya konsep "halaman penuh". Kalau
 * penulis konten menaruh sesuatu di y yang melebihi tinggi kertas, isinya
 * hilang diam-diam; kalau ia memotong konten pada offset tetap, potongannya
 * jatuh di tengah judul atau di tengah baris tabel. Keduanya persis yang
 * membuat cetakan lama terlihat terpotong.
 *
 * Aturan kelas ini: SATU pintu keputusan halaman, `ensure(h)`. Setiap penulis
 * konten wajib menyatakan dulu berapa tinggi yang ia butuhkan, baru menggambar.
 * Karena setiap blok laporan ini tingginya bisa dihitung pasti sebelum
 * digambar (paragraf lewat splitTextToSize, kartu/bar lewat jumlah barisnya,
 * tabel diserahkan ke autoTable yang punya paginasi sendiri), satu pintu itu
 * cukup — tidak perlu render dua kali.
 *
 * Konsekuensi lain yang disengaja: `y` hanya maju lewat metode di sini,
 * sehingga tidak ada jalan untuk "lupa" memeriksa sisa halaman.
 */

export const A4_SHORT = 595.28;
export const A4_LONG = 841.89;

export type Orientation = 'portrait' | 'landscape';

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PaperOptions {
  orientation?: Orientation;
  margin?: Partial<Margin>;
  /** Teks kiri pada kaki setiap halaman. */
  footerNote?: string;
  /** Teks kiri pada kepala halaman ke-2 dan seterusnya. */
  runningHead?: string;
}

const DEFAULT_MARGIN: Margin = { top: 46, right: 40, bottom: 48, left: 40 };

export interface TextOptions {
  size?: number;
  style?: 'normal' | 'bold' | 'italic';
  color?: RGB;
  align?: 'left' | 'center' | 'right';
  /** Kelipatan tinggi baris terhadap ukuran font. */
  leading?: number;
  /** Lebar bungkus; default = lebar konten. */
  width?: number;
}

const LEADING = 1.35;

export class Paper {
  readonly doc: jsPDF;
  readonly margin: Margin;
  private readonly footerNote: string;
  private readonly runningHead: string;
  /** Orientasi tiap halaman, index 0 = halaman 1. Dipakai saat melukis kaki. */
  private readonly pageOrientations: Orientation[] = [];
  /** Halaman yang belum menerima satu pun gambar — jangan diselipi page break. */
  private pageEmpty = true;

  y = 0;

  constructor(doc: jsPDF, opts: PaperOptions = {}) {
    this.doc = doc;
    this.margin = { ...DEFAULT_MARGIN, ...opts.margin };
    this.footerNote = sanitizePdfText(opts.footerNote ?? '');
    this.runningHead = sanitizePdfText(opts.runningHead ?? '');
    this.pageOrientations.push(opts.orientation ?? 'portrait');
    this.y = this.margin.top;
  }

  // ── Geometri ──────────────────────────────────────────────────────────────

  get orientation(): Orientation {
    return this.pageOrientations[this.pageOrientations.length - 1];
  }

  get pageWidth(): number {
    return this.orientation === 'landscape' ? A4_LONG : A4_SHORT;
  }

  get pageHeight(): number {
    return this.orientation === 'landscape' ? A4_SHORT : A4_LONG;
  }

  get left(): number {
    return this.margin.left;
  }

  get right(): number {
    return this.pageWidth - this.margin.right;
  }

  /** Batas bawah area konten. Kaki halaman hidup di bawah garis ini. */
  get bottom(): number {
    return this.pageHeight - this.margin.bottom;
  }

  get contentWidth(): number {
    return this.pageWidth - this.margin.left - this.margin.right;
  }

  get remaining(): number {
    return this.bottom - this.y;
  }

  get pageCount(): number {
    return this.pageOrientations.length;
  }

  // ── Kendali halaman ───────────────────────────────────────────────────────

  newPage(orientation: Orientation = this.orientation): void {
    this.doc.addPage(
      orientation === 'landscape' ? [A4_LONG, A4_SHORT] : [A4_SHORT, A4_LONG],
      orientation === 'landscape' ? 'landscape' : 'portrait'
    );
    this.pageOrientations.push(orientation);
    this.y = this.margin.top;
    this.pageEmpty = true;
  }

  /**
   * Pastikan tersedia ruang setinggi `h`; kalau tidak, pindah halaman.
   * Halaman yang masih kosong tidak pernah ditinggalkan — blok yang lebih
   * tinggi dari satu halaman penuh tetap digambar di situ, dan pemanggilnya
   * yang bertanggung jawab memecahnya (mis. dengan menyerahkannya ke autoTable).
   */
  ensure(h: number): void {
    if (this.pageEmpty) return;
    if (this.remaining < h) this.newPage();
  }

  /** Pindah ke orientasi tertentu tanpa meninggalkan halaman kosong. */
  switchTo(orientation: Orientation): void {
    if (this.orientation === orientation) return;
    if (this.pageEmpty && this.doc.getNumberOfPages() > 1) {
      // Halaman ini belum terpakai — buang, jangan sisakan halaman kosong tepat
      // sebelum tabel landscape.
      this.doc.deletePage(this.doc.getNumberOfPages());
      this.pageOrientations.pop();
      this.newPage(orientation);
      return;
    }
    this.newPage(orientation);
  }

  /** Tandai bahwa sesuatu sudah digambar di halaman ini. */
  private touch(): void {
    this.pageEmpty = false;
  }

  gap(h: number): void {
    this.y += h;
  }

  /**
   * Sinkronkan kursor setelah autoTable, yang memindahkan halaman sendiri di
   * luar sepengetahuan `ensure()`. `pagesAdded` dihitung pemanggil dari selisih
   * jumlah halaman sebelum & sesudah tabel.
   */
  syncAfterTable(finalY: number, pagesAdded: number, orientation: Orientation): void {
    for (let i = 0; i < pagesAdded; i += 1) this.pageOrientations.push(orientation);
    this.y = finalY;
    this.touch();
  }

  // ── Primitif gambar ───────────────────────────────────────────────────────

  private applyText(o: TextOptions): void {
    this.doc.setFont('helvetica', o.style ?? 'normal');
    this.doc.setFontSize(o.size ?? 9.5);
    this.doc.setTextColor(...(o.color ?? INK.body));
  }

  /**
   * Bagi teks jadi baris sesuai lebar, memakai font/ukuran dari `o`.
   *
   * Teks dijinakkan DI SINI, bukan saat digambar: kalau penjinakan terjadi
   * belakangan, tata letak sudah terlanjur dihitung atas string yang berbeda
   * dari yang benar-benar ditulis ke berkas. Lihat `pdfText.ts`.
   */
  wrap(text: string, o: TextOptions = {}): string[] {
    this.applyText(o);
    return this.doc.splitTextToSize(sanitizePdfText(text), o.width ?? this.contentWidth) as string[];
  }

  /** Tinggi yang akan dipakai `paragraph()` untuk teks ini — tanpa menggambar. */
  measure(text: string, o: TextOptions = {}): number {
    const size = o.size ?? 9.5;
    return this.wrap(text, o).length * size * (o.leading ?? LEADING);
  }

  /** Tulis paragraf mulai di kursor, lalu majukan kursor. Tidak memecah halaman. */
  paragraph(text: string, o: TextOptions = {}): void {
    const size = o.size ?? 9.5;
    const lead = size * (o.leading ?? LEADING);
    const rows = this.wrap(text, o);
    const x = o.align === 'center' ? this.left + this.contentWidth / 2 : o.align === 'right' ? this.right : this.left;
    // jsPDF menaruh baseline di y, sedangkan kursor kita menunjuk sisi ATAS
    // baris — geser sebesar tinggi huruf supaya blok teks tidak menabrak elemen
    // di atasnya dan `measure()` tetap jujur terhadap ruang yang dipakai.
    this.doc.text(rows, x, this.y + size * 0.82, {
      align: o.align ?? 'left',
      lineHeightFactor: o.leading ?? LEADING,
    });
    this.y += rows.length * lead;
    this.touch();
  }

  /** Satu baris teks pada posisi bebas — tidak menyentuh kursor. */
  textAt(text: string, x: number, y: number, o: TextOptions = {}): void {
    this.applyText(o);
    this.doc.text(sanitizePdfText(text), x, y, { align: o.align ?? 'left' });
    this.touch();
  }

  /** Lebar render satu baris teks pada font/ukuran tertentu. */
  widthOf(text: string, o: TextOptions = {}): number {
    this.applyText(o);
    return this.doc.getTextWidth(sanitizePdfText(text));
  }

  rule(color: RGB = INK.ruleSoft, width = 0.5): void {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(width);
    this.doc.line(this.left, this.y, this.right, this.y);
    this.touch();
  }

  rect(x: number, y: number, w: number, h: number, fill: RGB, radius = 0): void {
    this.doc.setFillColor(...fill);
    if (radius > 0) this.doc.roundedRect(x, y, w, h, radius, radius, 'F');
    else this.doc.rect(x, y, w, h, 'F');
    this.touch();
  }

  strokeRect(x: number, y: number, w: number, h: number, color: RGB, radius = 0, width = 0.5): void {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(width);
    if (radius > 0) this.doc.roundedRect(x, y, w, h, radius, radius, 'S');
    else this.doc.rect(x, y, w, h, 'S');
    this.touch();
  }

  // ── Kepala & kaki, dilukis sekali di akhir ────────────────────────────────

  /**
   * Lukis kepala & kaki di SEMUA halaman. Wajib dipanggil terakhir: nomor
   * "Halaman i dari N" baru bisa benar setelah halaman terakhir terbentuk.
   */
  finish(): void {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      this.doc.setPage(i);
      const orientation = this.pageOrientations[i - 1] ?? 'portrait';
      const w = orientation === 'landscape' ? A4_LONG : A4_SHORT;
      const h = orientation === 'landscape' ? A4_SHORT : A4_LONG;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...INK.faint);

      if (i > 1 && this.runningHead) {
        this.doc.text(this.runningHead, this.margin.left, this.margin.top - 20);
        this.doc.setDrawColor(...INK.ruleSoft);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin.left, this.margin.top - 15, w - this.margin.right, this.margin.top - 15);
      }

      const footY = h - this.margin.bottom + 24;
      this.doc.setDrawColor(...INK.ruleSoft);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin.left, footY - 12, w - this.margin.right, footY - 12);
      this.doc.setTextColor(...INK.faint);
      if (this.footerNote) this.doc.text(this.footerNote, this.margin.left, footY);
      this.doc.text(`Halaman ${i} dari ${total}`, w - this.margin.right, footY, { align: 'right' });
    }
  }
}
