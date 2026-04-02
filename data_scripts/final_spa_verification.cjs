const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Final SPA Verification: Testing Frontend and API Connections...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Testing Production Frontend (/insighted/):"
        curl -Ik https://stride.deped.gov.ph/insighted/ 2>/dev/null | head -n 5

        echo "\\n📡 2. Testing Production API (/api/):"
        # Using a dummy endpoint, expecting 200, 304, 401 or 404 from the Backend, but NOT 502/Cannot GET from Nginx
        curl -Ik https://stride.deped.gov.ph/api/settings/maintenance_mode 2>/dev/null | head -n 5

        echo "\\n📡 3. Testing Staging Frontend (/insighted-staging/):"
        curl -Ik https://stride.deped.gov.ph/insighted-staging/ 2>/dev/null | head -n 5

        echo "\\n📡 4. Testing Staging API (/insighted-staging/api/):"
        curl -Ik https://stride.deped.gov.ph/insighted-staging/api/settings/maintenance_mode 2>/dev/null | head -n 5
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
