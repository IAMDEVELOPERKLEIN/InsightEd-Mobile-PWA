const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Diagnostic: Finalizing SSL Certificate Expiry Check...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Checking Expiry of Active Cert (/etc/nginx/ssl/fullchain3.pem):"
        sudo openssl x509 -enddate -noout -in /etc/nginx/ssl/fullchain3.pem || echo "❌ Failed to read recovered cert"
        
        echo "\\n📡 2. Checking for Alternative Certs in LetsEncrypt..."
        # Find any other certs
        sudo ls -F /etc/letsencrypt/live/
        
        echo "\\n📡 3. Monitoring Nginx Access Log for Azure/External hits..."
        sudo tail -n 20 /var/log/nginx/access.log
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
