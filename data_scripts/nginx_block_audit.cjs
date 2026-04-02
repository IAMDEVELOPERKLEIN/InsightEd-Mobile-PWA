const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Searching for all /api/ blocks in stride.conf:"
        sudo grep -n "location /api/" /etc/nginx/sites-available/stride.conf

        echo "\\n📂 2. Extracting the context of the /api/ block:"
        # Replace 47 with whatever line number comes from grep -n
        sudo sed -n '40,80p' /etc/nginx/sites-available/stride.conf

        echo "\\n📂 3. Checking for /insighted blocks:"
        sudo grep -n "location /insighted" /etc/nginx/sites-available/stride.conf
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
