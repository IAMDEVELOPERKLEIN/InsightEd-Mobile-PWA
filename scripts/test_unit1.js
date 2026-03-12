import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const data = { school_id: '123456', iern: '2026-test', school_name: 'Test School', region: 'Region X', division: 'Test Division', district: 'Test District', curricular_offering: 'Purely ES' };
    
    console.log("Testing Unit 1 Save query...");
    const query = `
      INSERT INTO ph_schools (
        school_id, iern, school_name, region, province, municipality, barangay,
        division, district, leg_district, curricular_offering, latitude, longitude,
        school_head, contact_number, unit1_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, TRUE)
      ON CONFLICT (school_id) DO UPDATE SET
        iern = EXCLUDED.iern, school_name = EXCLUDED.school_name, region = EXCLUDED.region,
        province = EXCLUDED.province, municipality = EXCLUDED.municipality, barangay = EXCLUDED.barangay,
        division = EXCLUDED.division, district = EXCLUDED.district, leg_district = EXCLUDED.leg_district,
        curricular_offering = EXCLUDED.curricular_offering, latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude, school_head = EXCLUDED.school_head,
        contact_number = EXCLUDED.contact_number, unit1_completed = TRUE;
    `;
    const values = [
      data.school_id, data.iern || null, data.school_name,
      data.region, data.province || null, data.municipality || null, data.barangay || null,
      data.division, data.district, data.leg_district || null,
      data.curricular_offering,
      data.latitude || null, data.longitude || null,
      data.school_head || null, data.contact_number || null
    ];
    await pool.query(query, values);
    console.log("ph_schools Insert OK");

    if (data.school_id && data.iern) {
      console.log("Testing schools_IERN query...");
      await pool.query(`
        INSERT INTO "schools_IERN" ("SchoolID", "iern", "School_Name", "Region", "Division", "Province", "Municipality", "District")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("SchoolID") DO UPDATE SET iern = EXCLUDED.iern;
      `, [
        data.school_id, data.iern, data.school_name,
        data.region || null, data.division || null, data.province || null, data.municipality || null, data.district || null
      ]);
      console.log("schools_IERN Insert OK");
    }

    console.log("All OK");
  } catch (error) {
    console.error("Database Error:", error.message);
  } finally {
    process.exit(0);
  }
}

main();
