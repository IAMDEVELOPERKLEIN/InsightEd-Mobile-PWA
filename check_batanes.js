import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.AZURE_SQL_CONNECTIONSTRING,
});

async function checkBatanesSchools() {
    try {
        console.log("=== CHECKING BATANES SCHOOLS ===\n");

        // Check what the API would return
        const apiQuery = `
      SELECT 
        s.school_name,
        s.school_id,
        COALESCE(sp.completion_percentage, 0) as completion_percentage,
        ss.data_health_description,
        ss.data_health_score
      FROM schools s
      LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
      LEFT JOIN school_summary ss ON s.school_id = ss.school_id
      WHERE s.division = 'Batanes'
      ORDER BY s.school_name
    `;

        const result = await pool.query(apiQuery);

        console.log(`Total Batanes schools: ${result.rows.length}\n`);

        let excellentCount = 0;
        let nonExcellentCount = 0;
        let nullCount = 0;

        console.log("School Details:");
        console.log("=".repeat(100));

        result.rows.forEach((school, index) => {
            const health = school.data_health_description || 'NULL';
            const score = school.data_health_score || 'NULL';
            const completion = school.completion_percentage;

            if (health === 'Excellent') excellentCount++;
            else if (health === 'NULL') nullCount++;
            else nonExcellentCount++;

            console.log(`${index + 1}. ${school.school_name}`);
            console.log(`   Health: ${health} | Score: ${score} | Completion: ${completion}%`);
            console.log(`   School ID: ${school.school_id}`);
            console.log("");
        });

        console.log("=".repeat(100));
        console.log("\nSUMMARY:");
        console.log(`Excellent (Validated): ${excellentCount}`);
        console.log(`Non-Excellent (For Validation): ${nonExcellentCount}`);
        console.log(`NULL health description: ${nullCount}`);

        await pool.end();
    } catch (error) {
        console.error("Error:", error);
        await pool.end();
    }
}

checkBatanesSchools();
