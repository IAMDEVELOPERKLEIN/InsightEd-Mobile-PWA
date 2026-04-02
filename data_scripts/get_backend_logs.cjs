const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Systematic Log Dive: Harvesting backend crash logs...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Checking Stride-Prod Logs (Last 50 lines)..."
        sudo pm2 logs stride-prod --lines 50 --no-colors --flush

        echo "\\n📡 2. Checking Stride-Staging Logs (Last 50 lines)..."
        sudo pm2 logs stride-staging --lines 50 --no-colors --flush

        echo "\\n📡 3. Checking .env for Staging..."
        cat /var/www/html/InsightEd-Staging/.env | grep "PORT"

        echo "\\n📡 4. Checking .env for Production..."
        cat /var/www/html/InsightEd-Mobile-PWA/.env | grep "PORT"
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
