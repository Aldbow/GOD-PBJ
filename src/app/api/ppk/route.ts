import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PPK, Package } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const { data, error } = await supabase
      .from('view_dashboard_gabungan_satker')
      .select('*')
      .eq('nama_ppk', id);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const satkerName = data[0].satker;

    // Satu RUP bisa muncul beberapa kali (mis. 1 paket e-purchasing dengan banyak order_id).
    // Gabungkan per kd_rup: jumlahkan realisasi (total) agar hitungan paket & realisasi tidak dobel.
    const byRup = new Map<string, any>();
    for (const row of data as any[]) {
      const key = String(row.kd_rup);
      const existing = byRup.get(key);
      if (existing) {
        existing.total = (Number(existing.total) || 0) + (Number(row.total) || 0);
      } else {
        byRup.set(key, { ...row, total: Number(row.total) || 0 });
      }
    }

    const packages: Package[] = Array.from(byRup.values()).map((row: any) => {
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

    const ppk: PPK = {
      id,
      name: id,
      satkerId: satkerName,
      satkerName: satkerName
    };

    return NextResponse.json({ ppk, packages });
  }

  // Fetch unique PPK names
  const { data, error } = await supabase
    .from('view_dashboard_gabungan_satker')
    .select('nama_ppk, satker');
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduplicate by name
  const ppkMap = new Map<string, PPK>();
  data.forEach((d: any) => {
    if (d.nama_ppk && !ppkMap.has(d.nama_ppk)) {
      ppkMap.set(d.nama_ppk, {
        id: d.nama_ppk,
        name: d.nama_ppk,
        satkerId: d.satker,
        satkerName: d.satker
      });
    }
  });

  const roster = Array.from(ppkMap.values());
  roster.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(roster);
}
