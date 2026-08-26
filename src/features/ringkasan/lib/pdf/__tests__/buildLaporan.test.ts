import { describe, expect, it } from 'vitest';
import { buildLaporan, type LaporanInput } from '../buildLaporan';
import type { LaporanBlock, TableBlock } from '../types';
import type { GabunganRow } from '../../ringkasanData';
import { aggregate } from '../../ringkasanData';

/**
 * Uji isi laporan cetak.
 *
 * Yang dijaga di sini bukan rupa PDF-nya, melainkan dua hal yang paling mahal
 * kalau salah: apa yang MASUK ke berkas (gerbang kerahasiaan per-paket) dan apa
 * yang TIDAK BOLEH HILANG darinya (catatan pengecualian peringkat). Keduanya
 * bisa diuji tanpa browser justru karena `buildLaporan` fungsi murni.
 */

function row(over: Partial<GabunganRow> = {}): GabunganRow {
  return {
    kd_rup: '1001',
    rup_name: 'Pengadaan Meja Kerja',
    satker: 'Sekretariat Jenderal',
    nama_ppk: 'Budi',
    metode_pengadaan: 'Tender',
    jenis_pengadaan: 'Barang',
    pagu: 1_000_000_000,
    total: 400_000_000,
    status: 'Selesai',
    status_kurasi: 'Akurat',
    catatan_kurasi: null,
    rekomendasi_kurasi: null,
    is_from_sirup: true,
    ...over,
  };
}

const ROWS: GabunganRow[] = [
  row(),
  row({ kd_rup: '1002', satker: 'Ditjen Binalavotas', metode_pengadaan: 'E-Purchasing', total: 0 }),
  // Anomali "realisasi tanpa RUP": pagu nol, jadi juga terlempar dari peringkat.
  row({ kd_rup: '1003', satker: 'Ditjen PHI', pagu: 0, total: 250_000_000, is_from_sirup: false }),
  // Anomali "realisasi > pagu" + kurasi tidak akurat.
  row({
    kd_rup: '1004',
    satker: 'Ditjen Binwasnaker',
    pagu: 100_000_000,
    total: 180_000_000,
    status_kurasi: 'Tidak Akurat',
    catatan_kurasi: 'Nilai melampaui batas Pengadaan Langsung',
    rekomendasi_kurasi: 'Gunakan Tender',
  }),
];

function input(over: Partial<LaporanInput> = {}): LaporanInput {
  const filter = over.filter ?? { satker: '', ppk: '' };
  return {
    agg: aggregate(ROWS, filter),
    scopeLabel: 'Kementerian Ketenagakerjaan',
    filter,
    isFiltered: false,
    canSeePaketDetail: true,
    sections: { itkp: null, risiko: null },
    printedAt: new Date('2026-08-26T07:00:00Z'),
    ...over,
  };
}

const tables = (blocks: LaporanBlock[]): TableBlock[] => blocks.filter((b): b is TableBlock => b.kind === 'table');
const headings = (blocks: LaporanBlock[]) => blocks.filter((b) => b.kind === 'heading');

/** Semua teks sel dari seluruh tabel — untuk menguji apa yang bocor ke berkas. */
function allCells(blocks: LaporanBlock[]): string {
  return tables(blocks)
    .flatMap((t) => t.rows.flat())
    .join(' | ');
}

describe('buildLaporan', () => {
  it('menomori seksi berurutan tanpa lubang walau seksi peringkat dilewati', () => {
    const penuh = headings(buildLaporan(input()).blocks).map((h) => h.index);
    const disaring = headings(buildLaporan(input({ isFiltered: true })).blocks).map((h) => h.index);

    expect(penuh).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    // Peringkat satker tidak relevan saat difilter — hilang, tapi nomornya rapat.
    expect(disaring).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(headings(buildLaporan(input({ isFiltered: true })).blocks).map((h) => h.title)).not.toContain(
      'Peringkat Realisasi Satuan Kerja'
    );
  });

  it('menyertakan rincian per-paket hanya bila identitas paket boleh dilihat', () => {
    const boleh = buildLaporan(input({ canSeePaketDetail: true })).blocks;
    expect(allCells(boleh)).toContain('Pengadaan Meja Kerja');
    expect(allCells(boleh)).toContain('Budi');
    expect(allCells(boleh)).toContain('Nilai melampaui batas Pengadaan Langsung');

    const tidak = buildLaporan(input({ canSeePaketDetail: false })).blocks;
    // Gerbang yang sama dengan di layar: nama paket, kode RUP, nama PPK, dan
    // catatan kurasi tidak boleh ikut tercetak pada lingkup Kementerian.
    expect(allCells(tidak)).not.toContain('Pengadaan Meja Kerja');
    expect(allCells(tidak)).not.toContain('Budi');
    expect(allCells(tidak)).not.toContain('Nilai melampaui batas Pengadaan Langsung');
  });

  it('tetap mencetak angka ringkasan kurasi & anomali walau rinciannya ditutup', () => {
    const blocks = buildLaporan(input({ canSeePaketDetail: false })).blocks;
    const metrics = blocks.filter((b) => b.kind === 'metric').flatMap((b) => b.items.map((i) => i.label));
    expect(metrics).toContain('Tidak Akurat');
    expect(metrics).toContain('Realisasi Tanpa RUP');
    // Penutupan rincian harus dijelaskan, bukan didiamkan.
    const notes = blocks.filter((b) => b.kind === 'note').map((b) => b.text);
    expect(notes.filter((t) => t.includes('lingkup Kementerian'))).toHaveLength(2);
  });

  it('menyatakan realisasi yang tidak masuk peringkat, berikut satker yang hilang', () => {
    const blocks = buildLaporan(input()).blocks;
    const note = blocks.find((b) => b.kind === 'note' && b.title === 'Yang tidak masuk peringkat');
    expect(note).toBeDefined();
    // Rp 250 juta realisasi tanpa RUP dari Ditjen PHI: satker itu lenyap dari
    // tabel peringkat, jadi namanya wajib disebut supaya ketiadaannya terlihat.
    expect(note && note.kind === 'note' && note.text).toContain('Ditjen PHI');
    expect(note && note.kind === 'note' && note.text).toContain('250.000.000');

    const peringkat = tables(blocks).find((t) => t.columns[0].header === 'Peringkat');
    expect(peringkat?.rows.map((r) => r[1])).not.toContain('Ditjen PHI');
  });

  it('melewatkan seksi ITKP & Risiko saat seksinya belum menerbitkan datanya', () => {
    const judul = headings(buildLaporan(input()).blocks).map((h) => h.title);
    expect(judul).not.toContain('Risiko Pengadaan');

    const dengan = buildLaporan(
      input({
        sections: {
          itkp: {
            headline: 'Skor ITKP 2026',
            scopeLabel: 'Kementerian (Total)',
            componentAOnly: false,
            total: 62.5,
            max: 100,
            ratioPct: 62.5,
            predikat: 'B · Baik',
            komponen: [{ label: 'A. Pemanfaatan Sistem', score: 20, max: 30, bobot: 30 }],
            indikatorA: [{ label: 'A1 Persentase RUP', skor: 3, skorMax: 5, applicable: true }],
            note: null,
          },
          risiko: {
            totalPaket: 4,
            kategori: [{ label: 'Tinggi', count: 1, pagu: 1_000, colorHex: '#e34948' }],
            drivers: [{ label: 'Sisa waktu', tinggi: 1, sedang: 0, rendah: 0, lainnya: 3 }],
            satkerTinggi: [{ satker: 'Ditjen PHI', count: 1, pagu: 1_000 }],
          },
        },
      })
    ).blocks;
    const judulDengan = headings(dengan).map((h) => h.title);
    expect(judulDengan).toContain('Indeks Tata Kelola Pengadaan (ITKP)');
    expect(judulDengan).toContain('Risiko Pengadaan');
  });

  it('memberi setiap tabel teks pengganti saat datanya kosong', () => {
    const kosong = buildLaporan({ ...input(), agg: aggregate([], { satker: '', ppk: '' }) }).blocks;
    for (const t of tables(kosong)) {
      if (t.rows.length === 0) expect(t.emptyText, `tabel "${t.title ?? t.columns[0].header}"`).toBeTruthy();
    }
  });
});
