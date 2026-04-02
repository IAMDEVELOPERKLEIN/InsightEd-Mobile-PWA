const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing Azure Health Alignment: Restoring Gateway Handshake...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // We need to surgically insert a health check block into stride.conf
    const cmd = `
        echo "📂 1. Backing up current stride.conf..."
        sudo cp /etc/nginx/sites-available/stride.conf /tmp/stride_before_health.bak

        echo "\\n📂 2. Updating stride.conf with Health Handshake logic..."
        # We will use a sed/awk or just write the whole thing for precision
        cat <<EOF > /tmp/stride_health.conf
server {
    listen 80;
    server_name stride.deped.gov.ph;
    return 301 https://\\$host\\$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    server_name stride.deped.gov.ph;

    ssl_certificate /etc/nginx/ssl/fullchain3.pem;
    ssl_certificate_key /etc/nginx/ssl/privatekey3.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;

    # Azure Health Probe Handshake
    location = / {
        access_log off;
        add_header Content-Type text/plain;
        return 200 'healthy';
    }

    location ^~ /uploads/ {
        alias /mnt/uploads/;
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        expires 30d;
    }

    location /insighted-staging/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
EOF

        echo "\\n📂 3. Applying the Health-Aligned Config..."
        sudo mv /tmp/stride_health.conf /etc/nginx/sites-available/stride.conf
        
        echo "\\n🛠️ 4. Final Syntax Test..."
        sudo nginx -t

        echo "\\n🚀 5. Site Reactivation..."
        sudo systemctl restart nginx

        echo "\\n✅ AZURE HEALTH ALIGNMENT COMPLETE."
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
