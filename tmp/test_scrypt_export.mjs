import * as fsScrypt from 'firebase-scrypt';
console.log("FirebaseScrypt named exports:", Object.keys(fsScrypt));
console.log("FirebaseScrypt default export:", fsScrypt.default ? typeof fsScrypt.default : 'none');

try {
  const { FirebaseScrypt } = fsScrypt;
  console.log("FirebaseScrypt from named:", typeof FirebaseScrypt);
} catch (e) {
  console.log("Error extracting FirebaseScrypt from named");
}
