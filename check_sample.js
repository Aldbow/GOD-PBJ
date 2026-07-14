import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: ro } = await supabase.from('master_data_ro').select('"Kode/ID paket", "Nama paket"').limit(2);
  console.log("Sample from master_data_ro:");
  console.log(ro);

  const { data: ep } = await supabase.from('api_epurchasing').select('kode_rup, nama_paket').limit(2);
  console.log("\nSample from api_epurchasing:");
  console.log(ep);

  // Are there any common ones if we just do a direct query string vs number?
  // Let's just pick one kode_rup from epurchasing and see if it's in master_data_ro
  if (ep && ep.length > 0) {
    const ep_kode = ep[0].kode_rup;
    console.log(`\nIs kode_rup ${ep_kode} in master_data_ro?`);
    const { data: checkMatch } = await supabase.from('master_data_ro').select('*').eq('Kode/ID paket', ep_kode);
    console.log("Result:", checkMatch);
  }
}
check();
