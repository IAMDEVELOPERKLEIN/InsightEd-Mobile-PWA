import { fileURLToPath } from 'url';
import path from 'path';

const executedFile = process.argv[1] || '';
const currentFile = fileURLToPath(import.meta.url);

console.log("EXECUTED FILE:", executedFile);
console.log("CURRENT FILE:", currentFile);
console.log("IS MAIN:", path.resolve(executedFile).toLowerCase() === path.resolve(currentFile).toLowerCase());
console.log("PROCESS.ENV.PORT:", process.env.PORT);
