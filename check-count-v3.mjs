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
  console.log('Querying grouped e-purchasing...');
  // We can't query the subquery directly with anon key easily via SDK unless we make a view.
  // But we know that e-purchasing packages that matched master data are (Total 1477 - 3 unmatched) = 1474 master data + 3 unmatched = 1477.
  // Wait, the view does a FULL OUTER JOIN between `view_paket_penyedia_master_data` (metode = E-Purchasing) AND `mapped_e`.
  // Master data count = 1474. 
  // If FULL OUTER JOIN gives 1477, it means ALL 1474 master data packages are kept (whether they have e-purchasing realisasi or not).
  // AND there are 3 e-purchasing packages that didn't find a master data match. (1474 + 3 = 1477).
}
