const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['\"]|['\"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function check() {
  const rup = '62549978';
  
  const { data: apiData } = await supabase.from('api_paket_penyedia_terumumkan').select('kd_rup, nama_ppk, kd_satker_str, nama_satker, metode_pengadaan').eq('kd_rup', rup);
  console.log('--- api_paket_penyedia_terumumkan ---');
  console.log(apiData);

  if (apiData && apiData.length > 0) {
    const { data: masterData } = await supabase.from('master_data').select('\"KODE SATKER_str\", \"NAMA PPK\", \"SATUAN KERJA\"').eq('\"KODE SATKER_str\"', apiData[0].kd_satker_str);
    console.log('--- master_data (matched by kd_satker_str) ---');
    console.log(masterData);
  }

  const { data: viewMaster } = await supabase.from('view_paket_penyedia_master_data').select('kd_rup, nama_ppk, \"MASTER_NAMA_PPK\"').eq('kd_rup', rup);
  console.log('--- view_paket_penyedia_master_data ---');
  console.log(viewMaster);

  const { data: viewPengadaan } = await supabase.from('view_dashboard_pengadaan_langsung').select('kd_rup, nama_ppk, satker').eq('kd_rup', rup);
  console.log('--- view_dashboard_pengadaan_langsung ---');
  console.log(viewPengadaan);
  
  const { data: viewPenunjukan } = await supabase.from('view_dashboard_penunjukan_langsung').select('kd_rup, nama_ppk, satker').eq('kd_rup', rup);
  console.log('--- view_dashboard_penunjukan_langsung ---');
  console.log(viewPenunjukan);
  
  const { data: viewGabungan } = await supabase.from('view_dashboard_gabungan_satker').select('kd_rup, nama_ppk, satker, metode_pengadaan').eq('kd_rup', rup);
  console.log('--- view_dashboard_gabungan_satker ---');
  console.log(viewGabungan);
}
check();
