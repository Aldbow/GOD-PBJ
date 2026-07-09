import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data: allRups, error } = await supabase
    .from('view_paket_penyedia_master_data')
    .select('kd_rup');
    
  console.log(`Total Master RUPs: ${allRups?.length || 0}`);
  
  const { data: lamaRups, error2 } = await supabase
    .from('history_kaji_ulang')
    .select('kd_rup_lama')
    .neq('kd_rup_lama', 'kd_rup_baru'); // supabase js doesn't support col=col natively in .neq, we'll fetch all and filter in JS
}

testFetch();
