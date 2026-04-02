const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Filtering for active legacy proxy paths...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Active Staging Logic (/tmp/nginx_legacy_backup/insighted-staging):"
        grep -v "^[[:space:]]*#" /tmp/nginx_legacy_backup/insighted-staging | grep -E "location|proxy_pass|alias"

        echo "\\n📂 2. Active opdash Logic (/tmp/nginx_legacy_backup/opdash.conf):"
        grep -v "^[[:space:]]*#" /tmp/nginx_legacy_backup/opdash.conf | grep -E "location|proxy_pass|alias"

        echo "\\n📂 3. Active default Logic (/tmp/nginx_legacy_backup/default):"
        grep -v "^[[:space:]]*#" /tmp/nginx_legacy_backup/default | grep -E "location|proxy_pass|alias"
    `.trim();

    conn.exec(cmd, { pty: true }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data);
            if (data.toString().includes('[sudo] password')) {
                stream.write('7v52E69TYgTE\n');
            }
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
});
