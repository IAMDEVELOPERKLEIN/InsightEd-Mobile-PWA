const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Identifying the STRIDE Dashboard path...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Checking legacy 'shiny-server' config for root clues:"
        sudo cat /tmp/nginx_legacy_backup/shiny-server || echo "📡 No shiny-server legacy config found."

        echo "\\n📂 2. Searching for 'STRIDE' branding in /srv/shiny-server/:"
        sudo grep -ri "STRIDE" /srv/shiny-server/ | head -n 10

        echo "\\n📂 3. Checking for any other HTML entry point in /var/www/html/R/:"
        sudo grep -ri "STRIDE" /var/www/html/R/ | head -n 10

        echo "\\n📂 4. Checking if there are any other sites-available configs I missed:"
        ls -la /etc/nginx/sites-available/
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
