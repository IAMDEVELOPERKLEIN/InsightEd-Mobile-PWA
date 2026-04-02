const { Client } = require('ssh2');
const conn = new Client();

console.log('🔄 Verifying and Restarting Apps...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // Command to check processes and restart if missing
    const cmd = `
        echo "--- 1. Node Processes ---"
        ps aux | grep node | grep -v grep

        # Function to start app if missing
        check_and_start() {
            local dir=$1
            local name=$2
            if ! ps aux | grep "node $dir/api/index.js" | grep -v grep > /dev/null; then
                echo "🚀 Starting $name..."
                cd "$dir" && nohup node api/index.js > output.log 2>&1 &
            else
                echo "✅ $name is already running."
            fi
        }

        check_and_start "/var/www/html/InsightEd-Mobile-PWA" "Production"
        check_and_start "/var/www/html/InsightEd-Staging" "Staging"
        
        echo "\n--- 2. Final Process Check ---"
        ps aux | grep node | grep -v grep
    `.trim();

    conn.exec(cmd, { pty: true }, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data);
            if (data.toString().includes('[sudo] password')) {
                stream.write('7v52E69TYgTE\n');
            }
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
});
