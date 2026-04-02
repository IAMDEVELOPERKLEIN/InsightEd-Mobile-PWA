const { Client } = require('ssh2');
const conn = new Client();

console.log('🚀 Executing Nginx Consolidation: Building stride.conf...');

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');
    
    // The new unified configuration
    const strideConf = `
server {
    listen 80;
    server_name stride.deped.gov.ph;

    # 1. Unified Shared Uploads Storage
    location /uploads/ {
        alias /mnt/uploads/;
        autoindex off;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 2. Staging Environment (/insighted-staging)
    location /insighted-staging {
        alias /var/www/html/InsightEd-Staging/dist;
        index index.html;
        try_files $uri $uri/ /insighted-staging/index.html;
    }

    location /insighted-staging/api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 3. Production Environment (Root /)
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
        echo "💾 1. Creating stride.conf..."
        echo '${strideConf}' | sudo tee /etc/nginx/sites-available/stride.conf

        echo "\n🔗 2. Managing Symlinks..."
        sudo ln -sf /etc/nginx/sites-available/stride.conf /etc/nginx/sites-enabled/stride
        sudo rm -f /etc/nginx/sites-enabled/default
        sudo rm -f /etc/nginx/sites-enabled/insighted-staging

        echo "\n🛠️ 3. Testing Nginx Syntax..."
        sudo nginx -t

        echo "\n🚀 4. Performing Hard Restart..."
        sudo systemctl stop nginx
        sudo systemctl start nginx

        echo "\n✅ Nginx Consolidation Complete."
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
