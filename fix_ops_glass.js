const fs = require('fs');
let text = fs.readFileSync('components/dashboard/OperationsConsoleClient.tsx', 'utf8');
const lines = text.split('\n');

if (lines[152].includes('</div>')) lines[152] = lines[152].replace('</div>', '</GlassCard>');
if (lines[163].includes('</div>')) lines[163] = lines[163].replace('</div>', '</GlassCard>');
if (lines[186].includes('</div>')) lines[186] = lines[186].replace('</div>', '</GlassCard>');

fs.writeFileSync('components/dashboard/OperationsConsoleClient.tsx', lines.join('\n'));
