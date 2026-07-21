const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function checkKpaMatch() {
  const { data: afirmasi, error: err1 } = await supabase
    .from('data_afirmasi_pdn_perencanaan')
    .select('nama_satuan_kerja');

  const { data: master, error: err2 } = await supabase
    .from('master_data')
    .select('"SATUAN KERJA", "SATKER", "KPA", "UNIT KERJA"');

  const unmatched = [];
  
  for (const af of afirmasi) {
      if (!af.nama_satuan_kerja) continue;
      
      const afName = af.nama_satuan_kerja.trim().toUpperCase();
      
      const isMatched = master.some(m => {
          const satKerja = m['SATUAN KERJA'] ? m['SATUAN KERJA'].trim().toUpperCase() : '';
          const satker = m['SATKER'] ? m['SATKER'].trim().toUpperCase() : '';
          const kpa = m['KPA'] ? m['KPA'].trim().toUpperCase() : '';
          
          return satKerja === afName || satker === afName || kpa === afName;
      });
      
      if (!isMatched) {
          unmatched.push(afName);
      }
  }

  console.log(`Total Afirmasi: ${afirmasi.length}`);
  console.log(`Total Tidak Cocok: ${unmatched.length}`);
  if (unmatched.length > 0) {
      console.log('Unmatched:', unmatched);
  } else {
      console.log('Semua cocok!');
  }
}

checkKpaMatch();
