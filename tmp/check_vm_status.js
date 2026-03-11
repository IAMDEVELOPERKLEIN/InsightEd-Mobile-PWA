import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('Client :: ready');
    const serviceContent = `[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin"
Environment="OLLAMA_KEEP_ALIVE=-1"
Environment="OLLAMA_NUM_PARALLEL=2"
Environment="OLLAMA_MAX_LOADED_MODELS=2"

[Install]
WantedBy=default.target`;

    const escapedContent = serviceContent.replace(/"/g, '\\"');
    
    conn.exec(`echo "${escapedContent}" | sudo tee /etc/systemd/system/ollama.service > /dev/null && sudo systemctl daemon-reload && sudo systemctl restart ollama`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`Optimization applied with code ${code}`);
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
