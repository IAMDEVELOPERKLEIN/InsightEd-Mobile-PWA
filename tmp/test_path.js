import { fileURLToPath } from 'url';
import path from 'path';

const currentFile = fileURLToPath(import.meta.url);
const mainModule = process.argv[1];

console.log('Current File:', currentFile);
console.log('Main Module:', mainModule);
console.log('Resolved Current:', path.resolve(currentFile));
console.log('Resolved Main:', path.resolve(mainModule));
console.log('Match:', path.resolve(currentFile) === path.resolve(mainModule));
