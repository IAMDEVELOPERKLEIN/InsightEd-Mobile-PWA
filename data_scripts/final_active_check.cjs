const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Final Diagnostic: Finding active process and nginx site config...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "--- 1. Running Processes (Node) ---"
        ps aux | grep node | grep -v grep

        echo "\n--- 2. Finding Nginx config for stride.deped.gov.ph ---"
        sudo grep -l "stride.deped.gov.ph" /etc/nginx/sites-available/*

        echo "\n--- 3. Checking pm2 for all users ---"
        sudo pm2 status || echo "PM2 not found in sudo path"
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
