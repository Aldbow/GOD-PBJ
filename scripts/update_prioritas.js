const fs = require('fs');
let code = fs.readFileSync('src/features/prioritas-nasional/components/PrioritasNasionalView.tsx', 'utf-8');

code = code.replace(
  /import \{ Package, Wallet, TrendingUp, ListTodo, Star \} from 'lucide-react';/,
  "import { Package, Wallet, TrendingUp, ListTodo, Star } from 'lucide-react';\nimport { InsightRO } from './InsightRO';\nimport { InsightSkema } from './InsightSkema';"
);

code = code.replace(
  /const selectedEselon1 = searchParams\.get\('e1'\) \|\| null;/,
  "const selectedRO = searchParams.get('ro') || null;\n  const selectedEselon1 = searchParams.get('e1') || null;"
);

code = code.replace(
  /const baseData = data\.filter\(\(p\) => \{\n    const matchesEselon1 = !selectedEselon1 \|\| p\.eselon1 === selectedEselon1;/,
  "const baseData = data.filter((p) => {\n    const matchesRO = !selectedRO || p.ro_name === selectedRO;\n    const matchesEselon1 = !selectedEselon1 || p.eselon1 === selectedEselon1;"
);
code = code.replace(
  /return matchesEselon1 && matchesSatker && matchesPPK;\n  \}\);/,
  "return matchesRO && matchesEselon1 && matchesSatker && matchesPPK;\n  });"
);

code = code.replace(
  /if \(!selectedEselon1\) \{\n    viewMode = 'ESELON1';/,
  `if (!selectedRO) {
    viewMode = 'RO';
    const groups: Record<string, any> = {};
    filteredData.forEach(p => {
      const key = p.ro_name;
      if (!groups[key]) groups[key] = { name: key, totalPagu: 0, totalRealisasi: 0, count: 0 };
      groups[key].totalPagu += (p.pagu || 0);
      groups[key].totalRealisasi += (p.total || 0);
      groups[key].count += 1;
    });
    groupedData = sortGroupedData(groups);
  } else if (!selectedEselon1) {
    viewMode = 'ESELON1';`
);

code = code.replace(
  /if \(viewMode === 'ESELON1'\) params\.set\('e1', name\);/,
  "if (viewMode === 'RO') params.set('ro', name);\n    else if (viewMode === 'ESELON1') params.set('e1', name);"
);

code = code.replace(
  /if \(level === 'ALL'\) \{\n      params\.delete\('e1'\);\n      params\.delete\('s'\);\n      params\.delete\('p'\);\n    \} else if \(level === 'ESELON1'\) \{/,
  `if (level === 'ALL') {
      params.delete('ro');
      params.delete('e1');
      params.delete('s');
      params.delete('p');
    } else if (level === 'RO') {
      params.delete('e1');
      params.delete('s');
      params.delete('p');
    } else if (level === 'ESELON1') {`
);

code = code.replace(
  /useEffect\(\(\) => \{\n    setCurrentPage\(1\);\n  \}, \[searchQuery, sortBy, selectedEselon1, selectedSatker, selectedPPK\]\);/,
  "useEffect(() => {\n    setCurrentPage(1);\n  }, [searchQuery, sortBy, selectedRO, selectedEselon1, selectedSatker, selectedPPK]);"
);

const oldBreadcrumb = `{selectedEselon1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
              <button onClick={() => handleBreadcrumbClick('ALL')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Semua Eselon 1</button>
              <span>/</span>
              {selectedSatker ? (
                <>
                  <button onClick={() => handleBreadcrumbClick('ESELON1')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>{selectedEselon1}</button>
                  <span>/</span>
                  {selectedPPK ? (
                    <>
                      <button onClick={() => handleBreadcrumbClick('SATKER')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>{selectedSatker}</button>
                      <span>/</span>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedPPK}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-primary)' }}>{selectedSatker}</span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--text-primary)' }}>{selectedEselon1}</span>
              )}
            </div>
          )}`;

const newBreadcrumb = `{selectedRO && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
              <button onClick={() => handleBreadcrumbClick('ALL')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Semua Rincian Output</button>
              <span>/</span>
              {selectedEselon1 ? (
                <>
                  <button onClick={() => handleBreadcrumbClick('RO')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }} title={selectedRO}>{selectedRO.length > 20 ? selectedRO.substring(0, 20) + '...' : selectedRO}</button>
                  <span>/</span>
                  {selectedSatker ? (
                    <>
                      <button onClick={() => handleBreadcrumbClick('ESELON1')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }} title={selectedEselon1}>{selectedEselon1.length > 20 ? selectedEselon1.substring(0, 20) + '...' : selectedEselon1}</button>
                      <span>/</span>
                      {selectedPPK ? (
                        <>
                          <button onClick={() => handleBreadcrumbClick('SATKER')} style={{ background: 'none', border: 'none', color: 'var(--info-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }} title={selectedSatker}>{selectedSatker.length > 20 ? selectedSatker.substring(0, 20) + '...' : selectedSatker}</button>
                          <span>/</span>
                          <span style={{ color: 'var(--text-primary)' }} title={selectedPPK}>{selectedPPK.length > 20 ? selectedPPK.substring(0, 20) + '...' : selectedPPK}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-primary)' }} title={selectedSatker}>{selectedSatker.length > 20 ? selectedSatker.substring(0, 20) + '...' : selectedSatker}</span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-primary)' }} title={selectedEselon1}>{selectedEselon1.length > 20 ? selectedEselon1.substring(0, 20) + '...' : selectedEselon1}</span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--text-primary)' }} title={selectedRO}>{selectedRO.length > 20 ? selectedRO.substring(0, 20) + '...' : selectedRO}</span>
              )}
            </div>
          )}`;

code = code.replace(oldBreadcrumb, newBreadcrumb);

const findStr = "<div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>";
const injectStr = "<div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>\n" +
"            {!selectedRO && (\n" +
"              <>\n" +
"                <InsightRO data={filteredData} fmtRupiah={fmtRupiah} />\n" +
"                <InsightSkema data={filteredData} fmtRupiah={fmtRupiah} />\n" +
"              </>\n" +
"            )}";
            
code = code.replace(findStr, injectStr);

fs.writeFileSync('src/features/prioritas-nasional/components/PrioritasNasionalView.tsx', code);
console.log('Update successful!');
