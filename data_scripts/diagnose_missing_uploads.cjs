const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Deep Diagnostic of Upload Directories...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Commands to find all 'uploads' directories and their sizes
    const cmd = `
        echo "--- 1. Locating all 'uploads' directories ---"
        sudo find /var/www/html -type d -name "uploads" -exec du -sh {} +

        echo "\n--- 2. Checking /mnt/uploads contents ---"
        sudo du -sh /mnt/uploads

        echo "\n--- 3. Checking for large files/folders in /var/www/html ---"
        sudo du -h --max-depth=2 /var/www/html | sort -hr | head -n 10

        echo "\n--- 4. Checking for symlinks in known upload paths ---"
        sudo find /var/www/html -type l -name "uploads"
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
