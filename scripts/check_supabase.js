const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['\"]|['\"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const tables = ['api_paket_penyedia_terumumkan', 'master_data', 'paket_e_purchasing', 'pencatatan_non_tender_realisasi', 'non_tender_selesai', 'view_dashboard_pengadaan_langsung'];
async function check() {
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log('Error in table', table, ':', error.message);
    } else {
      console.log('Table', table, 'exists. Columns:', data.length > 0 ? Object.keys(data[0]).join(', ') : 'Empty table but exists');
    }
  }
}
check();
