import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gljzrjsxgruqflzxgrvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsanpyanN4Z3J1cWZsenhncnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODg1NzcsImV4cCI6MjA5Nzg2NDU3N30.a2P7CXPIg1uGmEmAtUiZEfTnJCdR1Ef_l9suz3F5uNw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('api_paket_penyedia_terumumkan_non')
    .select('*')
    .limit(5);

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
    console.log("Sample Data:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("Table is empty or doesn't exist");
  }
}

check();
