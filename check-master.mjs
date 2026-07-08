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
  console.log('Fetching from master data...');
  const { data, error } = await supabase
    .from('view_paket_penyedia_master_data')
    .select('"SATUAN KERJA", "UNIT KERJA"')
    .ilike('"SATUAN KERJA"', '%INSPEKTORAT%')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.table(data);
}

check();
