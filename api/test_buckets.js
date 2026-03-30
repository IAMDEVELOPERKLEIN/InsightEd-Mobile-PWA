import admin from 'firebase-admin';

let credsStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
// If dotenv already replaced \n with actual newlines, we need to escape them back for JSON.parse
credsStr = credsStr.replace(/\n/g, '\\n');
const creds = JSON.parse(credsStr);

admin.initializeApp({
  credential: admin.credential.cert(creds)
});

async function listBuckets() {
  try {
    const [buckets] = await admin.storage().bucket().storage.getBuckets();
    console.log(buckets.map(b => b.name));
  } catch (error) {
    console.error('Error listing buckets:', error);
  }
}

listBuckets();
