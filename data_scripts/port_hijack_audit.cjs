const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Identifying the Portal Hijacker...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Port Ownership (80/443):"
        sudo lsof -i :80
        sudo lsof -i :443

        echo "\\n📡 2. Service Reality Check (Nginx vs Apache):"
        sudo systemctl is-active nginx
        sudo systemctl is-active apache2

        echo "\\n📡 3. Checking the Root Landing Page for Apache fingerprints:"
        head -n 20 /var/www/html/index.html

        echo "\\n📡 4. Checking Nginx status and error logs:"
        sudo systemctl status nginx --no-pager
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
