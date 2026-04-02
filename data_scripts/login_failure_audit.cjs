const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Investigating Login Failure...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Current Nginx sites-available/stride.conf (FULL):"
        sudo cat /etc/nginx/sites-available/stride.conf

        echo "\\n📂 2. Tail Nginx Access Log for login attempts:"
        sudo grep -i "login" /var/log/nginx/access.log | tail -n 20 || echo "📡 No login attempts found in access log."

        echo "\\n📂 3. Tail Nginx Error Log for any path conflicts:"
        sudo tail -n 50 /var/log/nginx/error.log | grep -iE "login|api|failed" || echo "📡 No recent login/api errors."

        echo "\\n📂 4. Checking PM2 logs for stride-prod (Port 5000) during login:"
        pm2 logs stride-prod --lines 50 --nostream | grep -i "login" || echo "📡 No login activity in stride-prod logs."
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
