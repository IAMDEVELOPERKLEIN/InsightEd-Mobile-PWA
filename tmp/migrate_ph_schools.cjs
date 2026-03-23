const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database for migration.');

    const queries = [
      "ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS head_date_of_birth DATE;",
      "ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS head_date_hired DATE;",
      "ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS established_year INTEGER;",
      "ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS google_drive_link TEXT;",
      "ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT;",
      "ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS google_drive_file_name TEXT;",
      "ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS google_drive_thumbnail_url TEXT;"
    ];

    for (const query of queries) {
      console.log(`Executing: ${query}`);
      await client.query(query);
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
