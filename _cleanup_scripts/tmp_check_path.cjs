const { Client } = require('ssh2');

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

const conn = new Client();

conn.on('ready', () => {
    // Clear the error log, trigger a curl, then read the error log
    conn.exec('sudo truncate -s 0 /var/log/nginx/error.log && curl -I http://localhost/insighted-staging/assets/index-CC2xqMZv.css && sudo cat /var/log/nginx/error.log', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect(config);
