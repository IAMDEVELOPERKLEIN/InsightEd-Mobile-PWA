import { Client } from 'ssh2';

const conn = new Client();

const commands = [
    'curl -fsSL https://ollama.com/install.sh | sh',
    'ollama pull nomic-embed-text',
    'ollama pull llama3'
];

conn.on('ready', () => {
    console.log('Client :: ready');
    let commandIdx = 0;

    function executeNext() {
        if (commandIdx >= commands.length) {
            console.log('All commands executed successfully');
            conn.end();
            return;
        }

        const cmd = commands[commandIdx];
        console.log(`Executing: ${cmd}`);

        conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log(`Command ${cmd} exited with code ${code}`);
                if (code === 0) {
                    commandIdx++;
                    executeNext();
                } else {
                    console.error(`Command failed with code ${code}`);
                    conn.end();
                    process.exit(1);
                }
            }).on('data', (data) => {
                process.stdout.write(data);
            }).stderr.on('data', (data) => {
                process.stderr.write(data);
            });
        });
    }

    executeNext();
}).connect({
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
});
