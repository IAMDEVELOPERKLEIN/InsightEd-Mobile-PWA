const { Client } = require('ssh2');

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

const conn = new Client();
conn.on('ready', () => {
    console.log('CONNECTED');
    // Append PORT=5001 and restart
    const cmd = 'echo "PORT=5001" >> /var/www/html/InsightEd-Staging/.env && pm2 restart insighted-staging --update-env';
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Command finished with exit code ${code}`);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect(config);
