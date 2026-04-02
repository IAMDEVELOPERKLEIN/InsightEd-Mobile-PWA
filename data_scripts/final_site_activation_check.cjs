const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Final Site Activation Check: Confirming full HTTPS connectivity...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. PM2 Final Status..."
        sudo pm2 list

        echo "\\n📡 2. Nginx Listeners Check (Final)..."
        sudo netstat -tulnp | grep -E "80|443"

        echo "\\n📡 3. Local HTTPS connectivity check..."
        curl -Ik --connect-timeout 5 https://localhost 2>/dev/null | head -n 5

        echo "\\n📡 4. External Domain Connectivity Check..."
        curl -Ik --connect-timeout 5 https://stride.deped.gov.ph 2>/dev/null | head -n 5
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
