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

async function fetchSamples() {
  const { data: data1, error: error1 } = await supabase
    .from('api_paket_penyedia_terumumkan')
    .select('*')
    .limit(1);
    
  if (error1) {
    console.error('Error fetching api_rup_terumumkan:', error1);
  } else {
    console.log('Sample api_rup_terumumkan:');
    console.log(JSON.stringify(data1, null, 2));
  }
  
  const { data: data2, error: error2 } = await supabase
    .from('master_data_ro')
    .select('*')
    .limit(1);
    
  if (error2) {
    console.error('Error fetching master_data_ro:', error2);
  } else {
    console.log('Sample master_data_ro:');
    console.log(JSON.stringify(data2, null, 2));
  }
}

fetchSamples();
