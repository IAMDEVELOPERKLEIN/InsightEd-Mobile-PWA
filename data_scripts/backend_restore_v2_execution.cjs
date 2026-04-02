const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing Definitive Backend Restoration: Applying Path-Locked Takeover...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Deep Forensic Cleanup: Killing all zombie processes (5000, 5001, 3000)..."
        sudo fuser -k 5000/tcp 5001/tcp 3000/tcp || echo "⚠️ Ports already clear or no zombie found"

        echo "\\n📡 2. Restoring Production Backend (stride-prod)..."
        # Path: /var/www/html/InsightEd-Mobile-PWA/
        cd /var/www/html/InsightEd-Mobile-PWA/
        sudo pm2 start api/index.js --name "stride-prod"

        echo "\\n📡 3. Restoring Staging Backend (stride-staging)..."
        # Path: /var/www/html/InsightEd-Staging/
        cd /var/www/html/InsightEd-Staging/
        sudo pm2 start api/index.js --name "stride-staging"

        echo "\\n📡 4. Persisting PM2 Master State..."
        sudo pm2 save

        echo "\\n🛠️ 5. Final Systematic Verification..."
        sudo pm2 list
        echo "\\n📡 Netstat Listeners Check:"
        sudo netstat -tulnp | grep -E "5000|5001"

        echo "\\n📡 Curl Verification (Prod):"
        curl -I http://localhost:5000 || echo "❌ Prod health check failed"

        echo "\\n📡 Curl Verification (Staging):"
        curl -I http://localhost:5001 || echo "❌ Staging health check failed"
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
