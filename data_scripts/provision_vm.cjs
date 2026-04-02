const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Connecting to STRIDE-PROD-VM-01 (20.24.58.49)...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command sequence to provision storage on /mnt
    const cmd = [
        'sudo mkdir -p /mnt/uploads/school_docs',
        'sudo mkdir -p /mnt/uploads/project_photos',
        'sudo mkdir -p /mnt/uploads/project_docs',
        'sudo mkdir -p /mnt/uploads/temp',
        'sudo chown -R www-data:www-data /mnt/uploads',
        'sudo chmod -R 775 /mnt/uploads',
        'ls -la /mnt/uploads'
    ].join(' && ');

    conn.exec(cmd, { pty: true }, (err, stream) => {
        if (err) throw err;
        
        // Handle sudo password check (if needed) - but assuming nopasswd or sshpass-like behavior
        // Since the VM allows sudo for Administrator1, we'll try it directly.
        
        stream.on('close', (code) => {
            console.log(`✅ Remote setup finished (exit code: ${code})`);
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data);
            // Handle sudo password prompt if it appears
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
