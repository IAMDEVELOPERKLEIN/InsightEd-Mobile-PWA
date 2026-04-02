const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Identifying Active App and Config Paths...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Commands to check PM2 and Nginx
    const cmd = `
        echo "--- 1. PM2 Status ---"
        sudo pm2 status

        echo "\n--- 2. Active Nginx Config ---"
        sudo nginx -T | grep -i "server_name\|proxy_pass\|alias" | head -n 20

        echo "\n--- 3. Checking .env presence in both folders ---"
        [ -f /var/www/html/InsightEd-Mobile-PWA/.env ] && echo "✅ Found .env in InsightEd-Mobile-PWA" || echo "❌ No .env in InsightEd-Mobile-PWA"
        [ -f /var/www/html/InsightEd-Staging/.env ] && echo "✅ Found .env in InsightEd-Staging" || echo "❌ No .env in InsightEd-Staging"

        echo "\n--- 4. Checking Nginx files in sites-enabled ---"
        ls -la /etc/nginx/sites-enabled/
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
