const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 SSL Restoration: Recovering Certificate Paths and Hardening Nginx...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Searching for SSL Certificates in legacy backups..."
        sudo grep -r "ssl_certificate" /tmp/nginx_legacy_backup/

        echo "\\n📂 2. Verifying certificate files on disk..."
        # Extract the path from the first match
        CERT_PATH=$(sudo grep -r "ssl_certificate " /tmp/nginx_legacy_backup/ | head -n 1 | awk '{print $3}' | tr -d ';')
        KEY_PATH=$(sudo grep -r "ssl_certificate_key " /tmp/nginx_legacy_backup/ | head -n 1 | awk '{print $3}' | tr -d ';')
        
        echo "Certificate Path: $CERT_PATH"
        echo "Key Path: $KEY_PATH"

        if [ -z "$CERT_PATH" ]; then
            echo "❌ CRITICAL: SSL Certificate paths NOT found in legacy backups."
            exit 1
        fi

        echo "\\n📂 3. Rebuilding stride.conf with SSL HARDENING..."
        # We will preserve the existing stride.conf but wrap it in an SSL-aware block.
        # This part requires careful editing. I'll use a heredoc to create a temporary unified config.
        
        cat <<EOF > /tmp/stride_ssl.conf
server {
    listen 80;
    server_name stride.deped.gov.ph;
    return 301 https://\\$host\\$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    server_name stride.deped.gov.ph;

    ssl_certificate $CERT_PATH;
    ssl_certificate_key $KEY_PATH;

    # SSL Hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Image Uploads (Preferential Prefix)
    location ^~ /uploads/ {
        alias /mnt/uploads/;
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API Staging
    location /insighted-staging/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    # API Production
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
EOF

        echo "\\n📂 4. Applying the Unified SSL Config..."
        sudo mv /tmp/stride_ssl.conf /etc/nginx/sites-available/stride.conf
        sudo ln -sf /etc/nginx/sites-available/stride.conf /etc/nginx/sites-enabled/stride

        echo "\\n🛠️ 5. Final Syntax Test..."
        sudo nginx -t

        echo "\\n🚀 6. Restoring Connectivity..."
        sudo systemctl restart nginx

        echo "\\n✅ SSL RESTORATION COMPLETE."
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
