const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function checkMatched() {
  const { data: viewData, error } = await supabase
    .from('view_dashboard_keterisian_sirup_eselon1')
    .select('*');
    
  if(error) {
    console.error("Error fetching view:", error);
    return;
  }

  console.log("Isi dari view_dashboard_keterisian_sirup_eselon1:");
  console.log(viewData);
}

checkMatched();
