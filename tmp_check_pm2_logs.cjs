const { Client } = require('ssh2');

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

const conn = new Client();
conn.on('ready', () => {
    conn.exec('pm2 logs insighted-staging --lines 50 --nostream', (err, stream) => {
        if (err) throw err;
        let logData = '';
        stream.on('data', d => logData += d.toString());
        stream.on('close', () => {
            console.log(logData);
            conn.end();
        });
    });
}).connect(config);
