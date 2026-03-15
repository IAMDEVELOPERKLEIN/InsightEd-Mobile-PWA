
import bcrypt from 'bcrypt';

const hash = '$2b$10$Tf8Mc9cUdxTQB9KcSE/3QeFXa35zCy7SKIN9VKf32dF8CvEyvrCRG';
const password = 'sebtest'; // The user mentioned 'sebtest' in previous conversation as the password that failed

async function testBcrypt() {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    console.log(`Match for 'sebtest': ${isMatch}`);
  } catch (err) {
    console.error(err);
  }
}

testBcrypt();
