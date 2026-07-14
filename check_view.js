const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkView() {
    console.log('Checking view_prioritas_nasional...');
    const { data, error } = await supabase
        .from('view_prioritas_nasional')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching view:', error);
    } else {
        console.log('Success! Data:', data);
    }
}

checkView();
