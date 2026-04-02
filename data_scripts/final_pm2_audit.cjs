const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Final Archaeological Audit: Mapping PM2 Processes to Project Paths...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Identifying the Project for 'stride-prod':"
        sudo pm2 show stride-prod | grep "script path"

        echo "\\n📂 2. Identifying the Project for 'stride-staging':"
        sudo pm2 show stride-staging | grep "script path"

        echo "\\n📂 3. Identifying the Project for 'stride-app' (if exists):"
        sudo pm2 show stride-app | grep "script path" || echo "📡 No stride-app found."

        echo "\\n📂 4. Checking for any other .conf files in sites-available that mention the dashboard root:"
        sudo grep -r "root" /etc/nginx/sites-available/ | grep -v "insighted"
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
