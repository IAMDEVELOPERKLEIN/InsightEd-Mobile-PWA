const fs = require('fs');
const mapping = JSON.parse(fs.readFileSync('esf7_column_mapping.json', 'utf8'));
const sanitizedKeys = [...new Set(mapping.map(m => m.sanitized).filter(k => k))];

console.log(`Total Unique Sanitized Keys: ${sanitizedKeys.length}`);

// Generate SQL
let sql = `DROP TABLE IF EXISTS ESF7_Database CASCADE;\n`;
sql += `CREATE TABLE ESF7_Database (\n`;
sql += `    id SERIAL PRIMARY KEY,\n`;
sql += `    school_id VARCHAR(50),\n`;
sql += `    status VARCHAR(50) DEFAULT 'DRAFT',\n`;
sql += `    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;

sanitizedKeys.forEach(k => {
    sql += `,\n    "${k}" TEXT`;
});

sql += `\n);\n`;
sql += `CREATE INDEX idx_esf7_school_id ON ESF7_Database(school_id);\n`;

fs.writeFileSync('recreate_esf7.sql', sql);
console.log('Generated recreate_esf7.sql');
