const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS functional_divisions (
        id SERIAL PRIMARY KEY,
        governance_level TEXT NOT NULL,
        functional_division TEXT NOT NULL
      );
    `);
    console.log("✅ Created table functional_divisions");

    // Seed some data
    const seedData = [
      ['Central Office', 'Administrative Service'],
      ['Central Office', 'Finance Service'],
      ['Central Office', 'ICT Service'],
      ['Regional Office', 'Administrative Division'],
      ['Regional Office', 'Finance Division'],
      ['School Division Office', 'Administrative Service'],
      ['School Division Office', 'Finance Service']
    ];

    for (const [level, div] of seedData) {
      await pool.query(
        "INSERT INTO functional_divisions (governance_level, functional_division) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [level, div]
      );
    }
    console.log("✅ Seeded functional_divisions");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
