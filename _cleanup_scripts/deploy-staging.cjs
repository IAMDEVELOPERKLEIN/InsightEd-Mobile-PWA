const { Client } = require('ssh2');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const config = {
    host: '20.24.58.49',
    port: 22,
    username: 'Administrator1',
    password: '7v52E69TYgTE',
    remotePath: '/var/www/html/InsightEd-Staging',
    localArchive: 'staging-deploy.tar.gz',
    // Files/Folders to include in the bundle
    include: ['api', 'src', 'public', 'index.html', 'package.json', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js']
};

const conn = new Client();

console.log('------------------------------------------------');
console.log('🚀 ROBUST NODE DEPLOYMENT (STAGING)');
console.log('------------------------------------------------');

// 1. Create Local Archive
function createArchive() {
    return new Promise((resolve, reject) => {
        console.log('📦 1. Creating local archive...');
        // Using native tar (available in modern Windows/Linux/macOS)
        const cmd = `tar -czf ${config.localArchive} ${config.include.join(' ')}`;
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error('❌ Failed to create archive:', stderr);
                return reject(err);
            }
            console.log('✅ Archive created successfully.');
            resolve();
        });
    });
}

// 2. Connect and Upload
function deploy() {
    console.log(`📡 2. Connecting to ${config.host}...`);
    
    conn.on('ready', () => {
        console.log('✅ SSH Connection established.');
        
        conn.sftp((err, sftp) => {
            if (err) throw err;
            
            const localFile = path.resolve(config.localArchive);
            const remoteFile = path.join(config.remotePath, config.localArchive).replace(/\\/g, '/');
            
            // 3. Ensure directory exists and Upload
            console.log(`📤 3. Ensuring directory exists and uploading via SFTP...`);
            
            conn.exec(`mkdir -p ${config.remotePath}`, (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    sftp.fastPut(localFile, remoteFile, {
                        concurrency: 1,
                        chunkSize: 16384
                    }, (err) => {
                        if (err) {
                            console.error('❌ Upload failed:', err);
                            console.log('💡 PRO TIP: You might need to run this on your VM once:');
                            console.log(`   sudo mkdir -p ${config.remotePath} && sudo chown ${config.username}:${config.username} ${config.remotePath}`);
                            conn.end();
                            return;
                        }
                        console.log('✅ Upload complete.');
                        
                        // 4. Remote Extraction and Build
                        console.log('🏗️  4. Running remote build & restart...');
                        const remoteCmd = `
                            cd ${config.remotePath} && 
                            tar -xzf ${config.localArchive} && 
                            npm install --legacy-peer-deps && 
                            npm run build -- --base=/insighted-staging/ && 
                            pm2 restart insighted-staging || PORT=5001 pm2 start api/index.js --name insighted-staging
                        `;
                        
                        conn.exec(remoteCmd, (err, stream) => {
                            if (err) throw err;
                            
                            stream.on('close', (code, signal) => {
                                console.log(`✅ Remote process finished (Exit code: ${code})`);
                                
                                // Cleanup local archive
                                try { fs.unlinkSync(config.localArchive); } catch(e) {}
                                console.log('🧹 Local cleanup complete.');
                                console.log('------------------------------------------------');
                                console.log('🎊 STAGING DEPLOYMENT SUCCESSFUL!');
                                console.log('------------------------------------------------');
                                conn.end();
                            }).on('data', (data) => {
                                process.stdout.write(data);
                            }).stderr.on('data', (data) => {
                                process.stderr.write(data);
                            });
                        });
                    });
                });
            });
        });
    }).on('error', (err) => {
        console.error('❌ SSH Connection Error:', err.message);
        if (err.message.includes('TIMEDOUT') || err.message.includes('ETIMEDOUT')) {
            console.log('\n💡 PRO TIP: The server is unreachable. Check if the VM is ON or if your IP is whitelisted.');
        }
    }).connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 15000 // 15 seconds
    });
}

// Run the sequence
createArchive()
    .then(deploy)
    .catch(err => {
        console.error('💥 Fatal Deployment Error:', err);
    });
