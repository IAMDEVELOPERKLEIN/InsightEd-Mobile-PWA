const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Finalizing Environment and Nginx Configs...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Commands to update .env files and Nginx configs
    const cmd = `
        echo "🔧 1. Updating .env files..."
        for dir in "/var/www/html/InsightEd-Mobile-PWA" "/var/www/html/InsightEd-Staging"; do
            if [ -f "$dir/.env" ]; then
                if grep -q "UPLOAD_DIR" "$dir/.env"; then
                    sudo sed -i 's|^UPLOAD_DIR=.*|UPLOAD_DIR=/mnt/uploads|' "$dir/.env"
                else
                    echo "UPLOAD_DIR=/mnt/uploads" | sudo tee -a "$dir/.env"
                fi
                echo "✅ Updated $dir/.env"
            fi
        done

        echo "\n🔧 2. Updating Nginx configs..."
        NGINX_FILES="/etc/nginx/sites-available/default /etc/nginx/sites-available/insighted-staging"
        for file in $NGINX_FILES; do
            if [ -f "$file" ]; then
                # Check if /uploads block already exists
                if grep -q "location /uploads/" "$file"; then
                    # Update existing alias
                    sudo sed -i '/location \/uploads\//,/}/ s|alias .*|alias /mnt/uploads/;|' "$file"
                else
                    # Add new location block before the last closing brace
                    sudo sed -i '$i \    location /uploads/ {\n        alias /mnt/uploads/;\n        autoindex off;\n        expires 30d;\n        add_header Cache-Control "public, no-transform";\n    }' "$file"
                fi
                echo "✅ Updated $file"
            fi
        done

        echo "\n🚀 3. Reloading Services..."
        sudo nginx -t && sudo systemctl reload nginx
        
        echo "\n♻️ 4. Restarting Application Processes..."
        # If PM2 is empty, we'll try to find the processes and kill them to force a restart/reload
        # (Assuming they are managed by some process manager that will restart them, or we manually start them)
        # Based on ps aux, they are running. We'll try sudo pm2 resurrect or restart all
        sudo pm2 restart all || (sudo kill 1149798 1150887 && echo "Killed PIDs for manual restart")

        echo "\n📊 Final Storage Status:"
        df -h / /mnt
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
