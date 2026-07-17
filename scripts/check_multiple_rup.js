const fs = require('fs');

function checkFile(filename, rupColName, delim = ';') {
    if (!fs.existsSync(filename)) {
        console.log(`[!] File tidak ditemukan: ${filename}`);
        return;
    }
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    if (lines.length === 0) return;
    
    // Parse header to find the index of kd_rup
    let headerStr = lines[0].trim();
    let headers = [];
    let curr = '';
    let inQuotes = false;
    for (let c = 0; c < headerStr.length; c++) {
        if (headerStr[c] === '"') inQuotes = !inQuotes;
        else if (headerStr[c] === delim && !inQuotes) {
            headers.push(curr);
            curr = '';
        } else {
            curr += headerStr[c];
        }
    }
    headers.push(curr);
    
    let rupIdx = headers.indexOf(rupColName);
    if (rupIdx === -1) {
        console.log(`[!] Kolom ${rupColName} tidak ditemukan di ${filename}. Kolom yang ada: ${headers.slice(0,5).join(', ')}...`);
        // fallback search for 'kd_rup'
        rupIdx = headers.indexOf('kd_rup');
        if (rupIdx === -1) return;
    }
    
    let found = [];
    
    for (let i = 1; i < lines.length; i++) {
        let row = lines[i].trim();
        if (!row) continue;
        
        let cols = [];
        let curStr = '';
        let quotes = false;
        for (let c = 0; c < row.length; c++) {
            if (row[c] === '"') quotes = !quotes;
            else if (row[c] === delim && !quotes) {
                cols.push(curStr);
                curStr = '';
            } else {
                curStr += row[c];
            }
        }
        cols.push(curStr);
        
        let val = cols[rupIdx];
        if (val) {
            val = val.trim();
            // In Indonesian formatted CSVs, if there's a semicolon inside the value, it's either wrapped in quotes,
            // or if the delimiter is semicolon, the parsing might handle it.
            // Let's check if the value contains any non-digit character like a comma or semicolon
            // Since we parsed by semicolon (outside quotes), a semicolon inside quotes would be retained here.
            if (val.includes(';') || val.includes(',')) {
                found.push({ line: i+1, val: val });
            }
        }
    }
    
    console.log(`\n=== Hasil untuk ${filename} (Kolom: ${headers[rupIdx]}) ===`);
    if (found.length > 0) {
        console.log(`Ditemukan ${found.length} data dengan pemisah (, atau ;) di dalam nilai RUP:`);
        console.log(found.slice(0, 10)); // print first 10
    } else {
        console.log(`Aman! Tidak ditemukan karakter pemisah pada RUP.`);
    }
}

// Check data transaksional
checkFile('data/non-tender-selesai_2026.csv', 'kd_rup');
checkFile('data/epurchasing-selesai_2026.csv', 'kd_rup');
checkFile('data/swakelola-selesai_2026.csv', 'kd_rup');

// Check data pencatatan
checkFile('data/pencatatan-non-tender-realisasi_2026.csv', 'kd_rup_paket');
checkFile('data/pencatatan-swakelola-realisasi_2026.csv', 'kd_rup');
