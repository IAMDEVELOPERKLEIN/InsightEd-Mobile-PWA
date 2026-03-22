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

    # 1. Staging Frontend SPA (Using Symlink + Root for path stability)
    location /insighted-staging {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /insighted-staging/index.html;
    }

    # 2. Staging Backend Proxy (Proxying /api to Port 5001)
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
    
    // Commands:
    // 1. Remove any existing conflicting folder/link
    // 2. Create the symbolic link
    // 3. Update the Nginx config
    // 4. Test and Reload
    const setupSymlink = `sudo rm -rf /var/www/html/insighted-staging && sudo ln -s /var/www/html/InsightEd-Staging/dist /var/www/html/insighted-staging`;
    const updateNginx = `printf '%s' "${newConfig.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')}" | sudo tee /etc/nginx/sites-available/insighted-staging > /dev/null`;
    const reloadNginx = `sudo nginx -t && sudo systemctl reload nginx`;

    const fullCmd = `${setupSymlink} && ${updateNginx} && ${reloadNginx}`;

    conn.exec(fullCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Command finished with exit code ${code}`);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect(config);
