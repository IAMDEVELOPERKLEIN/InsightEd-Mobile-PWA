const pg = require('pg');
const pool = new pg.Pool({ 
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function testBulkUpload() {
  try {
    const res = await pool.query("SELECT project_id, rta_pdf, moa_pdf FROM engineer_form LIMIT 1");
    if (res.rows.length === 0) return;
    const id = res.rows[0].project_id;
    console.log(`Testing bulk upload for project ${id}`);

    const uploadData = {
      projectId: id,
      documents: {
        RTA: 'DUMMY_RTA_DATA',
        MOA: 'DUMMY_MOA_DATA'
      },
      uid: 'yC9m8hrZIMRHpUfwUs6M2W8q3S52'
    };

    const response = await fetch('http://localhost:3000/api/bulk-upload-project-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uploadData)
    });

    if (response.ok) {
      console.log('Bulk Upload API returned success');
      const latestRes = await pool.query("SELECT project_id, rta_pdf, moa_pdf, actions FROM engineer_form WHERE actions LIKE 'Bulk Upload%' ORDER BY project_id DESC LIMIT 1");
      const latest = latestRes.rows[0];
      console.log(`Latest History Row ID: ${latest.project_id}`);
      console.log(`RTA: ${latest.rta_pdf}`);
      console.log(`MOA: ${latest.moa_pdf}`);
      console.log(`Action: ${latest.actions}`);
    } else {
      console.error('Bulk Upload failed:', await response.text());
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

testBulkUpload();
