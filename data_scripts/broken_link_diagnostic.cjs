const { Client } = require('ssh2');
const conn = new Client();

console.log('🔍 Diagnostic: Investigating Broken Photo Links...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Checking last 20 Nginx access logs for /uploads/:"
        sudo tail -n 50 /var/log/nginx/access.log | grep "/uploads/" || echo "📡 No recent upload requests found."

        echo "\\n📂 2. Checking Nginx error logs for 403/404 on uploads:"
        sudo tail -n 50 /var/log/nginx/error.log | grep "uploads" || echo "📡 No recent upload errors found."

        echo "\\n📂 3. Testing direct Nginx resolution for a known file:"
        # Find a file in the photos dir
        LATEST_PHOTO=\\$(ls -t /mnt/uploads/project_photos/ | head -n 1)
        if [ ! -z "\\$LATEST_PHOTO" ]; then
            echo "🧪 Requesting: https://stride.deped.gov.ph/uploads/project_photos/\\$LATEST_PHOTO"
            curl -Ik https://stride.deped.gov.ph/uploads/project_photos/\\$LATEST_PHOTO
        else
            echo "⚠️ No photos found to test."
        fi

        echo "\\n📂 4. Confirming Nginx configuration file content for /uploads/:"
        sudo cat /etc/nginx/sites-available/stride.conf | grep -A 10 "location ^~ /uploads/"
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
