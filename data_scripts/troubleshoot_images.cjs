const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Deep Troubleshooting: Image Retrieval Failure...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "--- 1. Checking Nginx Error Logs (Last 20) ---"
        sudo tail -n 20 /var/log/nginx/error.log

        echo "\n--- 2. Verifying physical existence of recent photos ---"
        sudo ls -ltr /mnt/uploads/project_photos | tail -n 5

        echo "\n--- 3. Checking directory permissions down to the file level ---"
        sudo namei -l /mnt/uploads/project_photos/$(sudo ls -1 /mnt/uploads/project_photos | tail -n 1)

        echo "\n--- 4. Checking recently inserted database records (Staging) ---"
        # We'll use psql to check the last 3 image records
        sudo -u postgres psql -d insightEd -c "SELECT id, image_data, file_path, category FROM engineer_image ORDER BY id DESC LIMIT 3;"

        echo "\n--- 5. Checking Nginx Access Logs for 404s ---"
        sudo tail -n 50 /var/log/nginx/access.log | grep "/uploads/" | tail -n 10
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
