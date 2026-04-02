const { Client } = require('ssh2');
const conn = new Client();

console.log('🚨 Emergency Audit: Checking Nginx health and config integrity...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Checking Nginx systemctl status..."
        sudo systemctl status nginx --no-pager || true

        echo "\\n📡 2. Checking Nginx syntax manually..."
        sudo nginx -t

        echo "\\n📡 3. Checking for corrupted nginx.conf (Last 20 lines)..."
        sudo tail -n 20 /etc/nginx/nginx.conf

        echo "\\n📡 4. Checking sites-enabled..."
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
