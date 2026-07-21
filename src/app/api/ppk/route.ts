import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getApiProfile } from '@/lib/auth/dal';
import { PPK, Package } from '@/types';

export async function GET(request: Request) {
  const profile = await getApiProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Detail satu PPK. Untuk role ppk, target dipaksa ke ppk_name miliknya
  // (abaikan id yang diminta agar tak bisa mengintip PPK lain).
  if (id) {
    const targetId = profile.role === 'ppk' ? (profile.ppk_name as string) : id;
    const { data, error } = await supabase
      .from('view_dashboard_gabungan_satker')
      .select('*')
      .eq('nama_ppk', targetId);

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
        pic: row.nama_ppk || 'Tidak Diketahui',
        metode: row.metode_pengadaan || 'Lainnya'
      };
    });

    const ppk: PPK = {
      id: targetId,
      name: targetId,
      satkerId: satkerName,
      satkerName: satkerName
    };

    return NextResponse.json({ ppk, packages });
  }

  // Roster PPK. Untuk role ppk, batasi ke PPK-nya sendiri (array 1 entri).
  // Query dipaginasi manual karena PostgREST membatasi satu response maksimal
  // 1000 baris, sedangkan view ini granular per-paket (bisa jauh lebih dari itu).
  const rosterRows: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    let page = supabase
      .from('view_dashboard_gabungan_satker')
      .select('nama_ppk, satker')
      .range(offset, offset + pageSize - 1);
    if (profile.role === 'ppk') {
      page = page.eq('nama_ppk', profile.ppk_name);
    }
    const { data: rows, error } = await page;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!rows || rows.length === 0) break;
    rosterRows.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  // Deduplicate by name
  const ppkMap = new Map<string, PPK>();
  rosterRows.forEach((d: any) => {
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
