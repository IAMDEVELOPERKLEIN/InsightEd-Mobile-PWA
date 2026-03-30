const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const storage = new Storage({
  projectId: 'insighted-drive-api',
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
});

storage.getBuckets().then(x => console.log(x[0].map(b => b.name))).catch(console.error);
