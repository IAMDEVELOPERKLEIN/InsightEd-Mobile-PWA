import fs from 'fs';
import readline from 'readline';

async function extractHeader(path) {
    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    for await (const line of rl) {
        fs.writeFileSync('e:/InsightEd-Mobile-PWA/tmp_csv_header.json', JSON.stringify(line.split(','), null, 2));
        break;
    }
}

extractHeader('e:/InsightEd-Mobile-PWA/public/schools_with_IERN.csv');
