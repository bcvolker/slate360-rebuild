const fs = require('fs');
const path = './app/api/market/polymarket/route.ts';
let content = fs.readFileSync(path, 'utf8');

const oldLogic = `  if (forwardParams.has("_q")) {
    forwardParams.delete("_q");
    forwardParams.set("limit", "500");
  }`;
const newLogic = `  // Always fetch a large limit so client-side filtering works well
  forwardParams.set("limit", "500");`;
content = content.replace(oldLogic, newLogic);

fs.writeFileSync(path, content);
console.log('Patched Polymarket');
