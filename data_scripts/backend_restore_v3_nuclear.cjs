const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing Nuclear Backend Restoration: Synchronizing Ports and Purging Conflicting Instances...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Hard-Syncing Production Environment (PORT=5000)..."
        # Check if PORT exists, if not append
        if ! grep -q "PORT=" /var/www/html/InsightEd-Mobile-PWA/.env; then
            echo "PORT=5000" | sudo tee -a /var/www/html/InsightEd-Mobile-PWA/.env
        fi

        echo "\\n📡 2. Nuclear Cleanup: Purging all Node.js/PM2 instances..."
        # Kill all node processes (including root-owned ones)
        sudo pkill -f node || true
        # Ensure ports are free
        sudo fuser -k 5000/tcp 5001/tcp 3000/tcp || true

        echo "\\n📡 3. Restarting Services as Administrator1 (Stride-Prod)..."
        cd /var/www/html/InsightEd-Mobile-PWA/
        pm2 start api/index.js --name "stride-prod"

        echo "\\n📡 4. Restarting Services as Administrator1 (Stride-Staging)..."
        cd /var/www/html/InsightEd-Staging/
        pm2 start api/index.js --name "stride-staging"

        echo "\\n📡 5. Locking Persistent State..."
        pm2 save

        echo "\\n🛠️ 6. Final Definitive Verification..."
        pm2 list
        echo "\\n📡 Port Binding Check (lsof):"
        sudo lsof -i :5000,5001
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
