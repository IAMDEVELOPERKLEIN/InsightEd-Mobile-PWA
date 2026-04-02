const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Final MIME & Permission Audit...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Checking permissions of the entire path chain:"
        ls -ld / 
        ls -ld /mnt
        ls -ld /mnt/uploads
        ls -ld /mnt/uploads/project_photos

        echo "\\n📂 2. Checking if mime.types exists and has jpeg:"
        grep "image/jpeg" /etc/nginx/mime.types || echo "⚠️ JPEG not found in mime.types"

        echo "\\n📂 3. Testing HTTPS resolution with full headers (Verbosity ON):"
        SAMPLE_FILE=$(sudo ls -t /mnt/uploads/project_photos/ | head -n 1)
        if [ ! -z "$SAMPLE_FILE" ]; then
            echo "🧪 Requesting: https://stride.deped.gov.ph/uploads/project_photos/$SAMPLE_FILE"
            curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/uploads/project_photos/$SAMPLE_FILE" 2>&1 | grep -iE "HTTP/|Content-Type|Content-Length"
        else
            echo "⚠️ No files found."
        fi
        
        echo "\\n📂 4. Checking if there are any .htaccess or other overrides in the path:"
        find /mnt/uploads -name ".htaccess" || echo "📡 No .htaccess found."
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
