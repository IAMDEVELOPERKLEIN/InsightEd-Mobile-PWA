const http = require('http');
const start = Date.now();
http.get('http://127.0.0.1:3000/api/projects', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Size:', (data.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('Time:', Date.now() - start, 'ms');
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
