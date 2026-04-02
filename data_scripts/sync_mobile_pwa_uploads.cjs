const { Client } = require('ssh2');
const conn = new Client();

console.log('🔄 Syncing 1.2GB from InsightEd-Mobile-PWA to /mnt volume...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to sync the large directory
    const sourceDir = '/var/www/html/InsightEd-Mobile-PWA/uploads';
    const targetDir = '/mnt/uploads';

    const cmd = `
        echo "📦 Starting 1.2GB migration from ${sourceDir}..."
        sudo rsync -av --ignore-existing ${sourceDir}/ ${targetDir}/ && 
        sudo chown -R www-data:www-data ${targetDir} && 
        echo "--- Verification ---" &&
        echo "Source: $(sudo du -sh ${sourceDir})" &&
        echo "Target: $(sudo du -sh ${targetDir})" &&
        echo "✅ Sync Complete."
    `.trim();

    conn.exec(cmd, { pty: true }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`✅ Remote sync finished (exit code: ${code})`);
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
