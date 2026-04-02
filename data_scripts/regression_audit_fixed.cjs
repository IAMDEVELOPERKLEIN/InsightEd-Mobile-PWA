const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Final Regression Audit (Fixed Script)...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Displaying current Nginx sites-available/stride.conf (Checking for misdirected /api/):"
        sudo cat /etc/nginx/sites-available/stride.conf

        echo "\\n📂 2. Tail Nginx logs for any 502/504 errors on /api/:"
        sudo tail -n 100 /var/log/nginx/error.log | grep -i "/api/" || echo "📡 No recent /api/ errors in Nginx log."

        echo "\\n📂 3. Checking Frontend-to-Backend URL mapping:"
        # Let's check how the frontend in 'dist' built its API routes if possible
        grep -r "/api/" /var/www/html/InsightEd-Mobile-PWA/dist/ | head -n 5 || echo "📡 No API calls found in dist (obfuscated)."

        echo "\\n📂 4. Confirming Node process user and group membership:"
        id Administrator1
        ps aux | grep "api/index.js" | grep -v grep
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
