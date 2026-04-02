const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Diagnostic: Investigating Upload Path Permissions and Environment...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Checking /mnt/uploads permissions:"
        ls -la /mnt/
        ls -la /mnt/uploads/

        echo "\\n📂 2. Checking .env content for UPLOAD_DIR (masked):"
        grep "UPLOAD_DIR" /var/www/html/InsightEd-Mobile-PWA/.env || echo "⚠️ UPLOAD_DIR not found in .env"

        echo "\\n📂 3. Checking current user and group of the Node process:"
        ps aux | grep "api/index.js" | grep -v grep

        echo "\\n📂 4. Checking Nginx error logs for any upload-related issues:"
        sudo tail -n 20 /var/log/nginx/error.log
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
