const { Client } = require('ssh2');

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

const newConfig = `server {
    listen 80;
    server_name stride.deped.gov.ph; # Or 20.24.58.49 if you don't have the domain yet

    # 1. Explicit Assets Block (Prevents 404/MIME errors)
    location /insighted-staging/assets/ {
        alias /var/www/html/InsightEd-Staging/dist/assets/;
        access_log off;
    }

    # 2. Staging Frontend SPA
    location /insighted-staging {
        alias /var/www/html/InsightEd-Staging/dist/;
        index index.html;
        try_files $uri $uri/ /insighted-staging/index.html;
    }

    # 3. Staging Backend Proxy (Proxying /api to Port 5001)
    location /insighted-staging/api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

const conn = new Client();

conn.on('ready', () => {
    console.log('CONNECTED');
    
    // We'll use printf and tee to escape quotes and handle sudo
    const cmd = `printf '%s' "${newConfig.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')}" | sudo tee /etc/nginx/sites-available/insighted-staging > /dev/null && sudo nginx -t && sudo systemctl reload nginx`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Command exited with code ${code}`);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect(config);
