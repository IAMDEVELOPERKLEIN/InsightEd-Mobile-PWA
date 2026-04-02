const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Systematic Audit: Investigating persistent offline status (Connectivity & SSL)...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Checking Nginx Listeners (80, 443)..."
        sudo netstat -tulnp | grep -E "80|443"

        echo "\\n📡 2. Checking for SSL configurations in Nginx..."
        sudo grep -r "ssl" /etc/nginx/sites-enabled/

        echo "\\n📡 3. External HTTP vs HTTPS reachability (Local context)..."
        echo "Testing Port 80 (HTTP):"
        curl -I --connect-timeout 5 http://stride.deped.gov.ph 2>/dev/null | grep "HTTP/" || echo "❌ Port 80 unreachable"
        
        echo "Testing Port 443 (HTTPS):"
        curl -Ik --connect-timeout 5 https://stride.deped.gov.ph 2>/dev/null | grep "HTTP/" || echo "❌ Port 443 unreachable"

        echo "\\n📡 4. Checking UFW Firewall Status..."
        sudo ufw status
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
