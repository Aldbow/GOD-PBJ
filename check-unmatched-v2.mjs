import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  console.log('1. Fetching packages with eselon1 = Tidak Diketahui...');
  const { data: unmatchedPkgs, error: err1 } = await supabase
    .from('view_dashboard_epurchasing_v6')
    .select('kd_rup, rup_name, eselon1, satker, nama_ppk')
    .eq('eselon1', 'Tidak Diketahui');

  if (err1) {
    console.error('Error fetching unmatched:', err1);
    return;
  }
  
  if (!unmatchedPkgs || unmatchedPkgs.length === 0) {
    console.log('No packages found with eselon1 = Tidak Diketahui! The view might not be updated yet.');
    return;
  }

  console.log(`Found ${unmatchedPkgs.length} packages still unknown. Examples:`);
  console.table(unmatchedPkgs.slice(0, 5));

  // Get unique satkers that are failing
  const uniqueSatkers = [...new Set(unmatchedPkgs.map(p => p.satker))];
  console.log('\n2. Unique Satker names that failed to map:');
  console.log(uniqueSatkers);

  console.log('\n3. Searching for these Satker names in master data (using ILIKE)...');
  for (const satker of uniqueSatkers) {
    if (!satker || satker === 'Tidak Diketahui') {
      console.log(`- Satker is "${satker}", which means e-purchasing data doesn't have a satker name either.`);
      continue;
    }
    
    const { data: masterMatch, error: err2 } = await supabase
      .from('view_paket_penyedia_master_data')
      .select('"SATUAN KERJA", "UNIT KERJA"')
      .ilike('"SATUAN KERJA"', `%${satker.substring(0, 10)}%`) // search by first 10 chars to find partial matches
      .limit(3);
      
    if (masterMatch && masterMatch.length > 0) {
      console.log(`\n- Tried searching partial match for "${satker}":`);
      console.table(masterMatch);
    } else {
      console.log(`\n- Tried searching partial match for "${satker}": NO MATCHES AT ALL in master data.`);
    }
  }
}

investigate();
