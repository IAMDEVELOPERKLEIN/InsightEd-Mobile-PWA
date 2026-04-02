const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing Photo Submission Fix Plan: Nginx Optimization & Permission Harmony...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Backing up Nginx Configuration..."
        sudo cp /etc/nginx/sites-available/stride.conf /tmp/stride.conf.photo_backup

        echo "\\n📂 2. Updating Nginx client_max_body_size to 100M..."
        # First, check if it's already there
        if ! grep -q "client_max_body_size" /etc/nginx/sites-available/stride.conf; then
            # Insert after the ssl_ciphers line in the 443 block as a safe anchor, or just after server_name
            sudo sed -i '/server_name stride.deped.gov.ph;/a \\    client_max_body_size 100M;' /etc/nginx/sites-available/stride.conf
        else
            sudo sed -i 's/client_max_body_size.*/client_max_body_size 100M;/g' /etc/nginx/sites-available/stride.conf
        fi

        echo "\\n🛠️ 3. Testing Nginx Configuration..."
        sudo nginx -t

        echo "\\n🚀 4. Reloading Nginx..."
        sudo systemctl reload nginx

        echo "\\n📂 5. Hardening Storage Permissions on /mnt/uploads..."
        sudo usermod -a -G www-data Administrator1
        sudo chown -R www-data:www-data /mnt/uploads
        sudo chmod -R 775 /mnt/uploads

        echo "\\n📂 6. Syncing Environment & PM2 Processes..."
        grep "UPLOAD_DIR" /var/www/html/InsightEd-Mobile-PWA/.env || echo "⚠️ UPLOAD_DIR not found"
        
        # It's important to run this as the user who owns the PM2 daemon (Administrator1 and potentially root)
        pm2 restart all 2>/dev/null || true
        sudo pm2 restart all 2>/dev/null || true

        echo "\\n🧪 7. Verifying Node process write access..."
        # Testing if Administrator1 can write
        sudo -u Administrator1 touch /mnt/uploads/test_node_write_access.txt && echo "✅ Write access confirmed!" || echo "❌ Write access failed"

        echo "\\n✅ PHOTO SUBMISSION FIX COMPLETE."
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
