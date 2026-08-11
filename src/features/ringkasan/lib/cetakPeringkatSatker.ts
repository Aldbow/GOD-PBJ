import { fmtDec, fmtInt, fmtRupiahDetail } from '@/lib/format';
import type { SatkerAggregate } from './ringkasanData';

/** Satu baris peringkat: agregat satker + nomor peringkat dasar (by % capaian). */
export type SatkerRankRow = SatkerAggregate & { baseRank: number };

export interface CetakPeringkatOptions {
  rows: SatkerRankRow[];
  /** Kata kunci pencarian yang sedang aktif ('' = seluruh satker). */
  searchQuery?: string;
  /** Satker yang disorot di layar (satker milik PPK / filter aktif). */
  highlightSatker?: string;
  /** Judul lingkup data — mis. 'Kementerian Ketenagakerjaan'. */
  scopeLabel?: string;
}

/** Ambang warna % capaian — identik dengan badge di tabel layar. */
function capaianInk(pct: number): [number, number, number] {
  if (pct < 25) return [185, 28, 28]; // red-700
  if (pct < 50) return [180, 83, 9]; // amber-700
  if (pct < 75) return [29, 78, 216]; // blue-700
  return [21, 128, 61]; // green-700
}

const INK = {
  heading: [15, 23, 42] as [number, number, number], // slate-900
  body: [51, 65, 85] as [number, number, number], // slate-700
  muted: [100, 116, 139] as [number, number, number], // slate-500
  rule: [203, 213, 225] as [number, number, number], // slate-300
  headFill: [31, 41, 55] as [number, number, number], // abu-800, samakan dgn exportToPDF
  zebra: [248, 250, 252] as [number, number, number], // slate-50
  highlight: [239, 246, 255] as [number, number, number], // blue-50
};

function stamp(d: Date): string {
  const tanggal = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${tanggal}, ${jam} WIB`;
}

/**
 * Cetak tabel Peringkat Realisasi Satuan Kerja ke PDF.
 *
 * Sengaja PDF berbasis teks (jspdf-autotable), bukan tangkapan layar seperti
 * `handleDownloadPdf` di RingkasanView: peringkat adalah dokumen tabular yang
 * dibaca dan dirujuk, jadi teksnya harus tetap tajam saat di-zoom, bisa
 * di-select/cari, header tabel berulang tiap halaman, dan hasilnya tidak ikut
 * gelap saat aplikasi sedang bertema gelap. Ukuran berkasnya pun kecil.
 *
 * jspdf & jspdf-autotable diimpor dinamis supaya tidak masuk bundel awal
 * halaman Ringkasan — hanya diunduh saat tombol Cetak ditekan.
 */
export async function cetakPeringkatSatker({
  rows,
  searchQuery = '',
  highlightSatker = '',
  scopeLabel = 'Kementerian Ketenagakerjaan',
}: CetakPeringkatOptions): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  // Landscape: 6 kolom dengan nilai rupiah penuh + nama satker panjang tidak
  // muat lega di portrait, dan tabel ini memang untuk dibaca menyamping.
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const MARGIN = 36;
  const now = new Date();

  // ── Kepala dokumen ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK.heading);
  doc.text('Peringkat Realisasi Satuan Kerja', MARGIN, MARGIN + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK.body);
  doc.text(scopeLabel, MARGIN, MARGIN + 21);

  doc.setFontSize(8.5);
  doc.setTextColor(...INK.muted);
  const lingkup = searchQuery
    ? `Disaring: "${searchQuery}" — ${fmtInt(rows.length)} satuan kerja`
    : `Seluruh satuan kerja — ${fmtInt(rows.length)} satuan kerja`;
  doc.text(`${lingkup}  ·  Dicetak ${stamp(now)}`, MARGIN, MARGIN + 35);

  // Total dihitung dari baris yang benar-benar dicetak, supaya angka ringkas di
  // kepala dokumen selalu konsisten dengan isi tabel di bawahnya (termasuk saat
  // hasil pencarian dipersempit).
  const totalPagu = rows.reduce((s, r) => s + r.pagu, 0);
  const totalRealisasi = rows.reduce((s, r) => s + r.realisasi, 0);
  const totalPaket = rows.reduce((s, r) => s + r.jumlahPaket, 0);
  const pctTotal = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;

  doc.setTextColor(...INK.body);
  doc.text(
    [
      `Total paket: ${fmtInt(totalPaket)}`,
      `Total pagu: ${fmtRupiahDetail(totalPagu)}`,
      `Total realisasi: ${fmtRupiahDetail(totalRealisasi)}`,
      `Capaian gabungan: ${fmtDec(pctTotal)}%`,
    ].join('     '),
    MARGIN,
    MARGIN + 49
  );

  doc.setDrawColor(...INK.rule);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, MARGIN + 58, pageWidth - MARGIN, MARGIN + 58);

  // ── Tabel ─────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: MARGIN + 70,
    margin: { left: MARGIN, right: MARGIN, bottom: MARGIN + 12 },
    head: [['Peringkat', 'Satuan Kerja', 'Jumlah Paket', 'Pagu', 'Realisasi', '% Capaian']],
    body: rows.map((r) => [
      String(r.baseRank),
      r.satker,
      fmtInt(r.jumlahPaket),
      fmtRupiahDetail(r.pagu),
      fmtRupiahDetail(r.realisasi),
      `${fmtDec(r.pctRealisasi)}%`,
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      textColor: INK.body,
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: INK.headFill,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: { fillColor: INK.zebra },
    columnStyles: {
      0: { halign: 'right', cellWidth: 58 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', cellWidth: 74 },
      3: { halign: 'right', cellWidth: 108 },
      4: { halign: 'right', cellWidth: 108 },
      5: { halign: 'right', cellWidth: 68 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = rows[data.row.index];
      if (!row) return;
      // % capaian mewarisi semantik warna badge di layar, supaya orang yang
      // sudah terbiasa membaca tabelnya tidak perlu belajar kode warna baru.
      if (data.column.index === 5) {
        data.cell.styles.textColor = capaianInk(row.pctRealisasi);
        data.cell.styles.fontStyle = 'bold';
      }
      if (highlightSatker && row.satker === highlightSatker) {
        data.cell.styles.fillColor = INK.highlight;
        if (data.column.index === 1) data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Kaki halaman ──────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK.muted);
    doc.text('Peringkat Realisasi Satuan Kerja — sumber: RUP terumumkan (SIRUP)', MARGIN, pageHeight - 20);
    doc.text(`Halaman ${i} dari ${total}`, pageWidth - MARGIN, pageHeight - 20, { align: 'right' });
  }

  const tanggalBerkas = now.toISOString().split('T')[0];
  doc.save(`Peringkat_Realisasi_Satuan_Kerja_${tanggalBerkas}.pdf`);
}
