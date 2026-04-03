/**
 * nginx_consolidation_deploy.cjs
 *
 * Deploys the consolidated stride.conf to the production VM.
 * Plan: Remove location ^~ /uploads/ static alias so that all /uploads/
 * requests fall through to Express (port 5000), which serves files from
 * $UPLOAD_DIR via express.static. Single source of truth in Express.
 *
 * Usage: node data_scripts/nginx_consolidation_deploy.cjs
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const CONF_PATH = path.join(__dirname, '..', 'deploy', 'nginx', 'stride.conf');
const newConf = fs.readFileSync(CONF_PATH, 'utf8');

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Connection Ready.');

    // Escape single quotes in conf content for shell echo
    const escaped = newConf.replace(/'/g, `'\\''`);

    const cmd = [
        // 1. Backup current config
        `echo "💾 1. Backing up current stride.conf..."`,
        `sudo cp /etc/nginx/sites-available/stride.conf /etc/nginx/sites-available/stride.conf.bak.$(date +%Y%m%d_%H%M%S)`,

        // 2. Write new config
        `echo "📝 2. Writing consolidated stride.conf..."`,
        `echo '${escaped}' | sudo tee /etc/nginx/sites-available/stride.conf > /dev/null`,

        // 3. Ensure symlink in sites-enabled
        `echo "🔗 3. Ensuring sites-enabled symlink..."`,
        `sudo ln -sf /etc/nginx/sites-available/stride.conf /etc/nginx/sites-enabled/stride.conf`,

        // 4. Validate
        `echo "🛠️ 4. Validating Nginx syntax..."`,
        `sudo nginx -t`,

        // 5. Reload
        `echo "🚀 5. Reloading Nginx..."`,
        `sudo systemctl reload nginx`,

        // 6. Smoke test
        `echo "🔍 6. Smoke test — checking /uploads/ routes through Express..."`,
        `SAMPLE=$(sudo ls -t /mnt/uploads/project_photos/ 2>/dev/null | head -n 1)`,
        `if [ -n "$SAMPLE" ]; then`,
        `  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/uploads/project_photos/$SAMPLE")`,
        `  echo "   /uploads/project_photos/$SAMPLE → HTTP $STATUS"`,
        `else`,
        `  echo "   ⚠️ No sample file found in /mnt/uploads/project_photos/"`,
        `fi`,

        `echo "✅ Consolidation complete. /uploads/ now routed through Express."`,
    ].join('\n');

    conn.exec(cmd, { pty: true }, (err, stream) => {
        if (err) throw err;
        stream
            .on('data', (data) => {
                process.stdout.write(data);
                if (data.toString().includes('[sudo] password')) {
                    stream.write(process.env.VM_SUDO_PASS + '\n');
                }
            })
            .on('close', (code) => {
                console.log(`\n🏁 Done (exit ${code})`);
                conn.end();
                process.exit(code);
            });
        stream.stderr.on('data', (data) => process.stderr.write(data));
    });
}).on('error', (err) => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
}).connect({
    host: process.env.VM_HOST || '20.24.58.49',
    port: 22,
    username: process.env.VM_USER || 'Administrator1',
    password: process.env.VM_PASS,
});
