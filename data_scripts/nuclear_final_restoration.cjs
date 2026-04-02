const { Client } = require('ssh2');
const conn = new Client();

console.log('☢️ Executing Nuclear Final Restoration: Claiming Total Authority...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // 1. Hardened Stride Configuration with default_server
    const atomicConf = `
server {
    listen 80 default_server;
    server_name stride.deped.gov.ph;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 1. Preferential Prefix: Unified Shared Uploads Storage
    location ^~ /uploads/ {
        alias /mnt/uploads/;
        autoindex off;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 2. Staging SPA Location Block
    location /insighted-staging {
        alias /var/www/html/InsightEd-Staging/dist/;
        index index.html;
        try_files $uri $uri/ /insighted-staging/index.html;
    }

    # 3. Staging API Proxy
    location /insighted-staging/api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 4. Production Environment (Catch-all)
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`.trim();

    const cmd = `
        echo "💾 1. Decoupling sites-available wildcard from nginx.conf..."
        sudo sed -i 'v/include \\/etc\\/nginx\\/sites-available\\/\\*;/d' /etc/nginx/nginx.conf 2>/dev/null || true
        # Alternative sed if the previous one fails
        sudo sed -i '/include.*sites-available/d' /etc/nginx/nginx.conf

        echo "💾 2. Installing Atomic Stride Configuration..."
        echo '${atomicConf}' | sudo tee /etc/nginx/sites-available/stride.conf
        sudo ln -sf /etc/nginx/sites-available/stride.conf /etc/nginx/sites-enabled/stride

        echo "🛠️ 3. Verifying Syntax..."
        sudo nginx -t

        echo "🚀 4. Final Nuclear Restart (Stop/Start)..."
        sudo systemctl stop nginx
        sudo systemctl start nginx

        echo "✅ RESTORATION COMPLETE."
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
