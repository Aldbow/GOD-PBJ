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

async function check() {
  console.log('Fetching Eselon 1 = Tidak Diketahui...');
  const { data, error } = await supabase
    .from('view_dashboard_epurchasing_v6')
    .select('kd_rup, rup_name, eselon1, satker, nama_ppk')
    .eq('eselon1', 'Tidak Diketahui')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} records. Examples:`);
  console.table(data);
}

check();
