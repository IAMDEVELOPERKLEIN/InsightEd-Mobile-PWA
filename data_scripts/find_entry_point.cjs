const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Finding the Production entry point...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📡 1. Deep listing of /var/www/html/..."
        ls -F /var/www/html/

        echo "\\n📡 2. Searching for index.js in any api folder..."
        find /var/www/html/ -maxdepth 3 -name "index.js" | grep "api"
    `.trim();

    conn.exec(cmd, { pty: true }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data);
            if (data.toString().includes('[sudo] password')) {
                stream.write('7v52E69TYgTE\n');
            }
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
