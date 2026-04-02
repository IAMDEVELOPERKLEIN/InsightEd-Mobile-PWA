const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Emergency Nginx Restoration: Fixing includes and symlinks...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Cleaning up symlinks (Ensuring ONLY stride is active)..."
        sudo rm -f /etc/nginx/sites-enabled/opdash
        sudo rm -f /etc/nginx/sites-enabled/default
        sudo ln -sf /etc/nginx/sites-available/stride.conf /etc/nginx/sites-enabled/stride

        echo "\\n📂 2. Repairing nginx.conf Logic..."
        # Remove any stray sites-available includes
        sudo sed -i '/sites-available/d' /etc/nginx/nginx.conf
        # Re-add sites-enabled include if it's missing (put it before the end of the http block)
        if ! grep -q "sites-enabled" /etc/nginx/nginx.conf; then
            sudo sed -i '/http {/a \\tinclude /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        fi

        echo "\\n🛠️ 3. Final Syntax Test..."
        sudo nginx -t

        echo "\\n🚀 4. Final Power Cycle..."
        sudo systemctl stop nginx
        sudo systemctl start nginx

        echo "\\n✅ RESTORATION COMPLETE."
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
