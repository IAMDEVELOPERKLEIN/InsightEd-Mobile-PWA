const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🔍 Diagnostic: Final Regression Audit...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Checking PM2 logs for stride-prod (All output):"
        pm2 logs stride-prod --lines 100 --nostream

        echo "\\n📂 2. Checking PM2 logs for stride-staging (All output):"
        pm2 logs stride-staging --lines 50 --nostream

        echo "\\n📂 3. Checking .env for UPLOAD_DIR in all root folders:"
        grep "UPLOAD_DIR" /var/www/html/InsightEd-Mobile-PWA/.env
        grep "UPLOAD_DIR" /var/www/html/InsightEd-Staging/.env

        echo "\\n📂 4. Checking current directory permissions again:"
        ls -ld /mnt/uploads
        ls -ld /mnt/uploads/project_photos
        
        echo "\\n📂 5. Checking Nginx config for any /api/ conflicts:"
        sudo cat /etc/nginx/sites-available/stride.conf | grep -A 5 "location /api/"
    `;

    conn.exec(cmd, { pty: true }, (err, stream) => { 
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { conn.end(); });
        if (cmd.includes('[sudo] password')) {
            stream.write('7v52E69TYgTE\n');
        }
    }); 
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
