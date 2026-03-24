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
    
    const commands = [
        'cat /etc/nginx/sites-available/insighted-staging',
        'ls -R /var/www/html/InsightEd-Staging/dist | head -n 50',
        'cat /var/www/html/InsightEd-Staging/dist/index.html | head -n 20'
    ];

    let results = '';

    const executeNext = (index) => {
        if (index >= commands.length) {
            console.log(results);
            conn.end();
            return;
        }

        results += `\n--- CMD: ${commands[index]} ---\n`;
        conn.exec(commands[index], (err, stream) => {
            if (err) {
                results += `ERROR: ${err.message}\n`;
                executeNext(index + 1);
                return;
            }
            stream.on('close', () => {
                executeNext(index + 1);
            }).on('data', (data) => {
                results += data.toString();
            }).stderr.on('data', (data) => {
                results += 'STDERR: ' + data.toString();
            });
        });
    };

    executeNext(0);
}).connect(config);
