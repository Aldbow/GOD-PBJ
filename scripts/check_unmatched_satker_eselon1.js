const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function checkUnmatched() {
  // Fetch all afirmasi
  const { data: afirmasi, error: err1 } = await supabase
    .from('data_afirmasi_pdn_perencanaan')
    .select('nama_satuan_kerja');
    
  if(err1) {
    console.error("Error fetching afirmasi:", err1);
    return;
  }

  // Fetch all master data
  const { data: master, error: err2 } = await supabase
    .from('master_data')
    .select('"SATUAN KERJA", "SATKER", "UNIT KERJA"');
    
  if(err2) {
    console.error("Error fetching master:", err2);
    return;
  }

  // Perform client-side join mimicking the SQL
  const unmatched = [];
  
  for (const af of afirmasi) {
      if (!af.nama_satuan_kerja) continue;
      
      const afName = af.nama_satuan_kerja.trim().toUpperCase();
      
      const isMatched = master.some(m => {
          const satKerja = m['SATUAN KERJA'] ? m['SATUAN KERJA'].trim().toUpperCase() : '';
          const satker = m['SATKER'] ? m['SATKER'].trim().toUpperCase() : '';
          return satKerja === afName || satker === afName;
      });
      
      if (!isMatched) {
          unmatched.push(af.nama_satuan_kerja);
      }
  }

  console.log(`\nTotal Satker di Afirmasi: ${afirmasi.length}`);
  console.log(`Total Tidak Cocok: ${unmatched.length}`);
  
  if (unmatched.length > 0) {
      console.log('\nDaftar Satker yang Anomali / Tidak Cocok:');
      unmatched.forEach((name, i) => {
          console.log(`${i+1}. ${name}`);
      });
  }
}

checkUnmatched();
