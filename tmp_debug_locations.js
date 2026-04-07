import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function testApi() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    // Simulate what an SDO user would see (e.g., Cavite)
      const region = 'Region IV-A';
      const division = 'Laguna';

    console.log(`Testing API for Region: ${region}, Division: ${division}...`);

    // We can't hit the actual Express route easily here without starting the server,
    // so we'll simulate the logic we just wrote.
    
    // 1. Base Locations
    const baseRes = await pool.query(`
      SELECT DISTINCT province, municipality, district FROM all_locations
      WHERE UPPER(TRIM(region)) = UPPER(TRIM($1)) AND UPPER(TRIM(division)) = UPPER(TRIM($2))
      ORDER BY province, municipality, district LIMIT 5
    `, [region, division]);
    console.log("Base Locations (First 5):");
    console.table(baseRes.rows);

    // 2. Check for normalization fix (e.g., municipalities with ??)
    const rawRes = await pool.query(`
      SELECT DISTINCT municipality FROM all_locations
      WHERE UPPER(TRIM(region)) = UPPER(TRIM($1)) AND UPPER(TRIM(division)) = UPPER(TRIM($2))
      AND municipality LIKE '%??%'
    `, [region, division]);
    
    const normalize = (str) => str.replace(/\?\?/g, 'Ñ').trim();
    const cleaned = rawRes.rows.map(r => normalize(r.municipality));
    
    console.log("Raw Municipalities with ?? from DB:");
    console.table(rawRes.rows);
    console.log("Normalized Municipalities:");
    console.log(cleaned);

    const hasLosBanos = cleaned.includes('LOS BAÑOS');
    console.log(`Is 'LOS BAÑOS' present and fixed? ${hasLosBanos}`);

    // 3. Check for Barangays in ph_barangays
    if (baseRes.rows.length > 0) {
        const { province, municipality } = baseRes.rows[0];
        const bgyRes = await pool.query(`
          SELECT DISTINCT barangay FROM ph_barangays
          WHERE UPPER(TRIM(region)) = UPPER(TRIM($1))
            AND UPPER(TRIM(province)) = UPPER(TRIM($2))
            AND UPPER(TRIM(municipality)) = UPPER(TRIM($3))
          ORDER BY barangay LIMIT 5
        `, [region, province, municipality]);
        console.log(`Barangays for ${municipality} (First 5 from ph_barangays):`);
        console.table(bgyRes.rows);
    }

  } catch (err) {
    console.error("TEST FAILED:", err.message);
  } finally {
    await pool.end();
  }
}

testApi();
