const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('✅ SSH Connection Ready. Uploading new stride.conf...');
    
    conn.sftp((err, sftp) => {
        if (err) throw err;
        
        const localPath = 'stride_conf_backup.txt';
        const remoteTmpPath = '/tmp/stride.conf';
        
        sftp.fastPut(localPath, remoteTmpPath, (err) => {
            if (err) throw err;
            console.log('✅ Uploaded to /tmp/stride.conf');
            
            const cmd = `
                echo "Applying configuration..."
                sudo cp /tmp/stride.conf /etc/nginx/sites-available/stride.conf
                sudo nginx -t && sudo systemctl reload nginx
            `;
            
            conn.exec(cmd, { pty: true }, (err, stream) => {
                if (err) throw err;
                stream.on('data', (data) => process.stdout.write(data)).on('close', () => {
                    console.log('✅ Nginx reload complete.');
                    conn.end();
                });
                
                // Keep writing password just in case multiple prompts appear
                let count = 0;
                stream.on('data', (d) => {
                    if (d.toString().includes('[sudo] password')) {
                        stream.write('7v52E69TYgTE\n');
                    }
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
