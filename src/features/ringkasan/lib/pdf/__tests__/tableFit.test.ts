import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildLaporan } from '../buildLaporan';
import { renderLaporan } from '../renderLaporan';
import { aggregate, type GabunganRow } from '../../ringkasanData';

/**
 * Uji muat isi tabel.
 *
 * Regresi yang dijaga: kolom berlebar tetap pernah menghabiskan 724 dari 762pt
 * lebar konten landscape, menyisakan 37,9pt untuk kolom 'Jenis Anomali'.
 * Di ruang sesempit itu autoTable tidak bisa memenggal di spasi, jadi
 * 'Realisasi Tanpa RUP' tercacah di tengah kata menjadi 'Realisa'.
 *
 * Yang diperiksa memakai ukuran autoTable sendiri: `minReadableWidth` (kata
 * terpanjang + padding). Selama lebar kolom tidak pernah turun di bawah itu,
 * tidak ada kata yang perlu dicacah — dan cacahan itulah gejala yang terlihat.
 *
 * Ambang inilah yang dipakai, bukan sekadar "teks lebih lebar dari selnya":
 * autoTable memecah baris dengan kelonggaran 1pt (`textSpace + 1/scaleFactor`),
 * sehingga bug aslinya — teks 26,5pt di ruang 25,9pt — justru lolos dari
 * pemeriksaan naif semacam itu.
 *
 * Bentuknya juga sengaja tidak memeriksa angka lebar kolom satu per satu: uji
 * seperti itu cuma minta diperbarui tiap kolom berubah, tanpa menangkap apa pun.
 */

// Catatan kurasi AI yang realistis: kalimat panjang dengan token tak terpotong
// (nominal rupiah penuh, rujukan regulasi) — pemicu luapan yang sesungguhnya.
const CATATAN = [
  'Metode Pengadaan Langsung digunakan untuk nilai Rp1.250.000.000,00 sedangkan batas maksimalnya Rp200.000.000,00',
  'Ketidaksesuaian metode terhadap Perpres 12/2021 jo. Perpres 16/2018 tentang Pengadaan Barang/Jasa Pemerintah',
  'Nilai kontrak melampaui pagu; pertanggungjawaban administratif belum terdokumentasi pada SPSE/SIRUP',
];
const REKOMENDASI = [
  'Gunakan metode Tender sesuai ketentuan Perpres 12/2021',
  'Lakukan reviu ulang atas dokumen pertanggungjawaban penyedia',
  'Konsultasikan ke UKPBJ sebelum penetapan pemenang',
];

function rows(n: number): GabunganRow[] {
  return Array.from({ length: n }, (_, i) => ({
    kd_rup: `2600${i}`,
    rup_name: `Belanja Modal Peralatan dan Mesin Paket ${i} Tahun Anggaran 2026`,
    satker: `Direktorat Jenderal Pembinaan Pelatihan Vokasi ${i % 20}`,
    nama_ppk: `Nama Pejabat Pembuat Komitmen ${i % 10}`,
    metode_pengadaan: ['Tender', 'E-Purchasing', 'Pengadaan Langsung', 'Swakelola'][i % 4],
    jenis_pengadaan: ['Barang', 'Jasa Lainnya', 'Pekerjaan Konstruksi'][i % 3],
    pagu: i % 9 === 0 ? 0 : (i + 3) * 12_500_000,
    total: (i + 1) * 9_000_000,
    status: 'Selesai',
    status_kurasi: i % 3 === 0 ? 'Tidak Akurat' : 'Akurat',
    catatan_kurasi: i % 3 === 0 ? CATATAN[i % CATATAN.length] : null,
    rekomendasi_kurasi: i % 3 === 0 ? REKOMENDASI[i % REKOMENDASI.length] : null,
    is_from_sirup: i % 9 !== 0,
  }));
}

interface KolomSempit {
  tabel: string;
  header: string;
  lebar: number;
  minTerbaca: number;
}

const MARGIN = 40;

/** Gambar seluruh laporan; kembalikan kolom yang terlalu sempit & sel yang lewat margin. */
function periksaTabel(): { sempit: KolomSempit[]; lewatMargin: string[] } {
  const filter = { satker: '', ppk: '' };
  const laporan = buildLaporan({
    agg: aggregate(rows(60), filter),
    scopeLabel: 'Kementerian Ketenagakerjaan',
    filter,
    isFiltered: false,
    canSeePaketDetail: true,
    sections: { itkp: null, risiko: null },
    printedAt: new Date('2026-08-26T07:00:00Z'),
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const sempit = new Map<string, KolomSempit>();
  const lewatMargin: string[] = [];

  // Bungkus autoTable untuk mengintip geometri tiap sel yang benar-benar digambar.
  const mataMata: typeof autoTable = (d, options) => {
    const kepala = options.head?.[0];
    const judul = Array.isArray(kepala) ? String(kepala[kepala.length - 1]) : '?';
    const asli = options.didDrawCell;
    return autoTable(d, {
      ...options,
      didDrawCell: (data) => {
        asli?.(data);

        const pageW = d.internal.pageSize.getWidth();
        const kanan = data.cell.x + data.cell.width;
        if (kanan > pageW - MARGIN + 0.5) {
          lewatMargin.push(`[${judul}] kol ${data.column.index} berakhir di ${kanan.toFixed(1)}pt`);
        }

        if (data.cell.width + 0.5 < data.cell.minReadableWidth) {
          const kunci = `${judul}|${data.column.index}`;
          const header = Array.isArray(kepala) ? String(kepala[data.column.index] ?? '?') : '?';
          const ada = sempit.get(kunci);
          if (!ada || data.cell.minReadableWidth > ada.minTerbaca) {
            sempit.set(kunci, {
              tabel: judul,
              header,
              lebar: data.cell.width,
              minTerbaca: data.cell.minReadableWidth,
            });
          }
        }
      },
    });
  };

  renderLaporan(laporan, { doc, autoTable: mataMata });
  return { sempit: [...sempit.values()], lewatMargin };
}

describe('muat isi tabel', () => {
  const { sempit, lewatMargin } = periksaTabel();

  it('tidak memberi kolom lebar di bawah kata terpanjangnya', () => {
    const rincian = sempit
      .map((s) => `[${s.tabel}] kolom "${s.header}": lebar ${s.lebar.toFixed(1)}pt < butuh ${s.minTerbaca.toFixed(1)}pt`)
      .join('\n');
    expect(sempit.length, `kolom terlalu sempit sehingga kata tercacah di tengah:\n${rincian}`).toBe(0);
  });

  it('tidak menggambar sel yang melewati margin kanan kertas', () => {
    expect(lewatMargin.length, lewatMargin.slice(0, 5).join('\n')).toBe(0);
  });
});
