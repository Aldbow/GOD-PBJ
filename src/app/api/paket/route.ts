import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getApiProfile } from '@/lib/auth/dal';
import { Package } from '@/types';

export async function GET(request: Request) {
  const profile = await getApiProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  let query = supabase
    .from('view_dashboard_gabungan_satker')
    .select('*')
    .eq('kd_rup', id);

  // Scope PPK: hanya boleh melihat paket miliknya sendiri.
  if (profile.role === 'ppk') {
    query = query.eq('nama_ppk', profile.ppk_name);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const paguNum = Number(data.pagu) || 0;
  const totalNum = Number(data.total) || 0;
  const realisasi = paguNum > 0 ? Math.round((totalNum / paguNum) * 100) : 0;
  
  let risiko: 'tinggi' | 'sedang' | 'rendah' = 'rendah';
  if (paguNum > 1000000000 && realisasi === 0) {
    risiko = 'tinggi';
  } else if (realisasi < 50 && data.status !== 'Selesai' && data.status !== 'COMPLETED') {
    risiko = 'sedang';
  }

  let alasanRisiko = 'Paket berjalan dengan wajar sesuai timeline rencana kerja.';
  if (risiko === 'tinggi') {
    alasanRisiko = 'Terindikasi penumpukan pencairan dana di akhir tahun atau hambatan kontraktual serius karena realisasi 0% pada pagu di atas 1 Miliar.';
  } else if (risiko === 'sedang') {
    alasanRisiko = 'Progres fisik/keuangan sedikit meleset dari kurva ideal. Perlu pengawasan lebih ketat terhadap komitmen penyedia.';
  }

  const foundPkg: Package = {
    id: data.kd_rup,
    satkerId: data.satker,
    nama: data.rup_name || 'Tidak Diketahui',
    nilai: paguNum / 1000000000,
    spse: data.status || 'BELUM REALISASI',
    sirup: data.status_aktif_rup === true || data.status_aktif_rup === 'true',
    realisasi: Math.min(realisasi, 100),
    risiko,
    pic: data.nama_ppk || 'Tidak Diketahui',
    deskripsi: `Paket ${data.rup_name || ''} ini dikelola oleh ${data.satker} melalui metode ${data.metode_pengadaan}. Proyek ini vital bagi pencapaian target Indikator Kinerja Utama.`,
    alasanRisiko,
    timeline: [
      { date: 'Sesuai SIRUP', event: 'Perencanaan dan Pengumuman RUP' },
      { date: 'Otomatis', event: `Metode: ${data.metode_pengadaan}` },
      { date: 'Saat ini', event: `Status: ${data.status || 'BELUM REALISASI'}` }
    ]
  };

  return NextResponse.json({ ...foundPkg, satkerName: data.satker });
}
