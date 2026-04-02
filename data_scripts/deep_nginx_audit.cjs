const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Nginx Deep Audit: Locating the true source of /usr/share/nginx/html...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "--- 1. Testing Nginx and dumping full active config ---"
        # This will show exactly what files Nginx is loading
        sudo nginx -T | grep -E "configuration file|root|alias|server_name|location" | grep -v "#"

        echo "\n--- 2. Searching for the string /usr/share/nginx/html ---"
        sudo grep -r "/usr/share/nginx/html" /etc/nginx/

        echo "\n--- 3. Verifying sites-enabled symlinks again ---"
        ls -la /etc/nginx/sites-enabled/

        echo "\n--- 4. Checking nginx.conf for include directives ---"
        grep -E "include" /etc/nginx/nginx.conf
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
