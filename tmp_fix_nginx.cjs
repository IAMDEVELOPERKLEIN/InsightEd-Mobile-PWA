const { Client } = require('ssh2');
const conn = new Client();

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

conn.on('ready', () => {
    console.log('Client :: ready');
    // Move all .bak files out of sites-enabled to a backup directory
    const cmd = `
        sudo mkdir -p /etc/nginx/conf_backups && 
        sudo mv /etc/nginx/sites-enabled/*.bak.* /etc/nginx/conf_backups/ 2>/dev/null || true &&
        sudo nginx -t &&
        sudo systemctl reload nginx
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        }).on('close', () => {
            console.log('Nginx fix complete');
            conn.end();
        });
    });
}).connect(config);
