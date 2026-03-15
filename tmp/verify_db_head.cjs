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

async function verify() {
  try {
    console.log("1. Running Auto-Migration...");
    const headCols = [
      'head_first_name TEXT', 'head_middle_name TEXT', 'head_last_name TEXT',
      'head_sex TEXT', 'head_position_title TEXT', 
      'head_date_of_birth DATE', 'head_date_hired DATE'
    ];
    const alterParts = headCols.map(c => `ADD COLUMN IF NOT EXISTS ${c}`);
    await pool.query(`ALTER TABLE ph_schools ${alterParts.join(', ')}`);
    console.log("✅ Migration columns added.");

    console.log("2. Checking Schema...");
    const sp = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools' 
      AND column_name LIKE 'head_%'
    `);
    console.log(JSON.stringify(sp.rows, null, 2));

    console.log("3. Testing Proper Case Logic...");
    const toProperCase = (str) => {
      if (!str) return null;
      return str.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };
    
    const testNames = ["JUAN", "dela", "CRUZ", "maria clara"];
    testNames.forEach(n => console.log(`${n} -> ${toProperCase(n)}`));

    console.log("4. Verifying record persistence (Simulated)...");
    // We don't want to pollute with 999999 if it exists, but let's just check the logic.
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
verify();
