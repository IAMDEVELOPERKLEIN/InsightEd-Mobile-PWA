const { Client } = require('ssh2');
const conn = new Client();

console.log('☢️ Running Nuclear Strace Audit...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Target one of the worker PIDs (e.g., 1187479)
    const pid = '1187479';
    const filename = "photo_1775089817548_lvblfpjes.jpg";
    
    const cmd = `
        echo "📡 Attaching strace to PID ${pid}..."
        # Start strace in background, tracking file opens/stats
        sudo strace -p ${pid} -e trace=openat,newfstatat -o /tmp/nginx_nuclear.log &
        STRACE_PID=$!
        sleep 1
        
        echo "📡 Triggering request for ${filename}..."
        curl -I -H "Host: stride.deped.gov.ph" http://localhost/uploads/project_photos/${filename}
        
        sleep 1
        echo "📡 Detaching strace..."
        sudo kill $STRACE_PID
        
        echo "\\n--- 🕵️ FORENSIC RESULTS (NGINX PATH RESOLUTION) ---"
        # Look for the filename in the strace log
        grep "${filename}" /tmp/nginx_nuclear.log
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
