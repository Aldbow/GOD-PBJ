require('dotenv').config({ path: '.env.local' });

async function getOpenAPI() {
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    
    const data = await res.json();
    const defs = data.definitions;
    
    function printType(viewName, colName) {
      const view = defs[viewName];
      if (!view) {
        console.log(`View ${viewName} not found`);
        return;
      }
      const col = view.properties[colName];
      if (!col) {
        console.log(`Column ${colName} not found in ${viewName}`);
        return;
      }
      console.log(`${viewName}.${colName} is ${col.type} (format: ${col.format})`);
    }

    printType('master_data_ro', 'Kode/ID paket');
    printType('api_paket_penyedia_terumumkan', 'kd_rup');
    printType('api_paket_swakelola_terumumkan', 'kd_rup');
    printType('view_dashboard_swakelola_v1', 'kd_rup');
    printType('view_dashboard_epurchasing_v6', 'kd_rup');
    printType('view_dashboard_pengadaan_langsung', 'kd_rup');
    printType('view_dashboard_penunjukan_langsung', 'kd_rup');
    
  } catch (err) {
    console.error(err.message);
  }
}
getOpenAPI();
