const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    // Check file existence and size
    const cmd = `
        ls -l /etc/nginx/sites-available/
        cat /etc/nginx/sites-available/stride.conf | wc -l
        sudo nginx -t
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
