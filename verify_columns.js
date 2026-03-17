
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'engineer_form' 
        ORDER BY column_name
    `);
    console.log("Current columns in engineer_form:");
    res.rows.forEach(r => console.log(` - ${r.column_name}`));
    
    const redundant = ['tranche_1', 'moa_pdf', 'rta_pdf', 'implementing_agency', 'iern'];
    const found = res.rows.filter(r => redundant.includes(r.column_name));
    if (found.length === 0) {
        console.log("\n✅ SUCCESS: No redundant columns found!");
    } else {
        console.log("\n❌ FAILURE: Redundant columns still exist:", found.map(f => f.column_name).join(', '));
    }
    await pool.end();
}

check();
