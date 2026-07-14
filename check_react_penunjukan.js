const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim().replace(/^['"]|['"]$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function checkData() {
  let allData = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('view_dashboard_penunjukan_langsung')
      .select('*')
      .range(offset, offset + limit - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < limit) break;
    offset += limit;
  }
  
  const contextPagu = allData.filter(p => p.is_from_sirup !== false).reduce((s, d) => s + (Number(d.pagu) || 0), 0);
  const contextRealisasi = allData.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const contextRealisasiPencatatan = allData.reduce((s, d) => s + (Number(d.total_pencatatan) || 0), 0);
  const contextRealisasiTransaksional = allData.reduce((s, d) => s + (Number(d.total_transaksional) || 0), 0);
  console.log('Penunjukan Langsung React Simulation:');
  console.log('Realisasi Keseluruhan:', contextRealisasi);
  console.log('Realisasi Pencatatan:', contextRealisasiPencatatan);
  console.log('Realisasi Transaksional:', contextRealisasiTransaksional);
}
checkData();
