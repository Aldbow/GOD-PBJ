import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gljzrjsxgruqflzxgrvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsanpyanN4Z3J1cWZsenhncnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODg1NzcsImV4cCI6MjA5Nzg2NDU3N30.a2P7CXPIg1uGmEmAtUiZEfTnJCdR1Ef_l9suz3F5uNw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteNonMatching() {
  console.log("Checking total rows before deletion...");
  
  const { count: countBefore, error: errBefore } = await supabase
    .from('api_paket_penyedia_terumumkan_non')
    .select('*', { count: 'exact', head: true });

  if (errBefore) {
    console.error("Error fetching count:", errBefore);
    return;
  }
  
  console.log(`Total rows before deletion: ${countBefore}`);

  console.log("Deleting rows where metode_pengadaan is NOT 'Dikecualikan' AND NOT 'Pengadaan Langsung'...");
  
  // Note: For large tables, Supabase REST API might limit the number of rows deleted at once, or we might need to delete in batches. 
  // Let's try the simple approach first.
  const { data, error } = await supabase
    .from('api_paket_penyedia_terumumkan_non')
    .delete()
    .neq('metode_pengadaan', 'Dikecualikan')
    .neq('metode_pengadaan', 'Pengadaan Langsung');

  if (error) {
    console.error("Error deleting rows:", error);
    return;
  }

  console.log("Deletion executed successfully.");

  const { count: countAfter, error: errAfter } = await supabase
    .from('api_paket_penyedia_terumumkan_non')
    .select('*', { count: 'exact', head: true });

  if (errAfter) {
    console.error("Error fetching count after deletion:", errAfter);
    return;
  }

  console.log(`Total rows after deletion: ${countAfter}`);
  
  // Let's verify what's left
  const { data: remaining, error: errRem } = await supabase
    .from('api_paket_penyedia_terumumkan_non')
    .select('metode_pengadaan')
    .limit(10);
    
  if (remaining) {
    const uniqueMetode = [...new Set(remaining.map(r => r.metode_pengadaan))];
    console.log("Sample remaining metode_pengadaan:", uniqueMetode);
  }
}

deleteNonMatching();
