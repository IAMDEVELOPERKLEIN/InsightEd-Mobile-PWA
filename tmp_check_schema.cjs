const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log("--- PH_SCHOOL_COMPLETION SCHEMA ---");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ph_school_completion'
            ORDER BY ordinal_position
        `);
        console.table(res.rows);

        console.log("\n--- PH_SCHOOLS SCHEMA (UNIT COLS) ---");
        const res2 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ph_schools' 
            AND (column_name LIKE 'unit%' OR column_name = 'unit_completion')
            ORDER BY column_name
        `);
        console.table(res2.rows);

        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
