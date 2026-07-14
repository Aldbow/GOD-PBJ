const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data: d1 } = await supabase.from('view_paket_penyedia_master_data').select('kd_rup, "MASTER_NAMA_PPK"').eq('kd_rup', 62084433);
  console.log('m:', d1);
}
test();
