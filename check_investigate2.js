import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  const { data: priorityPkgs } = await supabase.from('master_data_ro').select('"Kode/ID paket", "Nama paket"');
  
  if (!priorityPkgs) return;
  const rupCodes = priorityPkgs.map(p => p['Kode/ID paket']).filter(Boolean);
  console.log(`Checking realization for ${rupCodes.length} packages...`);

  // Check api_epurchasing
  const { data: epurchasing } = await supabase.from('api_epurchasing')
    .select('kode_rup, total_harga')
    .in('kode_rup', rupCodes);
  console.log(`Matched in api_epurchasing: ${epurchasing?.length || 0} packages. Total realized:`, epurchasing?.reduce((sum, item) => sum + Number(item.total_harga || 0), 0));

  // Check api_pengadaan_langsung
  const { data: pengadaan } = await supabase.from('api_pengadaan_langsung')
    .select('kode_rup, total_realisasi')
    .in('kode_rup', rupCodes);
  console.log(`Matched in api_pengadaan_langsung: ${pengadaan?.length || 0} packages. Total realized:`, pengadaan?.reduce((sum, item) => sum + Number(item.total_realisasi || 0), 0));

  // Check api_penunjukan_langsung
  const { data: penunjukan } = await supabase.from('api_penunjukan_langsung')
    .select('kode_rup, total_realisasi')
    .in('kode_rup', rupCodes);
  console.log(`Matched in api_penunjukan_langsung: ${penunjukan?.length || 0} packages. Total realized:`, penunjukan?.reduce((sum, item) => sum + Number(item.total_realisasi || 0), 0));
  
  // Check swakelola
  const { data: swakelola } = await supabase.from('api_swakelola_realisasi')
    .select('kode_rup, total_realisasi')
    .in('kode_rup', rupCodes);
  console.log(`Matched in api_swakelola_realisasi: ${swakelola?.length || 0} packages. Total realized:`, swakelola?.reduce((sum, item) => sum + Number(item.total_realisasi || 0), 0));
}

investigate();
