const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

const REMOTE_PATH = '/var/www/html/InsightEd-Mobile-PWA/forensic_heal.sh';
const LOCAL_PATH = 'forensic_heal.sh';

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('SFTP :: ready');
        const readStream = fs.createReadStream(LOCAL_PATH);
        const writeStream = sftp.createWriteStream(REMOTE_PATH);

        writeStream.on('close', () => {
            console.log('Upload :: success');
            conn.exec(`chmod +x ${REMOTE_PATH} && STAGING_DIR=/var/www/html/InsightEd-Mobile-PWA PM2_NAME=insighted-backend ${REMOTE_PATH}`, (err, stream) => {
                if (err) throw err;
                stream.on('data', (data) => {
                    process.stdout.write(data);
                }).stderr.on('data', (data) => {
                    process.stderr.write(data);
                }).on('close', () => {
                    console.log('Execution :: complete');
                    conn.end();
                });
            });
        });

        readStream.pipe(writeStream);
    });
}).connect(config);
