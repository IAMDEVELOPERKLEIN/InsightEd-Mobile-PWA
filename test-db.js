import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

console.log('Checking environment variables...');
if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is missing in .env');
    process.exit(1);
} else {
    console.log('✅ DATABASE_URL is present.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

console.log('Attempting to connect to database...');

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database Connection Failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connected to Database successfully!');
        client.query('SELECT NOW()', (qErr, res) => {
            release();
            if (qErr) {
                console.error('❌ Query Failed:', qErr.message);
                process.exit(1);
            }
            console.log('✅ Test Query (SELECT NOW()) successful:', res.rows[0]);
            process.exit(0);
        });
    }
});
