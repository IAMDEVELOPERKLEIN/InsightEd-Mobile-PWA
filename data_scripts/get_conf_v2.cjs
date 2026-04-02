const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    let output = '';
    conn.exec('sudo cat /etc/nginx/sites-available/stride.conf', { pty: true }, (err, stream) => { 
        if (err) { console.error(err); process.exit(1); }
        stream.on('data', (data) => {
            output += data;
        }).on('close', () => {
            process.stdout.write(output);
            conn.end();
            process.exit(0);
        });
        // Type the sudo password if prompted
        stream.write('7v52E69TYgTE\n');
    }); 
}).on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
