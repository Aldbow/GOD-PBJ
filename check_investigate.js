import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  console.log("Investigating Prioritas Nasional realization...\n");

  // 1. Get some kode_rup from master_data_ro (these are the priority packages)
  const { data: priorityPkgs, error: err1 } = await supabase.from('master_data_ro').select('kode_rup, nama_paket_ro').limit(50);
  if (err1) {
    console.error("Error fetching master_data_ro", err1);
    return;
  }
  
  if (!priorityPkgs || priorityPkgs.length === 0) {
    console.log("No priority packages found in master_data_ro.");
    return;
  }
  
  const rupCodes = priorityPkgs.map(p => p.kode_rup);
  console.log(`Found ${rupCodes.length} priority packages (kode_rup) in master_data_ro.`);

  // 2. Check if any of these kode_rup exist in api_epurchasing
  const { data: epurchasing, error: err2 } = await supabase.from('api_epurchasing')
    .select('kode_rup, total_harga')
    .in('kode_rup', rupCodes);
  
  console.log(`Matched in api_epurchasing: ${epurchasing?.length || 0} packages.`);
  if (epurchasing && epurchasing.length > 0) {
    console.log(epurchasing.slice(0, 3));
  }

  // 3. Check api_pengadaan_langsung
  const { data: pengadaan, error: err3 } = await supabase.from('api_pengadaan_langsung')
    .select('kode_rup, total_realisasi')
    .in('kode_rup', rupCodes);
  
  console.log(`Matched in api_pengadaan_langsung: ${pengadaan?.length || 0} packages.`);
  if (pengadaan && pengadaan.length > 0) {
    console.log(pengadaan.slice(0, 3));
  }

  // 4. Check api_penunjukan_langsung
  const { data: penunjukan, error: err4 } = await supabase.from('api_penunjukan_langsung')
    .select('kode_rup, total_realisasi')
    .in('kode_rup', rupCodes);
  
  console.log(`Matched in api_penunjukan_langsung: ${penunjukan?.length || 0} packages.`);
  if (penunjukan && penunjukan.length > 0) {
    console.log(penunjukan.slice(0, 3));
  }

  // 5. Let's check view_prioritas_nasional directly to see what data type or values it holds
  const { data: viewData, error: err5 } = await supabase.from('view_prioritas_nasional')
    .select('kode_rup, total_realisasi, realisasi_epurchasing, realisasi_pengadaan_langsung, pagu_ro')
    .not('kode_rup', 'is', null)
    .limit(5);

  console.log("\nSample from view_prioritas_nasional:");
  console.log(viewData);
}

investigate();
