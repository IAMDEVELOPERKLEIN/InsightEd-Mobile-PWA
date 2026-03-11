import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('Client :: ready');
    // Check ufw status and try to allow 11434
    const cmd = `command -v cloudflared || echo "cloudflared not found"`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect({
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
});
