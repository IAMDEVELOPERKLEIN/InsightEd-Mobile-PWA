const fs = require('fs');

try {
  const usersData = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  const config = usersData.users[0]?.hash_config || usersData.hash_config; // Handle variations in export structure
  
  if (!config) {
     console.error("Could not find hash_config in users.json. Please ensure it's not nested deeply or missing.");
     return;
  }

  const envLines = [
    '',
    '# Firebase Scrypt Parameters (Extracted from users.json)',
    `FIREBASE_HASH_SIGNER_KEY="${config.signer_key || config.signerKey}"`,
    `FIREBASE_HASH_SALT_SEPARATOR="${config.salt_separator || config.saltSeparator}"`,
    `FIREBASE_HASH_ROUNDS=${config.rounds}`,
    `FIREBASE_HASH_MEM_COST=${config.mem_cost || config.memCost}`
  ];

  fs.appendFileSync('.env', envLines.join('\\n'));
  console.log("Successfully extracted Firebase Hash Config and appended to .env!");

} catch (err) {
  console.error("Error extracting hash config:", err);
}
