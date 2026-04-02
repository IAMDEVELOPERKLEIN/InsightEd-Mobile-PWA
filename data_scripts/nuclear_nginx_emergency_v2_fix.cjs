const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Emergency Nginx Restoration V2: Correcting "tinclude" typo...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Correcting the tinclude error in nginx.conf..."
        sudo sed -i 's/tinclude/include/g' /etc/nginx/nginx.conf

        echo "\\n🛠️ 2. Critical Syntax Test..."
        sudo nginx -t

        echo "\\n🚀 3. Final Service Restart..."
        sudo systemctl stop nginx
        sudo systemctl start nginx

        echo "\\n✅ EMERGENCY RESTORATION COMPLETE."
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
