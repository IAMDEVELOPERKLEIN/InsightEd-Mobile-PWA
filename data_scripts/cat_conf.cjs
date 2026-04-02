const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec('sudo cat /etc/nginx/sites-available/stride.conf', { pty: true }, (err, stream) => { 
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { conn.end(); });
        if (true) { stream.write('7v52E69TYgTE\n'); }
    }); 
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
