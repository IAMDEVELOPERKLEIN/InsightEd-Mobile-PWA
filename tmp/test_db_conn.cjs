
const pg = require('pg');
const { Pool } = pg;
const https = require('https');

// Helper to get external IP
const getExternalIP = () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
};

const testConnection = async () => {
  const dbUrl = 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd';
  
  console.log("🔍 Starting Connectivity Test...");
  try {
    const ip = await getExternalIP();
    console.log(`📡 Your External IP is: ${ip}`);
    console.log(`   (Ensure this IP is whitelisted in Azure PostgreSQL Firewall)`);
  } catch (err) {
    console.warn("⚠️ Could not fetch external IP:", err.message);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  console.log("⚡ Attempting to connect to PostgreSQL...");
  const start = Date.now();
  try {
    const client = await pool.connect();
    const duration = Date.now() - start;
    console.log(`✅ SUCCESS! Connected in ${duration}ms`);
    
    const res = await client.query('SELECT version()');
    console.log(`📊 DB Version: ${res.rows[0].version}`);
    
    client.release();
    console.log("👋 Connection released.");
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`❌ CONNECTION FAILED after ${duration}ms`);
    console.error(`📝 Error Message: ${err.message}`);
    
    if (err.message.includes('timeout')) {
      console.log("\n💡 ANALYSIS: This is a TIMEOUT. Most likely causes:");
      console.log("1. Your IP is not whitelisted in Azure Firewall.");
      console.log("2. The database server is stopped or sleeping.");
      console.log("3. Your internet connection is blocking port 5432.");
    } else if (err.message.includes('password authentication failed')) {
      console.log("\n💡 ANALYSIS: Credentials in .env might be incorrect.");
    }
  } finally {
    await pool.end();
  }
};

testConnection();
