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
            .from('view_api_paket_pengadaan_langsung')
            .select('pagu')
            .range(offset, offset + limit - 1);
        if (error) { console.error(error); return; }
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < limit) break;
        offset += limit;
    }
    
    let totalPagu = 0;
    
    allData.forEach(p => {
        totalPagu += Number(p.pagu) || 0;
    });
    
    console.log(`Total Pagu di view_api_paket_pengadaan_langsung: Rp ${totalPagu.toLocaleString('id-ID')}`);
}

check();
