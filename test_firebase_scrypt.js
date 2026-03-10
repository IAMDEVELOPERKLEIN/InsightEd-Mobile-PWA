import { FirebaseScrypt } from 'firebase-scrypt';

// ⚠️ INSTRUCTIONS ⚠️
// 1. Go to your Firebase Console
// 2. Select Authentication -> Users -> Click the 3 dots in the top right -> Export users
// 3. Or run: firebase auth:export users.json --format=json
// 4. Open the exported users.json file
// 5. Look at the VERY TOP of the file for the "hash_config" object.
// 6. Paste those 4 exact values into the variables below:

const hashConfig = {
    signerKey: "PASTE_SIGNER_KEY_HERE",
    saltSeparator: "PASTE_SALT_SEPARATOR_HERE",
    rounds: 8,      // Usually 8
    memCost: 14     // Usually 14
};

// 7. Find ANY user in that JSON list where you know their exact plaintext password.
//    Paste their exact password, their passwordHash, and their salt below:

const testUser = {
    knownPlaintextPassword: "TheirActualPassword123",
    firebaseHash: "THEIR_LONG_PASSWORD_HASH_STRING==",
    firebaseSalt: "THEIR_SHORT_SALT_STRING=="
};

async function testFirebaseScrypt() {
    console.log("Testing Firebase Scrypt Verification...");
    
    if (hashConfig.signerKey === "PASTE_SIGNER_KEY_HERE") {
        console.error("❌ ERROR: You must paste your project's signerKey at the top of this file!");
        process.exit(1);
    }

    try {
        const scrypt = new FirebaseScrypt({
            memCost: hashConfig.memCost,
            rounds: hashConfig.rounds,
            saltSeparator: hashConfig.saltSeparator,
            signerKey: hashConfig.signerKey
        });

        // The verify function takes (password, salt, hash)
        const isValid = await scrypt.verify(
            testUser.knownPlaintextPassword,
            testUser.firebaseSalt,
            testUser.firebaseHash
        );

        if (isValid) {
            console.log("✅ SUCCESS! The password verified correctly.");
            console.log("\nYou have the correct Hash Config parameters!");
            console.log("Please copy these exact hashConfig values into your .env file like this:");
            console.log(`
FIREBASE_HASH_SIGNER_KEY="${hashConfig.signerKey}"
FIREBASE_HASH_SALT_SEPARATOR="${hashConfig.saltSeparator}"
FIREBASE_HASH_ROUNDS=${hashConfig.rounds}
FIREBASE_HASH_MEM_COST=${hashConfig.memCost}
            `);
        } else {
            console.error("❌ FAILURE! The password did NOT verify.");
            console.error("Double check that you copied the correct hash, salt, and plaintext password for this specific user.");
        }

    } catch (err) {
        console.error("❌ CRASH ERROR:", err.message);
    }
}

testFirebaseScrypt();
