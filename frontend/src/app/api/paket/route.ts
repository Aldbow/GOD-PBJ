import { NextResponse } from 'next/server';
import { satkerData } from '../db';
import { Package } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Simulate network delay for premium loading animations
  await new Promise(resolve => setTimeout(resolve, 600));

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  let foundPkg: Package | null = null;
  let satkerName = '';
  
  for (const satker of Object.values(satkerData)) {
    const pkg = satker.packages.find(p => p.id === id);
    if (pkg) {
      foundPkg = { ...pkg };
      satkerName = satker.name;
      break;
    }
  }

  if (!foundPkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Attach dynamic dummy details
  foundPkg.deskripsi = `Paket ${foundPkg.nama} ini dikelola oleh ${satkerName} dan bertujuan untuk mendukung efektivitas serta efisiensi operasional Kementerian. Pelaksanaan proyek ini sangat vital bagi pencapaian target Indikator Kinerja Utama (IKU).`;
  
  if (foundPkg.risiko === 'tinggi') {
    foundPkg.alasanRisiko = 'Terjadi keterlambatan pada tahapan sebelumnya. Dokumen spesifikasi teknis mengalami revisi berulang, dan terdapat indikasi penumpukan pencairan dana di akhir tahun yang berpotensi menyebabkan masalah likuiditas atau gagal kontrak.';
  } else if (foundPkg.risiko === 'sedang') {
    foundPkg.alasanRisiko = 'Proses berjalan, namun ada keterlambatan minor. Beberapa penyesuaian terkait integrasi data SIRUP belum terpublikasi secara sempurna atau progres fisik yang sedikit meleset dari kurva ideal.';
  } else {
    foundPkg.alasanRisiko = 'Paket berjalan dengan sangat baik sesuai timeline rencana kerja. Tidak teridentifikasi adanya risiko signifikan yang dapat menghambat pelaksanaan pengadaan.';
  }

  foundPkg.timeline = [
    { date: '12 Jan 2026', event: 'Perencanaan dan Pengumuman RUP' },
    { date: '28 Feb 2026', event: 'Persiapan Pengadaan (Reviu Dokumen)' },
    { date: '15 Mar 2026', event: 'Pelaksanaan Pemilihan Penyedia' },
    { date: '10 Apr 2026', event: 'Penandatanganan Kontrak' },
    { date: 'Saat ini', event: `Status: ${foundPkg.spse}` }
  ];

  return NextResponse.json({ ...foundPkg, satkerName });
}
