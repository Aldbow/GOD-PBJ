import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Satker, Package } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const { data, error } = await supabase
      .from('view_dashboard_gabungan_satker')
      .select('*')
      .eq('satker', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ id, name: id, packages: [] });
    }

    const packages: Package[] = data.map((row: any) => {
      const paguNum = Number(row.pagu) || 0;
      const totalNum = Number(row.total) || 0;
      const realisasi = paguNum > 0 ? Math.round((totalNum / paguNum) * 100) : 0;
      
      let risiko: 'tinggi' | 'sedang' | 'rendah' = 'rendah';
      if (paguNum > 1000000000 && realisasi === 0) {
        risiko = 'tinggi';
      } else if (realisasi < 50 && row.status !== 'Selesai' && row.status !== 'COMPLETED') {
        risiko = 'sedang';
      }

      return {
        id: row.kd_rup,
        satkerId: row.satker,
        nama: row.rup_name || 'Tidak Diketahui',
        nilai: paguNum / 1000000000,
        spse: row.status || 'BELUM REALISASI',
        sirup: row.status_aktif_rup === true || row.status_aktif_rup === 'true',
        realisasi: Math.min(realisasi, 100),
        risiko,
        pic: row.nama_ppk || 'Tidak Diketahui'
      };
    });

    const result: Satker = {
      id,
      name: id,
      packages
    };

    return NextResponse.json(result);
  }

  // Fetch unique satker names for dropdown
  const { data, error } = await supabase
    .from('view_dashboard_gabungan_satker')
    .select('satker');
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const satkerSet = new Set(data.map((d: any) => d.satker).filter(Boolean));
  const result = Array.from(satkerSet).map(s => ({
    id: s,
    name: s,
    packages: []
  }));

  // Sort alphabetically
  result.sort((a, b) => (a.name as string).localeCompare(b.name as string));

  return NextResponse.json(result);
}
