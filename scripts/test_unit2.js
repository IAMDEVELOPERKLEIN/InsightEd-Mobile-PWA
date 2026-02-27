import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testUpdate() {
  try {
    const fields = [
      'enroll_kinder = $1', 'enroll_g1 = $2', 'enroll_g2 = $3', 'enroll_g3 = $4',
      'enroll_g4 = $5', 'enroll_g5 = $6', 'enroll_g6 = $7', 'total_enrollment = $8',
      'sned_learners = $9', 'non_graded_learners = $10',
      'aral_math_g1 = $11', 'aral_math_g2 = $12', 'aral_math_g3 = $13', 'aral_math_g4 = $14', 'aral_math_g5 = $15', 'aral_math_g6 = $16',
      'aral_read_g1 = $17', 'aral_read_g2 = $18', 'aral_read_g3 = $19', 'aral_read_g4 = $20', 'aral_read_g5 = $21', 'aral_read_g6 = $22',
      'aral_sci_g1 = $23', 'aral_sci_g2 = $24', 'aral_sci_g3 = $25', 'aral_sci_g4 = $26', 'aral_sci_g5 = $27', 'aral_sci_g6 = $28',
      'male_enrollment = $29', 'female_enrollment = $30', 'verified_as_of = CURRENT_TIMESTAMP'
    ];
    const query = `UPDATE ph_schools SET ${fields.join(', ')} WHERE school_id = $31`;
    console.log("Query:", query);
    
    // Test with all 0s and schoolId '111570'
    const values = Array(30).fill(0).concat(['111570']);
    const result = await pool.query(query, values);
    console.log("Success! Row count:", result.rowCount);
  } catch (err) {
    console.log("----- SQL ERROR MSG -----");
    console.log(err.message);
  } finally {
    pool.end();
  }
}

testUpdate();
