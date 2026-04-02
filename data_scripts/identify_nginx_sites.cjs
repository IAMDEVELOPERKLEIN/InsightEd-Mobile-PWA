const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Identifying active Nginx site configurations...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to identify which sites are active
    const cmd = `
        echo "--- 1. Enabled site symlinks ---"
        ls -la /etc/nginx/sites-enabled/

        echo "\n--- 2. Checking server_name across sites-available ---"
        grep -r "server_name" /etc/nginx/sites-available/
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
