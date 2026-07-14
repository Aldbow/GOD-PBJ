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

async function main() {
  console.log("Checking master_data_pn...");
  const { data: pnData, error: pnError } = await supabase.from('master_data_pn').select('*');
  if (pnError) {
    console.error("Error fetching master_data_pn:", pnError);
  } else {
    const realizedPN = pnData.filter(row => {
      const real = row['Realisasi Anggaran'];
      // realisasi anggaran might be "1.250.000.000" or similar string, check if it's not "0" and not empty
      return real && real !== "0" && real !== "" && real !== "-";
    });
    console.log(`master_data_pn: Total rows = ${pnData.length}, Rows with Realisasi Anggaran > 0 = ${realizedPN.length}`);
    if (realizedPN.length > 0) {
      console.log("Sample realized in master_data_pn:", realizedPN.slice(0, 2).map(r => ({
        RO: r['Nama RO'],
        Pagu: r['Pagu (Capaian)'],
        Realisasi: r['Realisasi Anggaran']
      })));
    }
  }

  console.log("\nChecking view_prioritas_nasional...");
  // Check view_prioritas_nasional where total_realisasi > 0
  const { data: viewData, error: viewError } = await supabase.from('view_prioritas_nasional').select('kode_rup, nama_paket_ro, total_realisasi').gt('total_realisasi', 0).limit(5);
  
  if (viewError) {
    console.error("Error fetching view_prioritas_nasional:", viewError);
  } else {
    console.log(`view_prioritas_nasional: Rows with total_realisasi > 0 (showing up to 5) = ${viewData.length}`);
    if (viewData.length > 0) {
      console.log(viewData);
    }
  }
}

main();
