const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Final Nginx Log & Path Audit...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Checking Permissions of EVERY folder in the path:"
        ls -ld /mnt
        ls -ld /mnt/uploads
        ls -ld /mnt/uploads/project_photos

        echo "\\n📂 2. Checking Nginx Access Logs for 404s/403s on 'uploads':"
        sudo grep "uploads" /var/log/nginx/access.log | tail -n 20 || echo "📡 No upload logs found."

        echo "\\n📂 3. Checking Nginx Error Logs for 'permission denied' or 'No such file':"
        sudo grep "uploads" /var/log/nginx/error.log | tail -n 20 || echo "📡 No upload errors found."

        echo "\\n📂 4. Testing Local HTTP Request directly on 127.0.0.1 (Internal):"
        SAMPLE_FILE=$(sudo ls -t /mnt/uploads/project_photos/ | head -n 1)
        if [ ! -z "$SAMPLE_FILE" ]; then
            echo "🧪 Requesting: https://stride.deped.gov.ph/uploads/project_photos/$SAMPLE_FILE"
            curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/uploads/project_photos/$SAMPLE_FILE" 2>&1 | grep -iE "HTTP/|Content-Type|Content-Length"
        else
            echo "⚠️ No files found to test."
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
