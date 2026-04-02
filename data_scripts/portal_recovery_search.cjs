const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Recovery Search: Locating the original Stride landing page...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Searching for 'deped' or 'stride' strings in all HTML files..."
        sudo grep -lri "deped" /var/www/html/ /tmp/nginx_legacy_backup/ | head -n 10

        echo "\\n📂 2. Checking for 'lost+found' or backup index files..."
        sudo find /var/www/html/ -name "index.html*"
        sudo find /tmp/nginx_legacy_backup/ -name "index.html*"
        
        echo "\\n📂 3. Auditing Nginx root configuration..."
        sudo cat /etc/nginx/sites-available/stride.conf | grep "root"
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
