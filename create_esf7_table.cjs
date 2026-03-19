const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const columnFile = 'e:/InsightEd-Mobile-PWA/esf7_columns_utf8.txt';

async function init() {
  try {
    const content = fs.readFileSync(columnFile, 'utf8');
    const lines = content.split('\n');
    const columns = [];
    
    // Extract column names from lines like "7: 1. ID"
    lines.forEach(line => {
      const trimmed = line.trim();
      const match = trimmed.match(/^\d+\.\s+(.+)$/);
      if (match) {
        columns.push(match[1].trim());
      }
    });

    console.log(`Found ${columns.length} columns from file.`);
    if (columns.length === 0) {
        console.error("❌ No columns found. Check file format.");
        return;
    }

    // Handle duplicates by appending suffix
    const counts = {};
    const sanitizedCols = columns.map(c => {
      let name = c.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      // Ensure it doesn't start with a number for Postgres safety
      if (/^\d/.test(name)) name = 'col_' + name;
      if (!name) name = 'col';
      
      if (counts[name]) {
        counts[name]++;
        return `${name}_${counts[name]}`;
      } else {
        counts[name] = 1;
        return name;
      }
    });

    // SQL Construction
    let sql = `CREATE TABLE IF NOT EXISTS ESF7_Database (
      id_serial SERIAL PRIMARY KEY,
      school_id VARCHAR(100),
      status VARCHAR(50) DEFAULT 'DRAFT',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;

    if (sanitizedCols.length > 0) {
      sql += ',\n    ' + sanitizedCols.map(c => `"${c}" TEXT`).join(',\n    ');
    }
    sql += '\n);';

    console.log("Executing CREATE TABLE...");
    await pool.query(sql);
    console.log("✅ ESF7_Database table created successfully.");

  } catch (err) {
    console.error("❌ Initialization Failed:", err.message);
  } finally {
    await pool.end();
  }
}

init();
