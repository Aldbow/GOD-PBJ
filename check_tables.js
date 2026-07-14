import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: ep } = await supabase.from('api_epurchasing').select('kode_rup, nama_paket').limit(2);
  console.log("api_epurchasing sample:", ep?.length ? ep : "EMPTY");

  const { data: pl } = await supabase.from('api_pengadaan_langsung').select('kode_rup, nama_paket').limit(2);
  console.log("api_pengadaan_langsung sample:", pl?.length ? pl : "EMPTY");

  const { data: pl2 } = await supabase.from('api_penunjukan_langsung').select('kode_rup, nama_paket').limit(2);
  console.log("api_penunjukan_langsung sample:", pl2?.length ? pl2 : "EMPTY");
  
  const { data: sw } = await supabase.from('api_swakelola_realisasi').select('kode_rup, nama_paket').limit(2);
  console.log("api_swakelola_realisasi sample:", sw?.length ? sw : "EMPTY");
}
check();
