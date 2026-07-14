const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data: d1 } = await supabase.from('master_data').select('"KODE PPK", "NAMA PPK"').ilike('"KODE PPK"', 'A%');
  console.log(d1);
}
test();
