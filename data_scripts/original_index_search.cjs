const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Locating the lost Stride landing page...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Scanning web root files for original branding:"
        grep -l "Stride" /var/www/html/index.html* /var/www/html/*.html /tmp/nginx_legacy_backup/* 2>/dev/null

        echo "\\n📂 2. Detailed listing of /var/www/html/:"
        ls -la /var/www/html/

        echo "\\n📂 3. Searching for index copies:"
        sudo find / -name "index.html" -not -path "/var/www/html/index.html" -maxdepth 4 2>/dev/null
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
