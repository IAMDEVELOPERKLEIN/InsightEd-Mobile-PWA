const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: In-Depth Login Failure Audit (Final Script)...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. FULL Nginx sites-available/stride.conf Audit (No Truncation):"
        sudo cat /etc/nginx/sites-available/stride.conf

        echo "\\n📂 2. Nginx Access Log Audit (Searching for ALL login/api responses):"
        sudo grep -E "login|api" /var/log/nginx/access.log | tail -n 30 || echo "📡 No login/api logs found."

        echo "\\n📂 3. Nginx Location Block Preference Check:"
        # Verifying which location block matches /api/login
        sudo nginx -T | grep -v "#" | grep -A 5 "location /api/"
        
        echo "\\n📂 4. Testing Login Endpoint directly (Head only):"
        curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/api/login" 2>&1 | grep -iE "HTTP/|location"
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
