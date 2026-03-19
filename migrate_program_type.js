import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("🚀 Starting migration: Adding program_type column...");
        await client.query(`
            ALTER TABLE engineer_form 
            ADD COLUMN IF NOT EXISTS program_type TEXT;
        `);

        console.log("📈 Migrating data from is_donated to program_type...");
        
        // Mapping:
        // is_donated = true -> Donated
        // is_donated = false OR is_donated IS NULL -> BEFF
        
        const updateRes = await client.query(`
            UPDATE engineer_form
            SET program_type = CASE 
                WHEN is_donated = true THEN 'Donated'
                ELSE 'BEFF'
            END
            WHERE program_type IS NULL;
        `);

        console.log(`✅ Migrated ${updateRes.rowCount} rows.`);

        // Verification
        const checkRes = await client.query(`
            SELECT program_type, COUNT(*) 
            FROM engineer_form 
            GROUP BY program_type
        `);
        console.log("Migration Results:");
        console.table(checkRes.rows);

        await client.query('COMMIT');
        console.log("🎉 Migration completed successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
