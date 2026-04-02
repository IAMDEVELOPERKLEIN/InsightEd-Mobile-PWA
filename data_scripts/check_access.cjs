const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Post-200 Diagnostic: Checking Nginx Access/Error Logs...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 Tail last 5 access log entries..."
        sudo tail -n 5 /var/log/nginx/access.log

        echo "\n📡 Tail last 5 error log entries..."
        sudo tail -n 5 /var/log/nginx/error.log

        echo "\n📡 Verifying permissions again for /mnt/uploads"
        ls -la /mnt/uploads
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
