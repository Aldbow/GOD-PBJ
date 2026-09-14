import { buildLaporan, type LaporanInput } from './buildLaporan';
import { renderLaporan } from './renderLaporan';

/**
 * Cetak halaman Ringkasan ke PDF.
 *
 * Menggantikan `handleDownloadPdf` lama yang memotret `#report-snapshot` dengan
 * html-to-image lalu mengiris kanvasnya tiap 3698 piksel. Tiga hal yang berubah
 * secara mendasar:
 *
 *  1. Cetakan ini DOKUMEN, bukan foto. Teks & tabelnya vektor — tajam saat
 *     di-zoom, bisa diseleksi dan dicari, dan tidak mengecil jadi 42% hanya
 *     karena lebar layar pencetak kebetulan 1263 piksel.
 *  2. Pemecahan halaman sadar isi. Irisan piksel buta yang membelah judul dan
 *     baris tabel diganti penata letak yang mengukur tiap blok lebih dulu
 *     (lihat `layout.ts`), dan menyerahkan tabel panjang ke autoTable yang
 *     memecahnya di batas baris sambil mengulang kepala tabel.
 *  3. Ukuran berkas turun dari 124 MB (5 halaman bitmap MENTAH 2526x3698,
 *     28 MB per halaman) menjadi ratusan kilobyte.
 *
 * jspdf & jspdf-autotable diimpor dinamis supaya tidak masuk bundel awal
 * halaman Ringkasan — hanya diunduh saat tombol Cetak ditekan. Pola yang sama
 * dengan `cetakPeringkatSatker.ts`.
 */
export async function cetakLaporanRingkasan(input: LaporanInput): Promise<{ pageCount: number; filename: string }> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  // `compress: true` memampatkan aliran isi halaman. Ini juga yang absen di
  // cetakan lama — bersama argumen kompresi addImage yang tidak diisi.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });

  const laporan = buildLaporan(input);
  const { pageCount } = renderLaporan(laporan, { doc, autoTable });

  const tanggal = input.printedAt.toISOString().split('T')[0];
  const filename = `Laporan_Ringkasan_Pengadaan_${tanggal}.pdf`;
  doc.save(filename);

  return { pageCount, filename };
}

export type { LaporanInput };
