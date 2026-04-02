const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing OpDash & Root Portal Restoration: Re-integrating legacy paths...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Backing up current stride.conf..."
        sudo cp /etc/nginx/sites-available/stride.conf /tmp/stride_before_opdash_align.bak

        echo "\\n📂 2. Rebuilding stride.conf with OpDash and Root Portal logic..."
        cat <<EOF > /tmp/stride_opdash_align.conf
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

    # Root Portal Landing Page (replaces the 'healthy' intercept)
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files \\$uri \\$uri/ /index.html;
    }

    # Image Uploads
    location ^~ /uploads/ {
        alias /mnt/uploads/;
        include /etc/nginx/mime.types;
        default_type application/octet-stream;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # OpDash Frontend
    location /opdash/ {
        alias /var/www/html/opdash/;
        try_files \\$uri \\$uri/ /opdash/index.html;
    }

    # OpDash API
    location /opdash/api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    # Staging Frontend
    location /insighted-staging/ {
        alias /var/www/html/InsightEd-Staging/dist/;
        try_files \\$uri \\$uri/ /insighted-staging/index.html;
    }

    # Staging API
    location /insighted-staging/api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }

    # Production Frontend (insighted)
    location /insighted/ {
        alias /var/www/html/InsightEd-Mobile-PWA/dist/;
        try_files \\$uri \\$uri/ /insighted/index.html;
    }

    # Production API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
EOF

        echo "\\n📂 3. Applying the Re-Integrated Config..."
        sudo mv /tmp/stride_opdash_align.conf /etc/nginx/sites-available/stride.conf
        
        echo "\\n🛠️ 4. Final Syntax Test..."
        sudo nginx -t

        echo "\\n🚀 5. Site Reactivation..."
        sudo systemctl restart nginx

        echo "\\n✅ OPDASH & ROOT PORTAL RESTORATION COMPLETE."
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
