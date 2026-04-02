const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Systematic Audit: Inspecting .env files and process table...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Production .env (/var/www/html/InsightEd-Mobile-PWA/.env):"
        sudo cat /var/www/html/InsightEd-Mobile-PWA/.env

        echo "\\n📡 2. Staging .env (/var/www/html/InsightEd-Staging/.env):"
        sudo cat /var/www/html/InsightEd-Staging/.env

        echo "\\n📡 3. Checking running Node processes (ps -ef):"
        ps -ef | grep "node" | grep -v "grep"

        echo "\\n📡 4. Checking port assignments (lsof -i):"
        sudo lsof -i :5000,5001,3000
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
