const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
    console.log('Checking types...');
    const { data: data1, error: err1 } = await supabase.from('master_data_ro').select('"Kode/ID paket"').limit(1);
    console.log('master_data_ro:', data1, err1);

    const { data: data2, error: err2 } = await supabase.from('api_paket_penyedia_terumumkan').select('kd_rup').limit(1);
    console.log('api_paket_penyedia_terumumkan:', data2, err2);
    
    const { data: data3, error: err3 } = await supabase.from('api_paket_swakelola_terumumkan').select('kd_rup').limit(1);
    console.log('api_paket_swakelola_terumumkan:', data3, err3);
}

checkTypes();
