const http = require('http');

http.get('http://localhost:3000/api/reports/insights/master?region=V', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const parsed = JSON.parse(data);
            console.log('Success:', parsed.success);
            console.log('Jurisdiction:', parsed.jurisdiction);
            console.log('Data count:', parsed.data ? parsed.data.length : 0);
            if (parsed.data && parsed.data.length > 0) {
                console.log('Sample Data (First item):', Object.keys(parsed.data[0]));
            }
        } catch (e) {
            console.log('Error parsing response JSON:', e.message);
            console.log('Raw output:', data.substring(0, 500));
        }
    });
}).on('error', err => {
    console.error('Error:', err.message);
});
