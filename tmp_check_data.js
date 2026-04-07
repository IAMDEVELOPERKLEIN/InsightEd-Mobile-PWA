import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkData() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    console.log("--- Sample from users ---");
    const usersRes = await pool.query('SELECT region, division FROM users WHERE region IS NOT NULL LIMIT 5');
    console.table(usersRes.rows);

    console.log("--- Sample from schools_IERN ---");
    const schoolsRes = await pool.query('SELECT "Region", "Division" FROM "schools_IERN" LIMIT 5');
    console.table(schoolsRes.rows);

    // Specifically check for case-insensitive matches
    if (usersRes.rows.length > 0) {
      const uRegion = usersRes.rows[0].region;
      const uDivision = usersRes.rows[0].division;
      console.log(`Checking for matches for User Region: '${uRegion}', Division: '${uDivision}'`);
      
      const matchRes = await pool.query('SELECT COUNT(*) FROM "schools_IERN" WHERE "Region" = $1 AND "Division" = $2', [uRegion, uDivision]);
      console.log(`Exact Match Count: ${matchRes.rows[0].count}`);

      const ciMatchRes = await pool.query('SELECT COUNT(*) FROM "schools_IERN" WHERE UPPER(TRIM("Region")) = UPPER(TRIM($1)) AND UPPER(TRIM("Division")) = UPPER(TRIM($2))', [uRegion, uDivision]);
      console.log(`Case-Insensitive/Trimmed Match Count: ${ciMatchRes.rows[0].count}`);
    }

  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkData();
