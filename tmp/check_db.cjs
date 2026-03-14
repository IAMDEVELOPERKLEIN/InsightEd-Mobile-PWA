const { Pool } = require('pg');
const fs = require('fs');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/DATABASE_URL=(.+)/);
        if (match) dbUrl = match[1].trim().replace(/^'|^"|'$|"$/g, '');
    } catch (err) { }
}

const pool = new Pool({ 
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log("--- TABLE: ph_schools ---");
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools'
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    console.log("--- TABLE: school_profiles ---");
    const sp = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'school_profiles'
    `);
    console.log(JSON.stringify(sp.rows, null, 2));

    console.log("--- ALL TABLES ---");
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(JSON.stringify(tables.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
