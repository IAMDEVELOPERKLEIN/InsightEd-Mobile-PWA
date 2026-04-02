const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: In-Depth Photo Serving Audit...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Checking folder permissions for walking (/mnt):"
        ls -ld /mnt
        ls -ld /mnt/uploads
        ls -ld /mnt/uploads/project_photos

        echo "\\n📂 2. Tail Nginx logs for the last few attempts (Grepping 'uploads'):"
        sudo tail -n 100 /var/log/nginx/error.log | grep "uploads" || echo "📡 No recent upload errors in log."

        echo "\\n📂 3. Testing HTTPS local resolution for a specific photo (ignore cert errors):"
        SAMPLE_FILE=$(sudo ls -t /mnt/uploads/project_photos/ | head -n 1)
        if [ ! -z "$SAMPLE_FILE" ]; then
            echo "🧪 Requesting: https://stride.deped.gov.ph/uploads/project_photos/$SAMPLE_FILE"
            # Using -k (insecure) because we're on localhost but hitting the domain
            # Using -v (verbose) to see headers and potential 301 loops
            curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/uploads/project_photos/$SAMPLE_FILE" 2>&1 | grep -E "HTTP/|Location:|Server:"
        else
            echo "⚠️ No files found."
        fi
    `;

    conn.exec(cmd, { pty: true }, (err, stream) => { 
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { conn.end(); });
        if (cmd.includes('[sudo] password')) {
            stream.write('7v52E69TYgTE\n');
        }
    }); 
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
