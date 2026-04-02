const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing Final Cleanup: Evicting legacy Nginx configs...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to backup and evict legacy configs
    const cmd = `
        echo "📂 1. Backing up legacy configs to /tmp..."
        sudo mkdir -p /tmp/nginx_legacy_backup
        [ -f /etc/nginx/sites-available/default ] && sudo mv /etc/nginx/sites-available/default /tmp/nginx_legacy_backup/ || echo "⚠️ default not found"
        [ -f /etc/nginx/sites-available/insighted-staging ] && sudo mv /etc/nginx/sites-available/insighted-staging /tmp/nginx_legacy_backup/ || echo "⚠️ insighted-staging not found"

        echo "\n🛠️ 2. Final Nginx Syntax Check..."
        sudo nginx -t

        echo "\n🚀 3. Performing Hard Restart..."
        sudo systemctl stop nginx
        sudo systemctl start nginx

        echo "\n✅ Cleanup Complete."
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
