const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    // We will check PM2 logs for the last 100 lines for any login activity.
    const cmd = `
        echo "📂 checking PM2 Logs for stride-prod (Port 5000):"
        pm2 logs stride-prod --lines 100 --nostream | grep -iE "login|auth|api"

        echo "\\n📂 checking Nginx Access Logs for the last 50 login attempts:"
        sudo grep -iE "login|api" /var/log/nginx/access.log | tail -n 50
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
