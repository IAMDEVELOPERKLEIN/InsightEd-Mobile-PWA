const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Reclaiming the STRIDE Dashboard...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Searching for 'STRIDE' branding in all HTML files under /var/www/html/:"
        # Look for titles or headings with 'STRIDE'
        sudo grep -ri "STRIDE" /var/www/html/ --exclude-dir=node_modules | grep -i "Dashboard" | head -n 10

        echo "\\n📂 2. Auditing legacy 'shiny-server' and 'default' configs for root paths:"
        sudo grep -r "root" /tmp/nginx_legacy_backup/

        echo "\\n📂 3. Checking contents of /var/www/html/index.nginx-debian.html for clues:"
        # Sometimes the original index was moved here
        head -n 20 /var/www/html/index.nginx-debian.html

        echo "\\n📂 4. Checking if /var/www/html/index.html was actually a STRIDE page (not Apache):"
        # I previously thought it was Apache, let's verify if 'STRIDE' is in it.
        grep -i "STRIDE" /var/www/html/index.html || echo "📡 'STRIDE' not found in current index.html"
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
