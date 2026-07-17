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
            .select('kd_rup')
            .range(offset, offset + limit - 1);
        if (error) { console.error(error); return; }
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < limit) break;
        offset += limit;
    }
    
    let totalRupCodes = 0;
    let totalRows = allData.length;
    let multipleRupCount = 0;
    
    allData.forEach(p => {
        const str = String(p.kd_rup || '');
        const count = str.split(';').length;
        totalRupCodes += count;
        if (count > 1) multipleRupCount++;
    });
    
    console.log(`Total Rows in View: ${totalRows}`);
    console.log(`Total Counted RUP Codes (after split): ${totalRupCodes}`);
    console.log(`Number of Rows with Multiple RUPs: ${multipleRupCount}`);
}

check();
