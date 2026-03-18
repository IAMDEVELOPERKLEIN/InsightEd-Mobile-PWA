
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('--- Env Verification ---');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
console.log('FIREBASE_HASH_SIGNER_KEY:', process.env.FIREBASE_HASH_SIGNER_KEY ? 'PRESENT' : 'MISSING');
if (process.env.FIREBASE_HASH_SIGNER_KEY) {
    console.log('Value starts with:', process.env.FIREBASE_HASH_SIGNER_KEY.substring(0, 10));
}
console.log('FIREBASE_HASH_SALT_SEPARATOR:', process.env.FIREBASE_HASH_SALT_SEPARATOR ? 'PRESENT' : 'MISSING');
console.log('------------------------');
