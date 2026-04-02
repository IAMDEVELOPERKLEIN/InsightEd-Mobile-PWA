const { Client } = require('ssh2');
const conn = new Client();

console.log('☢️ Running Nuclear MULTI-Strace Audit (All Workers)...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const filename = "photo_1775089817548_lvblfpjes.jpg";
    
    // Commands to trace all workers at once
    const cmd = `
        echo "📡 Attaching strace to ALL Nginx workers..."
        # Find all worker PIDs and construct the command
        WORKER_PIDS=$(ps -ef | grep "nginx: worker" | grep -v grep | awk '{print "-p " $2}')
        
        # Start strace in background (all PIDs)
        sudo strace $WORKER_PIDS -e trace=openat,newfstatat -o /tmp/nginx_nuclear_all.log &
        STRACE_PID=$!
        sleep 2
        
        echo "📡 Triggering request for ${filename}..."
        curl -I -H "Host: stride.deped.gov.ph" http://localhost/uploads/project_photos/${filename}
        
        sleep 2
        echo "📡 Detaching strace..."
        sudo kill $STRACE_PID
        
        echo "\\n--- 🕵️ FORENSIC RESULTS (NGINX PATH RESOLUTION) ---"
        # Filter for the file and any directory attempts
        grep -E "(${filename}|uploads|project_photos)" /tmp/nginx_nuclear_all.log
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
