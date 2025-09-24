const fs = require('fs');
const path = require('path');

const logoPath = path.join(process.cwd(), 'public', 'logo.png');
if (!fs.existsSync(logoPath)) {
  throw new Error('public/logo.png not found. Put the correct logo at public/logo.png.');
}
const buf = fs.readFileSync(logoPath);
const base64 = buf.toString('base64');
const outDir = path.join(process.cwd(), 'lib');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'logo.data.ts');
const content = `export const LOGO_DATA_URI = "data:image/png;base64,${base64}";\n`;
fs.writeFileSync(outFile, content);
console.log('Generated lib/logo.data.ts');