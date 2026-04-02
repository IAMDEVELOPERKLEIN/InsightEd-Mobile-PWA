const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. PM2 Status Audit:"
        pm2 list
        
        echo "\\n📂 2. checking PM2 restarts for stride-prod:"
        pm2 show stride-prod | grep -iE "status|restart"

        echo "\\n📂 3. Testing Local API Login (Port 5000):"
        # We don't need real credentials, just see if it returns 200, 400, or 404 (Not Nginx error)
        curl -X POST -kv http://localhost:5000/api/login 2>&1 | grep -iE "HTTP/" || echo "📡 Port 5000 is not responding."

        echo "\\n📂 4. Testing Nginx API Login (Public Path):"
        curl -X POST -kv -H "Host: stride.deped.gov.ph" https://127.0.0.1/api/login 2>&1 | grep -iE "HTTP/" || echo "📡 Nginx is not proxying /api/login correctly."
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
