
const http = require('http');

const data = JSON.stringify({
    status: 'Not yet procured',
    procurement_status: 'Not yet procured',
    otherRemarks: 'Lacking Buildability Requirements: Incomplete Detailed Engineering Design (DED) or Program of Works (POW); Site Ownership Issues: No Deed of Donation, missing Transfer Certificate of Title (TCT), or ongoing land disputes; Lacking Administrative Requirements: No Multi-Year Obligational Authority (MYOA) or pending board approval; Procurement Failure: Two failed biddings or no interested bidders; Budgetary Realigning: Project funds being reallocated for other priorities; Peace and Order Situation: Security risks in the project site location',
    accomplishmentPercentage: 0,
    uid: 'test-uid',
    modifiedBy: 'Tester'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/update-project/1',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
