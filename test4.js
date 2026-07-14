const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data: d1 } = await supabase.from('api_paket_penyedia_terumumkan').select('nama_ppk').eq('kd_rup', 62084433);
  const ppk = d1[0].nama_ppk;
  const { data: d2 } = await supabase.from('master_data').select('"NAMA PPK"').eq('"KODE PPK"', ppk);
  console.log('ppk:', ppk);
  console.log('master_data match:', d2);
}
test();
