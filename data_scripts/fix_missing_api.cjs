const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🚀 Executing Upload API Restoration: Injecting Production API sub-portal routing...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    // We will explicitly fix the missing /insighted/api/ block
    const cmd = `
        sudo cp /etc/nginx/sites-available/stride.conf /etc/nginx/sites-available/stride.conf.api2_backup
        
        sudo awk '/location \\/api\\/ \\{/ {
            print "    # Production API Prefix"
            print "    location /insighted/api/ {"
            print "        proxy_pass http://localhost:5000/api/;"
            print "        proxy_http_version 1.1;"
            print "        proxy_set_header Upgrade \\$http_upgrade;"
            print "        proxy_set_header Connection \\"upgrade\\";"
            print "        proxy_set_header Host \\$host;"
            print "        proxy_set_header X-Forwarded-Proto \\$scheme;"
            print "        client_max_body_size 100M;"
            print "    }\n"
            print;
            next
        } 
        1' /etc/nginx/sites-available/stride.conf > /tmp/stride.conf.api2_new
        
        sudo mv /tmp/stride.conf.api2_new /etc/nginx/sites-available/stride.conf

        sudo nginx -t && sudo systemctl reload nginx

        echo "\\n🧪 Testing /insighted/api/upload-image"
        curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/insighted/api/upload-image" 2>&1 | grep -iE "HTTP/"
        
        echo "\\n🧪 Testing /insighted-staging/api/upload-image"
        curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/insighted-staging/api/upload-image" 2>&1 | grep -iE "HTTP/"
    `;

    conn.exec(cmd, { pty: true }, (err, stream) => { 
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data)).on('close', () => { conn.end(); });
        if (cmd.includes('[sudo] password')) {
            stream.write('7v52E69TYgTE\n');
        }
    }); 
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({ host: '20.24.58.49', port: 22, username: 'Administrator1', password: '7v52E69TYgTE' });
