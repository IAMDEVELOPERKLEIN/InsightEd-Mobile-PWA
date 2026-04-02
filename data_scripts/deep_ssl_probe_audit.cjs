const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Systematic Audit: Validating SSL Certificates and Azure Probes...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Checking Let's Encrypt Live Directory..."
        sudo ls -R /etc/letsencrypt/live/

        echo "\\n📡 2. Comparing Certificate Expiry (Recovered vs Live)..."
        echo "Recovered Cert (/etc/nginx/ssl/fullchain3.pem):"
        sudo openssl x509 -enddate -noout -in /etc/nginx/ssl/fullchain3.pem || echo "❌ Failed to read recovered cert"
        
        echo "\\nLive Cert (Search in /etc/letsencrypt/live/):"
        # Find the directory in /etc/letsencrypt/live/ that matches the domain
        LIVE_DIR=$(sudo ls /etc/letsencrypt/live/ | grep "stride" | head -n 1)
        if [ ! -z "$LIVE_DIR" ]; then
            sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$LIVE_DIR/fullchain.pem
            echo "Live Path: /etc/letsencrypt/live/$LIVE_DIR/fullchain.pem"
        else
            echo "⚠️ No Live LetsEncrypt Cert found for stride."
        fi

        echo "\\n📡 3. Monitoring Nginx Logs for Azure Health Probes (Last 20 hits)..."
        # Application Gateway usually has an agent user agent
        sudo tail -n 50 /var/log/nginx/access.log | grep -iE "Azure|Health|LoadBalancer" || echo "📡 No recent probes detected in access logs"
        
        echo "\\n📡 4. Checking Nginx Error Log for handshake failures..."
        sudo tail -n 20 /var/log/nginx/error.log
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
