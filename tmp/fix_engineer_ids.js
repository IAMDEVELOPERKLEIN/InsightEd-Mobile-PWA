import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    // 1. Get all engineers from users table
    const usersRes = await pool.query("SELECT uid, first_name, last_name, role FROM users WHERE role ILIKE '%engineer%'");
    console.log(`Found ${usersRes.rows.length} engineers in users table.`);

    // 2. Get all distinct engineer names from engineer_form where engineer_id is null
    const projectsRes = await pool.query("SELECT DISTINCT engineer_name FROM engineer_form WHERE engineer_id IS NULL AND engineer_name IS NOT NULL");
    console.log(`Found ${projectsRes.rows.length} unique engineer names with null IDs in engineer_form.`);

    for (const project of projectsRes.rows) {
      const name = project.engineer_name.trim();
      // Try to find a match
      const matchingUser = usersRes.rows.find(u => {
        const fullName = `${u.first_name} ${u.last_name || ''}`.trim();
        return fullName.toLowerCase() === name.toLowerCase() || 
               name.toLowerCase().includes(u.last_name?.toLowerCase() || '___');
      });

      if (matchingUser) {
        console.log(`Matching "${name}" to UID ${matchingUser.uid} (${matchingUser.first_name} ${matchingUser.last_name})`);
        const updateRes = await pool.query(
          "UPDATE engineer_form SET engineer_id = $1 WHERE engineer_name = $2 AND engineer_id IS NULL",
          [matchingUser.uid, project.engineer_name]
        );
        console.log(`Updated ${updateRes.rowCount} rows.`);
      } else {
        console.log(`No match found for "${name}"`);
      }
    }

  } catch (err) {
    console.error("Migration Error:", err);
  } finally {
    await pool.end();
  }
}

fix();
