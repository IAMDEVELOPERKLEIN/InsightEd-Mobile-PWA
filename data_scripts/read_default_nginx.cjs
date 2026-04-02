const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Full Reading of /etc/nginx/sites-available/default...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    conn.exec('sudo cat /etc/nginx/sites-available/default', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
});
