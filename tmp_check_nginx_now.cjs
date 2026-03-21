const { Client } = require('ssh2');

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

const conn = new Client();
conn.on('ready', () => {
    conn.exec('cat /etc/nginx/sites-available/default | grep -A 20 "STAGING BACKEND" && echo "--- PM2 STATUS ---" && pm2 list', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('data', d => dataStr += d.toString());
        stream.on('close', () => {
            console.log(dataStr);
            conn.end();
        });
    });
}).connect(config);
