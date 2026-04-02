const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec('sudo cat /etc/nginx/sites-available/stride.conf', { pty: true }, (err, stream) => { 
        if (err) throw err;
        let buffer = '';
        stream.on('data', (data) => { buffer += data; });
        stream.on('stderr', (data) => { console.error('STDERR:', data.toString()); });
        stream.on('close', () => {
            console.log('--- START CONFIG ---');
            console.log(buffer);
            console.log('--- END CONFIG ---');
            conn.end();
        });
        stream.write('7v52E69TYgTE\n');
    }); 
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
