const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let allData = [];
    let offset = 0;
    const limit = 1000;
    while(true) {
        const { data, error } = await supabase
            .from('view_dashboard_pengadaan_langsung')
            .select('kd_rup, is_from_sirup')
            .range(offset, offset + limit - 1);
        if (error) { console.error(error); return; }
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < limit) break;
        offset += limit;
    }
    
    let sirupRupCount = 0;
    let nonSirupRupCount = 0;
    let nonSirupRows = 0;
    
    allData.forEach(p => {
        const count = String(p.kd_rup || '').split(';').length;
        if (p.is_from_sirup) {
            sirupRupCount += count;
        } else {
            nonSirupRupCount += count;
            nonSirupRows++;
        }
    });
    
    console.log(`Total RUP dari SIRUP (Kiri): ${sirupRupCount}`);
    console.log(`Total RUP HANYA dari Transaksi (Kanan-only): ${nonSirupRupCount}`);
    console.log(`Total Baris (Kanan-only): ${nonSirupRows}`);
}

check();
