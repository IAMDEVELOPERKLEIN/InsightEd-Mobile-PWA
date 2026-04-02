const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Systematic Audit: Investigating Route Mapping and Path Collisions...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Auditing Legacy Proxy Logic (Historical Truth)..."
        # Check how staging was proxied before
        grep -C 5 "proxy_pass" /tmp/nginx_legacy_backup/insighted-staging
        # Check how production (opdash or default) was proxied before
        grep -C 5 "proxy_pass" /tmp/nginx_legacy_backup/default
        grep -C 5 "proxy_pass" /tmp/nginx_legacy_backup/opdash.conf

        echo "\\n📂 2. Auditing Backend Route Definitions (Production)..."
        # Check how Express app defines its base route in Prod
        head -n 100 /var/www/html/InsightEd-Mobile-PWA/api/index.js | grep -E "app.(get|use)|Router"

        echo "\\n📂 3. Auditing Backend Route Definitions (Staging)..."
        # Check how Express app defines its base route in Staging
        head -n 100 /var/www/html/InsightEd-Staging/api/index.js | grep -E "app.(get|use)|Router"

        echo "\\n📂 4. Current stride.conf check..."
        sudo cat /etc/nginx/sites-available/stride.conf
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
