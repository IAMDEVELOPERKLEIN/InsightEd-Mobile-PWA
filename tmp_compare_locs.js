import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function compareLocations() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const sampleUser = await pool.query("SELECT region, division FROM users WHERE role = 'School Division Office' LIMIT 1");
    if (sampleUser.rows.length > 0) {
      const { region, division } = sampleUser.rows[0];
      console.log(`Checking for Region: ${region}, Division: ${division}`);

      console.log("--- all_locations (District/Municipality) ---");
      const allLocs = await pool.query('SELECT DISTINCT district, municipality FROM all_locations WHERE region = $1 AND division = $2 LIMIT 10', [region, division]);
      console.table(allLocs.rows);

      console.log("--- schools_IERN (District/Municipality) ---");
      const iernLocs = await pool.query('SELECT DISTINCT "District" as district, "Municipality" as municipality FROM "schools_IERN" WHERE "Region" = $1 AND "Division" = $2 LIMIT 10', [region, division]);
      console.table(iernLocs.rows);
      
      console.log("--- ph_barangays (Sample for Region/Province) ---");
      // Need to find province first from schools_IERN
      const provRes = await pool.query('SELECT DISTINCT "Province" FROM "schools_IERN" WHERE "Region" = $1 AND "Division" = $2 LIMIT 1', [region, division]);
      if (provRes.rows.length > 0) {
          const province = provRes.rows[0].Province;
          const brgys = await pool.query('SELECT DISTINCT barangay, municipality FROM ph_barangays WHERE region = $1 AND province = $2 LIMIT 10', [region, province]);
          console.table(brgys.rows);
      }
    }
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

compareLocations();
