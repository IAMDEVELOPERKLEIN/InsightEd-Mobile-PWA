const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Extracting OpDash and Root Portal Logic...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Scanning legacy configs for 'opdash' paths..."
        sudo grep -r "opdash" /tmp/nginx_legacy_backup/

        echo "\\n📂 2. Scanning legacy configs for root '/' behavior..."
        sudo grep -A 5 "location / {" /tmp/nginx_legacy_backup/default

        echo "\\n📂 3. Checking PM2 for opdash..."
        sudo pm2 list

        echo "\\n📂 4. Searching for OpDash backend entry points..."
        sudo find /var/www/html/opdash -name "index.js" -o -name "server.js" | head -n 5

        echo "\\n📂 5. Checking OpDash backend port (Env check)..."
        sudo cat /var/www/html/opdash/api/.env | grep "PORT" || echo "⚠️ Port env not found"
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
