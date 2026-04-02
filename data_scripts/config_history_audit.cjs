const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Configuration History Audit: Recovering the original Nginx routing logic...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Listing all Nginx config backups in /tmp/:"
        ls -la /tmp/stride*.bak /tmp/stride*.conf

        echo "\\n📂 2. Reading the EARLIEST backup found to see the original root logic:"
        # Let's try to find the very first one I made
        FIRST_BACKUP=$(ls -1rt /tmp/stride*.bak 2>/dev/null | head -n 1)
        if [ -f "$FIRST_BACKUP" ]; then
            echo "📄 Reading: $FIRST_BACKUP"
            cat "$FIRST_BACKUP"
        else
            echo "⚠️ No backups found in /tmp/."
        fi

        echo "\\n📂 3. Checking for any HTML files in /var/www/html/ that might be the original:"
        ls -la /var/www/html/*.html
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
