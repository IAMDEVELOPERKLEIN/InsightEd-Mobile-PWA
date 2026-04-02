const { Client } = require('ssh2');
const conn = new Client();

console.log('🔄 Syncing existing uploads from Root to /mnt volume...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to sync existing files if they exist, then potentially symlink or just leave them.
    // We use rsync for safe copying, then we'll let the user decide when to purge the old ones.
    const sourceDir = '/var/www/html/InsightEd-Staging/uploads';
    const targetDir = '/mnt/uploads';

    const cmd = `
        if [ -d "${sourceDir}" ]; then
            echo "📦 Syncing ${sourceDir} to ${targetDir}..." && 
            sudo rsync -av --ignore-existing ${sourceDir}/ ${targetDir}/ && 
            sudo chown -R www-data:www-data ${targetDir} && 
            echo "✅ Sync Complete."
        else
            echo "⚠️ Source directory ${sourceDir} not found. Skipping sync."
        fi
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
