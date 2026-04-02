const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Inspecting Nginx configurations for consolidation...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Read both files to determine which has the most complete config
    const cmd = `
        echo "--- 1. Contents of /etc/nginx/sites-available/default ---"
        sudo cat /etc/nginx/sites-available/default

        echo "\n--- 2. Contents of /etc/nginx/sites-available/insighted-staging ---"
        sudo cat /etc/nginx/sites-available/insighted-staging
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
