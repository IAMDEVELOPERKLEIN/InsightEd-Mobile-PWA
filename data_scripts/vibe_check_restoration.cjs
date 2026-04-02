const { Client } = require('ssh2'); 
const conn = new Client(); 

const DEBUG_MODE = true;

conn.on('ready', () => { 
    if (DEBUG_MODE) console.log('✅ SSH Connection Ready. Executing Vibe Check...');
    
    const cmd = `
        echo "📂 1. Verifying stride.conf line count:"
        wc -l /etc/nginx/sites-available/stride.conf

        echo "\\n📂 2. Verifying presence of /api/ and /insighted/api/ in stride.conf:"
        grep -nE "location /api/|location /insighted/api/|location /insighted-staging/api/" /etc/nginx/sites-available/stride.conf || echo "❌ Missing blocks!"

        echo "\\n📂 3. Local Loopback API Auth Route Test (Port 5000 /insighted/api/):"
        curl -X POST -kv -H "Host: stride.deped.gov.ph" https://127.0.0.1/insighted/api/auth/migrate-login 2>&1 | grep -iE "HTTP/"

        echo "\\n📂 4. Monitoring Nginx error logs for 5 seconds..."
        timeout 5 tail -f /var/log/nginx/error.log || echo "✅ Clean log check complete."
    `;

    conn.exec(cmd, { pty: true }, (err, stream) => { 
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { 
            if (DEBUG_MODE) console.log('✅ Vibe Check Complete. Disconnecting.');
            conn.end(); 
        });
        if (cmd.includes('sudo')) { stream.write('7v52E69TYgTE\n'); }
    }); 
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
