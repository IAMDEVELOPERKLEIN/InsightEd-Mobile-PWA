const http = require('http');
http.get('http://localhost:3000/api/debug-projects', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const keys = Object.keys(json[0]).sort();
            console.log('--- TARGET KEYS ---');
            keys.forEach(k => {
                if (k.includes('status') || k.includes('action') || k === 'status') {
                    console.log(k);
                }
            });
        } catch (e) { console.log(e.message); }
    });
});
