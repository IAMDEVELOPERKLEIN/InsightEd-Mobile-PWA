const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Archaeological Audit: Retrieving Final STRIDE Dashboard Configuration...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Reading STRIDE-React package.json (start scripts):"
        sudo cat /srv/shiny-server/app1/STRIDE-React/package.json | grep -A 10 "scripts"

        echo "\\n📂 2. Reading STRIDE-React .env for Port or Backend URL:"
        sudo cat /srv/shiny-server/app1/STRIDE-React/.env || echo "📡 No .env found."

        echo "\\n📂 3. Checking for a 'build' folder in the dashboard path:"
        sudo ls -la /srv/shiny-server/app1/STRIDE-React/build || echo "📡 No build folder found."

        echo "\\n📂 4. Reading the existing deploy-stride.sh for the exact PM2 command:"
        sudo cat /srv/shiny-server/app1/STRIDE-React/deploy-stride.sh || echo "📡 No deploy script found."
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
