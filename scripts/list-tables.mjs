import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('get_tables'); // Or try to query information_schema if possible, but JS client won't allow information_schema.
  
  // Actually, we can fetch all tables by introspecting or we can just query some common names
  const possibleNames = [
    'master_data', 'master_data_ppk', 'ppk', 'data_ppk', 'master_ppk', 'master_pegawai', 'master_user'
  ];
  
  for (const name of possibleNames) {
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (!error) {
      console.log(`Table exists: ${name}`);
      console.log('Columns:', Object.keys(data[0] || {}).join(', '));
    }
  }
}

main();
