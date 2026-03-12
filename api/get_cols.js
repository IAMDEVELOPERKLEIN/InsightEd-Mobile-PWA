import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool();

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users'", (err, res) => {
    if (err) console.error(err);
    else console.log(res.rows.map(r => r.column_name).join(', '));
    process.exit();
});
