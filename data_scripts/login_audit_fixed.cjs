const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Final Login Failure Audit (Fixed Script)...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Displaying current Nginx sites-available/stride.conf (Checking for misdirected /api/):"
        sudo cat /etc/nginx/sites-available/stride.conf

        echo "\\n📂 2. checking Nginx status:"
        sudo systemctl status nginx

        echo "\\n📂 3. Checking for any Nginx error logs related to login or connection refused:"
        sudo tail -n 50 /var/log/nginx/error.log | grep -iE "login|connect|failed" || echo "📡 No recent login/connection errors."

        echo "\\n📂 4. Checking PM2 logs for Port 5000 and 5001 specifically for login endpoints:"
        pm2 logs stride-prod --lines 50 --nostream | grep -i "/api/" || echo "📡 No API activity in prod."
        pm2 logs stride-staging --lines 50 --nostream | grep -i "/api/" || echo "📡 No API activity in staging."
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
