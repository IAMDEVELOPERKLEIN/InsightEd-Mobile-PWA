const { Client } = require('ssh2');
const conn = new Client();

console.log('🧪 Connectivity Test Redux: Testing with Host header...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Test the specific image identified earlier with Host header
    const filename = "photo_1775089817548_lvblfpjes.jpg";
    const cmd = `
        echo "📡 Testing retrieval of ${filename} via Host: stride.deped.gov.ph..."
        curl -I -H "Host: stride.deped.gov.ph" http://localhost/uploads/project_photos/${filename}
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
