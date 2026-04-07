const { Pool } = require('pg');
require('dotenv').config();

async function checkDivisions() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log("--- Divisions in schools_IERN ---");
        const res1 = await pool.query('SELECT DISTINCT "Division" FROM "schools_IERN" WHERE "Region" = \'REGION IV-A\' AND ("Division" ILIKE \'%BATANGAS%\' OR "Division" ILIKE \'%CALACA%\') ORDER BY \"Division\"');
        console.log(JSON.stringify(res1.rows, null, 2));

        console.log("\n--- Divisions in all_locations ---");
        const res2 = await pool.query('SELECT DISTINCT division FROM all_locations WHERE region = \'REGION IV-A\' AND (division ILIKE \'%BATANGAS%\' OR division ILIKE \'%CALACA%\') ORDER BY division');
        console.log(JSON.stringify(res2.rows, null, 2));

        console.log("\n--- Functional Divisions in ph_offices ---");
        const res3 = await pool.query('SELECT DISTINCT functional_division FROM ph_offices WHERE functional_division ILIKE \'%CALACA%\' ORDER BY functional_division');
        console.log(JSON.stringify(res3.rows, null, 2));

        console.log("\n--- Sample Schools in Calaca ---");
        const res4 = await pool.query('SELECT "SchoolID", "School_Name", "Division", "Municipality" FROM "schools_IERN" WHERE "Municipality" ILIKE \'%CALACA%\' LIMIT 5');
        console.log(JSON.stringify(res4.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkDivisions();
