const http = require('http');

http.get('http://localhost:3000/api/reports/insights?region=V', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data.substring(0, 500) + '...');
    });
}).on('error', err => {
    console.error('Error:', err.message);
});
