const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Final Site Verification: Confirming full site restoration...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. PM2 Status Check..."
        sudo pm2 list

        echo "\\n📡 2. Port Binding State..."
        sudo netstat -tulnp | grep -E "5000|5001"

        echo "\\n📡 3. Local Connectivity Tests..."
        echo "STRIDE PROD (expecting 200/302):"
        curl -I http://localhost:5000 2>/dev/null | grep "HTTP/"
        
        echo "\\nSTRIDE STAGING (expecting 200/302):"
        curl -I http://localhost:5001 2>/dev/null | grep "HTTP/"
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
