const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Testing Local Backend (Port 5000) for REAL login route:"
        curl -X POST -kv http://localhost:5000/api/auth/migrate-login 2>&1 | grep -iE "HTTP/"

        echo "\\n📂 2. Testing Nginx (Public) for REAL login route:"
        curl -X POST -kv -H "Host: stride.deped.gov.ph" https://127.0.0.1/api/auth/migrate-login 2>&1 | grep -iE "HTTP/"

        echo "\\n📂 3. Testing Local Backend (Port 5001) for Staging login route:"
        curl -X POST -kv http://localhost:5001/api/auth/migrate-login 2>&1 | grep -iE "HTTP/"

        echo "\\n📂 4. checking Nginx config for auth routes specifically:"
        sudo grep -nC 2 "auth" /etc/nginx/sites-available/stride.conf
    `;

    conn.exec(cmd, { pty: true }, (err, stream) => { 
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { conn.end(); });
        if (cmd.includes('sudo')) { stream.write('7v52E69TYgTE\n'); }
    }); 
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
