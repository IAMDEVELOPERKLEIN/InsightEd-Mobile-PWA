import fs from 'fs';
import readline from 'readline';

async function getFirstLine(path) {
    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    for await (const line of rl) {
        console.log(line);
        break;
    }
}

getFirstLine('e:/InsightEd-Mobile-PWA/public/schools_with_IERN.csv');
