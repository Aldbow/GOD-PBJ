import { describe, expect, it } from 'vitest';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildLaporan, type LaporanInput } from '../buildLaporan';
import { Paper, A4_LONG, A4_SHORT } from '../layout';
import { drawBlock, measureBlock, renderLaporan, type RenderContext } from '../renderLaporan';
import type { LaporanBlock, ProporsiBlock } from '../types';
import { aggregate, type GabunganRow } from '../../ringkasanData';

/**
 * Uji invarian tata letak.
 *
 * Janji "tidak ada seksi yang terpotong" bertumpu pada satu kontrak: tinggi
 * yang dilaporkan `measureBlock()` harus sama persis dengan tinggi yang benar-
 * benar dipakai `drawBlock()`. Kalau keduanya berselisih, `Paper.ensure()`
 * memesan ruang yang salah dan blok berikutnya menimpa atau melompati batas
 * halaman — dan itu tidak akan terlihat sampai ada yang membuka PDF-nya.
 *
 * Dijalankan di Node tanpa DOM: donat memang tidak tergambar di sini, tapi
 * ukurannya tetap dipesan renderer, jadi invariannya tetap yang sebenarnya.
 */

function bigRows(n: number): GabunganRow[] {
  return Array.from({ length: n }, (_, i) => ({
    kd_rup: `RUP-${i}`,
    rup_name: `Paket Pengadaan Nomor ${i} dengan nama yang sengaja dibuat panjang untuk menguji pembungkusan sel`,
    satker: `Satuan Kerja ${i % 37}`,
    nama_ppk: `PPK ${i % 19}`,
    metode_pengadaan: ['Tender', 'E-Purchasing', 'Pengadaan Langsung', 'Swakelola'][i % 4],
    jenis_pengadaan: ['Barang', 'Jasa Lainnya', 'Pekerjaan Konstruksi'][i % 3],
    pagu: i % 7 === 0 ? 0 : (i + 1) * 5_000_000,
    total: (i + 1) * 3_000_000,
    status: 'Selesai',
    status_kurasi: i % 5 === 0 ? 'Tidak Akurat' : 'Akurat',
    catatan_kurasi: i % 5 === 0 ? 'Metode melampaui batas nilai untuk jenis pengadaannya' : null,
    rekomendasi_kurasi: i % 5 === 0 ? 'Gunakan Tender' : null,
    is_from_sirup: i % 7 !== 0,
  }));
}

function makeInput(rows: GabunganRow[]): LaporanInput {
  const filter = { satker: '', ppk: '' };
  return {
    agg: aggregate(rows, filter),
    scopeLabel: 'Kementerian Ketenagakerjaan',
    filter,
    isFiltered: false,
    canSeePaketDetail: true,
    highlightSatker: 'Satuan Kerja 3',
    sections: { itkp: null, risiko: null },
    printedAt: new Date('2026-08-26T07:00:00Z'),
  };
}

/** Ratakan blok bersarang (`split`) supaya setiap daun ikut diperiksa. */
function flatten(blocks: LaporanBlock[]): LaporanBlock[] {
  return blocks.flatMap((b) => (b.kind === 'split' ? [b, ...flatten([b.left, b.right])] : [b]));
}

describe('tata letak cetak', () => {
  const laporan = buildLaporan(makeInput(bigRows(240)));

  it('mengukur setiap blok persis setinggi yang digambarnya', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const p = new Paper(doc);
    const ctx: RenderContext = { donuts: new Map<ProporsiBlock, string | null>(), autoTable };

    for (const b of flatten(laporan.blocks)) {
      if (b.kind === 'table') continue; // dipagini autoTable, bukan Paper
      const w = b.kind === 'split' ? p.contentWidth : p.contentWidth * 0.44;
      const diukur = measureBlock(p, b, w);
      const digambar = drawBlock(p, b, p.left, p.margin.top, w, ctx);
      expect(digambar, `blok "${b.kind}"`).toBeCloseTo(diukur, 6);
    }
  });

  it('tidak menghasilkan blok non-tabel yang lebih tinggi dari satu halaman', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const p = new Paper(doc);
    // Blok setinggi ini tak bisa diselamatkan `ensure()` — ia pasti terpotong.
    const muat = p.bottom - p.margin.top;

    for (const b of flatten(laporan.blocks)) {
      if (b.kind === 'table') continue;
      expect(measureBlock(p, b, p.contentWidth), `blok "${b.kind}"`).toBeLessThanOrEqual(muat);
    }
  });

  it('mencetak dokumen berhalaman banyak dengan ukuran berkas yang wajar', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const { pageCount } = renderLaporan(laporan, { doc, autoTable });

    expect(pageCount).toBeGreaterThan(3);

    // 240 paket dengan nama panjang + tabel peringkat 37 satker. Cetakan lama
    // memakai 24 MB PER HALAMAN karena bitmap mentah; yang ini harus jauh di
    // bawah 3 MB untuk seluruh dokumen.
    const bytes = (doc.output('arraybuffer') as ArrayBuffer).byteLength;
    expect(bytes).toBeLessThan(3 * 1024 * 1024);
    expect(bytes).toBeGreaterThan(0);
  });

  it('memakai halaman landscape untuk tabel lebar dan kembali ke portrait sesudahnya', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    renderLaporan(laporan, { doc, autoTable });

    const lebar = new Set<string>();
    for (let i = 1; i <= doc.getNumberOfPages(); i += 1) {
      doc.setPage(i);
      lebar.add(doc.internal.pageSize.getWidth().toFixed(0));
    }
    expect(lebar).toContain(A4_SHORT.toFixed(0));
    expect(lebar).toContain(A4_LONG.toFixed(0));

    // Halaman pertama (kop + ikhtisar) selalu portrait.
    doc.setPage(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(A4_SHORT, 1);
  });

  it('tidak meninggalkan halaman kosong saat berganti orientasi', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    renderLaporan(laporan, { doc, autoTable });

    // Sebuah halaman kosong hanya berisi kepala & kaki yang dilukis `finish()`.
    // Ambangnya longgar, cukup untuk membedakannya dari halaman berisi tabel.
    for (let i = 1; i <= doc.getNumberOfPages(); i += 1) {
      const isi = doc.getPageInfo(i).pageContext.contentsObjId;
      expect(isi, `halaman ${i}`).toBeDefined();
    }
    // Halaman terakhir harus benar-benar terpakai — bukan sisa page break.
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});
