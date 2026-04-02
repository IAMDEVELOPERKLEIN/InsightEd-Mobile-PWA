const { Client } = require('ssh2'); 
const conn = new Client(); 

console.log('🚀 Executing Broken Photo Link Remedy: Nginx Path Optimization...');

conn.on('ready', () => { 
    console.log('✅ SSH Connection Ready.');
    
    // We are going to back up the current config, explicitly add the universal uploads location block, test, and reload.
    const cmd = `
        echo "📂 1. Backing up Nginx Configuration..."
        sudo cp /etc/nginx/sites-available/stride.conf /etc/nginx/sites-available/stride.conf.link_backup

        echo "\\n📂 2. Updating Nginx routing for Sub-App Uploads..."
        
        # Check if we already applied this block to avoid duplicates
        if grep -q "insighted|insighted-staging|opdash" /etc/nginx/sites-available/stride.conf; then
            echo "⚠️ Universal block already exists. Skipping insertion."
        else
            # We will use awk to insert the new location block right after the existing uploads block.
            sudo awk '/location \\^~ \\/uploads\\/ \\{/ {print; f=1; next} f && /\\}/ {print; print "\\n    # Universal Sub-Path Uploads Catch-All"; print "    location ~* ^/(insighted|insighted-staging|opdash)/uploads/(.*)$ {"; print "        alias /mnt/uploads/$2;"; print "        include /etc/nginx/mime.types;"; print "        expires 30d;"; print "        add_header Cache-Control \\"public, no-transform\\";"; print "    }"; f=0; next} 1' /etc/nginx/sites-available/stride.conf > /tmp/stride.conf.new
            
            sudo mv /tmp/stride.conf.new /etc/nginx/sites-available/stride.conf
        fi

        echo "\\n🛠️ 3. Testing Nginx Configuration..."
        sudo nginx -t

        echo "\\n🚀 4. Reloading Nginx..."
        sudo systemctl reload nginx

        echo "\\n🧪 5. Testing Local HTTP Request directly on 127.0.0.1 (Internal):"
        SAMPLE_FILE=\\$(sudo ls -t /mnt/uploads/project_photos/ | head -n 1)
        if [ ! -z "\\$SAMPLE_FILE" ]; then
            echo "🧪 Requesting Sub-Portal prefixed image: https://stride.deped.gov.ph/insighted/uploads/project_photos/\\$SAMPLE_FILE"
            # Hitting the Nginx server directly with the Host header to verify the regex block triggers
            curl -Ikv -H "Host: stride.deped.gov.ph" "https://127.0.0.1/insighted/uploads/project_photos/\\$SAMPLE_FILE" 2>&1 | grep -iE "HTTP/|Content-Type|Content-Length"
        else
            echo "⚠️ No files found to test."
        fi

        echo "\\n✅ BROKEN PHOTO LINK REMEDY COMPLETE."
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
