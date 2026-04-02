const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Final File & Config Audit...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Listing files in /mnt/uploads/project_photos/ (last 3):"
        sudo ls -lt /mnt/uploads/project_photos/ | head -n 4

        echo "\\n📂 2. Current Nginx site configuration (stride.conf):"
        sudo cat /etc/nginx/sites-available/stride.conf

        echo "\\n📂 3. Testing local resolution via curl (ignore SSL):"
        LATEST_FILE=$(sudo ls -t /mnt/uploads/project_photos/ | head -n 1)
        if [ ! -z "$LATEST_FILE" ]; then
            echo "🧪 Testing: http://localhost/uploads/project_photos/$LATEST_FILE"
            curl -I -H "Host: stride.deped.gov.ph" "http://localhost/uploads/project_photos/$LATEST_FILE"
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
