const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. FULL CAT of sites-available/stride.conf (using head and tail to ensure no truncation in small steps):"
        echo "--- PART 1 ---"
        sudo head -n 50 /etc/nginx/sites-available/stride.conf
        echo "--- PART 2 ---"
        sudo sed -n '51,100p' /etc/nginx/sites-available/stride.conf
        echo "--- PART 3 ---"
        sudo sed -n '101,150p' /etc/nginx/sites-available/stride.conf
    `;

    conn.exec(cmd, { pty: true }, (err, stream) => { 
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { conn.end(); });
        if (cmd.includes('sudo')) { stream.write('7v52E69TYgTE\n'); }
    }); 
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
