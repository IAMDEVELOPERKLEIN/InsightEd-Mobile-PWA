const { Client } = require('ssh2');
const config = { host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' };
const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la /var/www/html/InsightEd-Staging/vite.config.js /var/www/html/InsightEd-Staging/tailwind.config.js /var/www/html/InsightEd-Staging/postcss.config.js || echo "Missing files!"', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', data => console.log('STAGING:\n' + data.toString())).stderr.on('data', data => console.error(data.toString()));
    });
}).connect(config);
