
import http from 'http';

const data = JSON.stringify({
    status: 'Not yet procured',
    procurement_status: 'Not yet procured',
    otherRemarks: 'Testing checkbox multi-select reasons (VERIFICATION)',
    accomplishmentPercentage: 50,
    uid: 'test-uid',
    modifiedBy: 'Tester'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/update-project/424',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

console.log('Sending PUT request to /api/update-project/424...');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let responseData = '';
    res.on('data', (d) => {
        responseData += d;
    });
    res.on('end', () => {
        console.log('Response:', responseData);
    });
});

req.on('error', (error) => {
    console.error('Error:', error.message);
});

req.write(data);
req.end();
