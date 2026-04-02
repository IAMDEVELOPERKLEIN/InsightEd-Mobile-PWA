const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Final Verification: Testing Sub-Portal Broken Link Remedy...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    // Using simple bash statements avoiding complex string evaluation bugs
    const cmd = `
        echo "🧪 Requesting an image through the /insighted/ proxy path to confirm Nginx Regex works:"
        # Grabbing the latest image file specifically
        FILE_NAME=\`sudo ls -t /mnt/uploads/project_photos/ | head -n 1\`
        
        if [ -n "$FILE_NAME" ]; then
            echo "Requesting: https://stride.deped.gov.ph/insighted/uploads/project_photos/$FILE_NAME"
            curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/insighted/uploads/project_photos/$FILE_NAME" 2>&1 | grep -iE "HTTP/|Content-Type|Content-Length"
        else
            echo "No file found."
        fi
    `;

    conn.exec(cmd, { pty: true }, (err, stream) => { 
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { conn.end(); });
        if (cmd.includes('[sudo] password')) {
            stream.write('7v52E69TYgTE\n');
        }
    }); 
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
