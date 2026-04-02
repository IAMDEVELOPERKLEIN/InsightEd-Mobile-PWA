const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Diagnostic: Direct Node.js start for Production...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to run the node app directly and catch first 50 lines of output
    const cmd = `
        cd /var/www/html/
        echo "📡 Attempting direct Node.js start..."
        # Use timeout to prevent it from hanging if it starts correctly
        timeout 5s node api/index.js || echo "⚠️ Node.js process exited or timed out"
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
