const http = require('http');

http.get('http://localhost:3000/api/debug-projects', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.length > 0) {
                console.log('--- All Columns in engineer_form ---');
                Object.keys(json[0]).sort().forEach(key => console.log(key));
            } else {
                console.log('No records found');
            }
        } catch (e) {
            console.log('Error parsing JSON:', e.message);
        }
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
