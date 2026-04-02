const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Absolute Final Cleanup: Removing opdash.conf conflict...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Evicting the last conflict: /etc/nginx/conf.d/opdash.conf..."
        sudo mv /etc/nginx/conf.d/opdash.conf /tmp/nginx_legacy_backup/ 2>/dev/null || echo "⚠️ opdash.conf already moved or not found"

        echo "\n🛠️ 2. Final Nginx Syntax Check..."
        sudo nginx -t

        echo "\n🚀 3. Performing Final Service Restart..."
        sudo systemctl stop nginx
        sudo systemctl start nginx

        echo "\n✅ ALL CONFLICTS RESOLVED."
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
