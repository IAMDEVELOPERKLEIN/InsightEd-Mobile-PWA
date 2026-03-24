const { Client } = require('ssh2');
const fs = require('fs');

const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE'
};

const conn = new Client();

const STAGING_BLOCK = `
# --- STAGING FRONTEND ---
location /insighted-staging/assets/ {
    alias /var/www/html/InsightEd-Staging/dist/assets/;
    access_log off;
}

location /insighted-staging/ {
    alias /var/www/html/InsightEd-Staging/dist/;
    index index.html;
    try_files $uri $uri/ /insighted-staging/index.html;
}

# --- STAGING BACKEND ---
location /insighted-staging/api/ {
    proxy_pass http://localhost:5001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
`;

conn.on('ready', () => {
    console.log('CONNECTED');
    
    // 1. Read the current config
    conn.exec('cat /etc/nginx/sites-available/default', (err, stream) => {
        if (err) throw err;
        let content = '';
        stream.on('data', data => content += data.toString());
        stream.on('close', () => {
            // 2. Identify the staging blocks to replace
            // We want to replace everything from "# --- STAGING FRONTEND ---" to the end of the staging backend block
            // However, the existing block might be slightly different.
            // Let's use a regex to find the staging section or append it if not found.
            
            let updatedContent = content;
            const stagingRegex = /# --- STAGING FRONTEND ---[\s\S]*?location \/insighted-staging\/api\/ \{[\s\S]*?\}/;
            
            if (stagingRegex.test(content)) {
                console.log('Replacing existing staging blocks...');
                updatedContent = content.replace(stagingRegex, STAGING_BLOCK.trim());
            } else {
                console.log('Staging blocks not found with exact markers. Looking for /insighted-staging location blocks...');
                // Fallback: try to find any /insighted-staging blocks and replace them manually or append
                // Given the previous 'cat' output, the markers exist.
                updatedContent = content.replace(/location \/insighted-staging\s+\{[\s\S]*?\}/g, '');
                updatedContent = updatedContent.replace(/location \/insighted-staging\/api\/\s+\{[\s\S]*?\}/g, '');
                // Insert before the last closing brace of the server block
                const lastBraceIndex = updatedContent.lastIndexOf('}');
                updatedContent = updatedContent.substring(0, lastBraceIndex) + STAGING_BLOCK + updatedContent.substring(lastBraceIndex);
            }

            // 3. Write back the updated config
            const escapedContent = updatedContent.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
            const writeCmd = `printf '%s' "${escapedContent}" | sudo tee /etc/nginx/sites-available/default > /dev/null && sudo nginx -t && sudo systemctl reload nginx`;
            
            conn.exec(writeCmd, (err, writeStream) => {
                if (err) throw err;
                writeStream.on('close', code => {
                    console.log(`Update command exited with code ${code}`);
                    conn.end();
                }).on('data', data => process.stdout.write(data))
                  .stderr.on('data', data => process.stderr.write(data));
            });
        });
    });
}).connect(config);
