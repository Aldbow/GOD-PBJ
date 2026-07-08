import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gljzrjsxgruqflzxgrvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsanpyanN4Z3J1cWZsenhncnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODg1NzcsImV4cCI6MjA5Nzg2NDU3N30.a2P7CXPIg1uGmEmAtUiZEfTnJCdR1Ef_l9suz3F5uNw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPencatatan() {
  const { count, error } = await supabase
    .from('api_pencatatan_swakelola')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error("Error fetching view:", error);
  } else {
    console.log("Pencatatan count:", count);
  }
}

checkPencatatan();
