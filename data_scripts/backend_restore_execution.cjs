const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing Systematic Backend Restoration: Recovering PM2 State...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "💾 1. Restoring Production Backend (Port 5000)..."
        cd /var/www/html/
        sudo pm2 start api/index.js --name "stride-prod"

        echo "\n💾 2. Cleaning up Zombie Process on Port 5001..."
        sudo fuser -k 5001/tcp || echo "⚠️ No zombie process found on 5001"

        echo "\n💾 3. Restoring Staging Backend (Port 5001)..."
        cd /var/www/html/InsightEd-Staging/
        sudo pm2 start api/index.js --name "stride-staging"

        echo "\n💾 4. Persisting PM2 Process List..."
        sudo pm2 save

        echo "\n🛠️ 5. Final Verification..."
        sudo pm2 list
        sudo netstat -tulnp | grep -E "5000|5001"
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
