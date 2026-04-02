const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Definitive Audit: Identifying the Source of the Apache Page...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Who owns Port 80?"
        sudo lsof -i :80

        echo "\\n📡 2. Who owns Port 443?"
        sudo lsof -i :443

        echo "\\n📡 3. Inspecting /var/www/html/index.html (Apache fingerprint?):"
        sudo head -n 50 /var/www/html/index.html

        echo "\\n📡 4. Is the Nginx 'default' config active?"
        ls -l /etc/nginx/sites-enabled/

        echo "\\n📡 5. Stopping Apache (If running) to test theory..."
        sudo systemctl stop apache2 || echo "Apache not running or already stopped"
        
        echo "\\n📡 6. Final Nginx check after potential Apache stop:"
        sudo lsof -i :80
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
