
const fs = require('fs');
const code = fs.readFileSync('e:/InsightEd-Mobile-PWA/api/index.js', 'utf8');

try {
  new Function(code);
  console.log("✅ Syntax check passed for api/index.js");
} catch (err) {
  console.error("❌ Syntax error in api/index.js:");
  console.error(err.message);
  
  // Try to find the approximate line of the error
  const match = err.stack.match(/<anonymous>:(\d+):(\d+)/);
  if (match) {
    const line = parseInt(match[1]);
    const lines = code.split('\n');
    console.log(`Error near line ${line}:`);
    console.log(lines.slice(Math.max(0, line - 5), line + 5).join('\n'));
  }
}
