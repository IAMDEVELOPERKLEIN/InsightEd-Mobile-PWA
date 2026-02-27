import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testUnit1() {
  try {
    const query = `
      INSERT INTO ph_schools (
        school_id, iern, school_name, region, division, district, curricular_offering
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (school_id) DO UPDATE SET
        iern = EXCLUDED.iern,
        school_name = EXCLUDED.school_name,
        region = EXCLUDED.region,
        division = EXCLUDED.division,
        district = EXCLUDED.district,
        curricular_offering = EXCLUDED.curricular_offering,
        updated_at = CURRENT_TIMESTAMP;
    `;
    const values = [
      '111570', '12345', 'Adriatico School', 
      'Region IV', 'Oriental Mindoro', 'Calapan City', 'Purely Elementary'
    ];
    await pool.query(query, values);
    console.log("Success! Row count inserted");
  } catch (err) {
    console.log("----- SQL ERROR MSG -----");
    console.log(err.message);
  } finally {
    pool.end();
  }
}

testUnit1();
