const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Surgical Diagnostic: Nginx Error Log Tracking...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to tail, curl, and wait
    const filename = "photo_1775089817548_lvblfpjes.jpg";
    const cmd = `
        echo "📡 Starting log monitoring and curl..."
        # We'll use a temporary file to keep track of new entries
        sudo tail -n 0 -f /var/log/nginx/error.log > /tmp/nginx_err.log 2>&1 &
        TAIL_PID=$!
        sleep 1
        curl -I -H "Host: stride.deped.gov.ph" http://localhost/uploads/project_photos/${filename}
        sleep 1
        sudo kill $TAIL_PID
        echo "\n--- New Error Log Entries ---"
        cat /tmp/nginx_err.log
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
