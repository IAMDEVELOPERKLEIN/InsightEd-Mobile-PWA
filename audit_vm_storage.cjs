const { Client } = require('ssh2');
const SERVER_IP = "20.24.58.49";
const USER = "Administrator1";
const PASS = "7v52E69TYgTE";

const conn = new Client();

const commands = [
    'df -h | grep -v tmpfs',
    'echo "--- Top 10 Largest Directories in / ---"',
    'sudo du -ah / --max-depth=2 2>/dev/null | sort -rh | head -n 20',
    'echo "--- Ollama Check ---"',
    'ollama list 2>/dev/null || echo "Ollama command failed"',
    'sudo du -sh ~/.ollama /usr/share/ollama /var/lib/ollama 2>/dev/null',
    'echo "--- Docker Storage ---"',
    'docker system df 2>/dev/null || echo "Docker not installed"',
    'echo "--- PM2 Process List ---"',
    'pm2 list 2>/dev/null || echo "PM2 not installed"',
    'echo "--- Unused Large Files (not accessed in 180 days) ---"',
    'sudo find / -type f -size +100M -atime +180 -exec ls -lhu {} \\; 2>/dev/null',
];

conn.on('ready', () => {
    console.log('SSH Connection Established.');
    let currentCmd = 0;

    function runNext() {
        if (currentCmd >= commands.length) {
            conn.end();
            return;
        }
        const cmd = commands[currentCmd++];
        console.log(`\n> Running: ${cmd}`);
        conn.exec(cmd, (err, stream) => {
            if (err) {
                console.error(err);
                runNext();
                return;
            }
            stream.on('close', (code) => {
                runNext();
            }).on('data', (data) => {
                process.stdout.write(data);
            }).stderr.on('data', (data) => {
                process.stderr.write(data);
            });
        });
    }
    runNext();
}).connect({
    host: SERVER_IP,
    port: 22,
    username: USER,
    password: PASS
});
