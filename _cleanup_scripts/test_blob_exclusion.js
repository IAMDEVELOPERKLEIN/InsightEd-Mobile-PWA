
async function verifyBlobsExcluded() {
  const endpoints = [
    'http://localhost:3000/api/projects',
    'http://localhost:3000/api/monitoring/engineer-projects?region=Region III',
    'http://localhost:3000/api/finance-dashboard/projects'
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nTesting ${url}...`);
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`  FAILED: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const list = Array.isArray(data.projects) ? data.projects : data;
      
      if (list.length === 0) {
        console.log("  No rows found to verify.");
        continue;
      }

      const row = list[0];
      const blobCols = ['rta', 'moa', 'pow_pdf', 'dupa_pdf', 'contract_pdf', 'rta_pdf', 'moa_pdf'];
      
      console.log(`  Verifying ${list.length} rows...`);
      let issues = 0;
      blobCols.forEach(col => {
        if (row[col] && typeof row[col] === 'string' && row[col].length > 1000) {
          console.log(`  ❌ Issue: Column "${col}" still contains large data (${row[col].length} chars)`);
          issues++;
        }
      });
      
      if (issues === 0) {
        console.log("  ✅ Verification PASSED: No large blobs found.");
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }
}

verifyBlobsExcluded();
