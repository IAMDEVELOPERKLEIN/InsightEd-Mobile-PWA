const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addCols() {
  const grades = ['g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
  try {
    for (const g of grades) {
      const colName = \`enroll_\${g}\`;
      console.log(\`Adding column \${colName}...\`);
      await pool.query(\`
        ALTER TABLE ph_schools 
        ADD COLUMN IF NOT EXISTS \${colName} INT DEFAULT 0;
      \`);
      console.log(\`✅ Added \${colName}\`);
    }
  } catch (err) {
    console.error('Error adding columns', err);
  } finally {
    pool.end();
  }
}

addCols();
