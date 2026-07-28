import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Fetching from formasi_jf_ukpbj ---');
  let res = await supabase.from('formasi_jf_ukpbj').select('*').limit(3);
  if (res.error) console.error('Error:', res.error);
  else console.log(JSON.stringify(res.data, null, 2));

  console.log('\n--- Fetching from data_jf_kemnaker ---');
  res = await supabase.from('data_jf_kemnaker').select('*').limit(3);
  if (res.error) console.error('Error:', res.error);
  else console.log(JSON.stringify(res.data, null, 2));
}
check();
