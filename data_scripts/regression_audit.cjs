const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Investigating Upload & DB Storage Failure...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Displaying current Nginx sites-available/stride.conf (Checking for misdirected /api/):"
        sudo cat /etc/nginx/sites-available/stride.conf

        echo "\\n📂 2. Checking Nginx Error Log for recent 404/500/413 errors:"
        sudo tail -n 100 /var/log/nginx/error.log | grep -iE "uploads|api" | tail -n 20 || echo "📡 No recent upload/api errors found."

        echo "\\n📂 3. Checking Backend Error Logs (stride-prod):"
        pm2 logs stride-prod --lines 100 --nostream | grep -iE "error|fail" | tail -n 20 || echo "📡 No backend errors in recent logs."

        echo "\\n📂 4. Confirming Disk Space on /mnt/uploads:"
        df -h /mnt/uploads
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
