const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Diagnostic: Finalizing OpDash and Root Entry Verification...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Reading OpDash Entry Point (last 50 lines) for port config:"
        sudo tail -n 50 /var/www/html/opdash/api/index.js | grep -E "app.listen|PORT"

        echo "\\n📡 2. Checking if any other process is using 3001..."
        sudo lsof -i :3001 || echo "📡 Port 3001 is free"

        echo "\\n📡 3. Checking for other site candidates in /var/www/html/..."
        sudo ls -F /var/www/html/
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
