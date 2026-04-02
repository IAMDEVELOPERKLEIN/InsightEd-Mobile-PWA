const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Final Azure Health Verification: Confirming the Gateway Handshake...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Testing Local Root Health (expecting 200 OK):"
        curl -Ik --connect-timeout 5 https://localhost 2>/dev/null | head -n 5

        echo "\\n📡 2. Monitoring Access Log for Azure Probe status (Last 10 hits)..."
        # We expect to see 200 for the 10.103.x.x IPs
        sudo tail -n 20 /var/log/nginx/access.log | grep "10.103"

        echo "\\n📡 3. External Domain Handshake (Final):"
        curl -Ik https://stride.deped.gov.ph 2>/dev/null | head -n 10
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
