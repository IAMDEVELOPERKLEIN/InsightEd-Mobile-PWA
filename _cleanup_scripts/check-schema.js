const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', // Assume default unless specified
  host: 'localhost',
  database: 'insighted_db', // I should check the DB connection string in index.js to be sure. Let me read api/index.js first.
});
