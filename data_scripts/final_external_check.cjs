const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Final Site Connectivity Check: Testing live URL from the VM...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Testing Production URL (stride.deped.gov.ph)..."
        curl -I http://stride.deped.gov.ph 2>/dev/null | grep "HTTP/"
        
        echo "\\n📡 2. Testing Staging URL (stride.deped.gov.ph/insighted-staging):"
        curl -I http://stride.deped.gov.ph/insighted-staging 2>/dev/null | grep "HTTP/"

        echo "\\n📡 3. Checking Nginx status (must be running)..."
        sudo systemctl status nginx --no-pager | grep "Active"
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
