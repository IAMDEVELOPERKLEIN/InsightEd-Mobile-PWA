const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🚀 Executing Upload API Restoration: Nginx Sub-Portal Proxying...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    const cmd = `
        echo "📂 1. Backing up Nginx Configuration..."
        sudo cp /etc/nginx/sites-available/stride.conf /etc/nginx/sites-available/stride.conf.api_backup

        echo "\\n📂 2. Updating Nginx routing for Sub-App APIs..."
        
        # Check if we already applied this block
        if grep -q "location /insighted-staging/api/" /etc/nginx/sites-available/stride.conf; then
            echo "⚠️ API proxy blocks already exist. Skipping insertion."
        else
            # We will use awk to insert the new location blocks right before the first alias block
            # Actually, replacing using awk dynamically might be tricky if not precise. Let's use a robust awk insertion.
            sudo awk '/^server \\{/ {
                print; 
                f=1; 
                next
            } 
            f && /location \\/insighted-staging\\// {
                print "    # --- Dedicated API Bridges ---\n    location /insighted-staging/api/ {\n        proxy_pass http://localhost:5001/api/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \\$http_upgrade;\n        proxy_set_header Connection \\"upgrade\\";\n        proxy_set_header Host \\$host;\n        proxy_set_header X-Forwarded-Proto \\$scheme;\n        client_max_body_size 100M;\n    }\n\n    location /insighted/api/ {\n        proxy_pass http://localhost:5000/api/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \\$http_upgrade;\n        proxy_set_header Connection \\"upgrade\\";\n        proxy_set_header Host \\$host;\n        proxy_set_header X-Forwarded-Proto \\$scheme;\n        client_max_body_size 100M;\n    }\n"
                print;
                f=0;
                next
            } 
            1' /etc/nginx/sites-available/stride.conf > /tmp/stride.conf.api_new
            
            sudo mv /tmp/stride.conf.api_new /etc/nginx/sites-available/stride.conf
        fi

        echo "\\n🛠️ 3. Testing Nginx Configuration..."
        sudo nginx -t

        echo "\\n🚀 4. Reloading Nginx..."
        sudo systemctl reload nginx

        echo "\\n🧪 5. Testing Sub-Portal API proxy (Should return 400 or 404 from Node, not Nginx 404):"
        curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/insighted/api/upload-image" 2>&1 | grep -iE "HTTP/" || echo "No response"

        echo "\\n✅ UPLOAD API RESTORATION COMPLETE."
    `.trim();

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
