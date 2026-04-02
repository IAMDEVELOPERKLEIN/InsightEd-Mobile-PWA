const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Reclaiming the Lost Stride Landing Page...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Scanning /var/www/html/ for any index backup files:"
        ls -la /var/www/html/index*

        echo "\\n📂 2. Reading the first 50 lines of /var/www/html/index.html to confirm it is Apache:"
        head -n 50 /var/www/html/index.html

        echo "\\n📂 3. Looking for 'stride' or 'deped' in all files in /var/www/html/ to find the portal selection page:"
        # Use grep to find the file that contains the portal links
        grep -lri "stride" /var/www/html/ --exclude-dir=node_modules | head -n 20

        echo "\\n📂 4. Checking the legacy Nginx backup folder for ANY index.html files:"
        find /tmp/nginx_legacy_backup/ -name "index.html"
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
