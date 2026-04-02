const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('✅ SSH Connection Ready. Fetching stride.conf.api2_backup...');
    
    conn.exec('sudo cat /etc/nginx/sites-available/stride.conf.api2_backup', { pty: true }, (err, stream) => {
        if (err) throw err;
        let fileContent = '';
        stream.on('data', (data) => {
            fileContent += data.toString();
        }).on('close', () => {
            // Remove the prompt / password from output
            const lines = fileContent.split('\n').filter(line => !line.includes('[sudo] password') && !line.includes('7v52E69TYgTE'));
            fs.writeFileSync('stride_conf_backup.txt', lines.join('\n'));
            console.log('✅ Backup file saved locally to stride_conf_backup.txt');
            conn.end();
        });
        stream.write('7v52E69TYgTE\n');
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
