import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function testDrive() {
    try {
        const credentialsObj = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: credentialsObj.client_email,
                private_key: credentialsObj.private_key,
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            clientOptions: {
                subject: 'support.stride@deped.gov.ph'
            }
        });

        const drive = google.drive({ version: 'v3', auth });
        
        // Try to get a tiny list of files to check auth
        const res = await drive.files.list({ pageSize: 1 });
        console.log("Success! Subject impersonation worked.");
    } catch (err) {
        console.error("Auth test failed:", err.message);
    }
}

testDrive();
