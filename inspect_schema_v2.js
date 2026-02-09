import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
    ssl: { rejectUnauthorized: false }
});

import fs from 'fs';
const run = async () => {
    try {
        const tables = ['engineer_form', 'engineer_image', 'lgu_forms', 'lgu_image'];
        let output = '';
        for (const table of tables) {
            output += `\n--- ${table} ---\n`;
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                ORDER BY ordinal_position
            `);
            res.rows.forEach(r => output += `${r.column_name}: ${r.data_type} (${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})\n`);
        }
        fs.writeFileSync('schema_info.txt', output);
        console.log('Schema info written to schema_info.txt');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
};

run();
