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
    console.log("--- TABLE: form_school_head ---");
    const sp = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'form_school_head'
    `);
    console.log(JSON.stringify(sp.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
