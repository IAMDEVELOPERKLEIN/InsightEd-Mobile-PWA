const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Systematic Audit: Checking PM2 and Netstat details...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Checking PM2 Process Status..."
        sudo pm2 list

        echo "\\n📡 2. Checking Listening Ports (5000/5001)..."
        sudo netstat -tulnp | grep -E "5000|5001" || echo "⚠️ No services listening on 5000/5001"

        echo "\\n📡 3. Checking for specific PM2 error logs (Last 50 lines)..."
        sudo pm2 logs --lines 50 --no-colors --flush
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
