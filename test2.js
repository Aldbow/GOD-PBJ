const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data: d1 } = await supabase.from('api_paket_penyedia_terumumkan').select('nama_ppk').limit(1);
  const { data: d2 } = await supabase.from('api_paket_swakelola_terumumkan').select('nama_ppk').limit(1);
  const { data: d3 } = await supabase.from('master_data').select('"KODE PPK"').limit(1);
  console.log('penyedia:', d1);
  console.log('swakelola:', d2);
  console.log('master_data:', d3);
}
test();
