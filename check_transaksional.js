const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function checkData() {
  const res1 = await supabase.from('view_dashboard_pengadaan_langsung').select('pagu, total, total_pencatatan, total_transaksional');
  const sumPagu1 = res1.data.reduce((s, d) => s + (Number(d.pagu) || 0), 0);
  const sumTotal1 = res1.data.reduce((s, d) => s + (Number(d.total) || 0), 0);
  console.log('Pengadaan Langsung - Pagu:', sumPagu1, 'Total:', sumTotal1);

  const res2 = await supabase.from('view_dashboard_penunjukan_langsung').select('pagu, total, total_pencatatan, total_transaksional');
  const sumPagu2 = res2.data.reduce((s, d) => s + (Number(d.pagu) || 0), 0);
  const sumTotal2 = res2.data.reduce((s, d) => s + (Number(d.total) || 0), 0);
  console.log('Penunjukan Langsung - Pagu:', sumPagu2, 'Total:', sumTotal2);
}
checkData();
