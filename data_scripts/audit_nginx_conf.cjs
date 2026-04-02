const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Final Nginx configuration and include check...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to check global includes and active blocks
    const cmd = `
        echo "--- 1. Global Nginx Include Directives ---"
        grep "^[[:space:]]*include" /etc/nginx/nginx.conf

        echo "\n--- 2. Active server blocks in Default ---"
        grep -v "^[[:space:]]*#" /etc/nginx/sites-available/default | grep -v "^$"

        echo "\n--- 3. Active server blocks in Staging ---"
        grep -v "^[[:space:]]*#" /etc/nginx/sites-available/insighted-staging | grep -v "^$"

        echo "\n--- 4. Full Nginx Configuration Dump (Active files) ---"
        sudo nginx -T | grep "configuration file" | grep "sites-"
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
