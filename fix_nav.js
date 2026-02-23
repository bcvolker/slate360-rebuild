const fs = require('fs');

let path = './components/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace activeTab === "overview" inside the nav block
content = content.replace(
  /activeTab === "overview"\n\s*\? "bg-white text-gray-900 shadow-sm border border-gray-200"\n\s*: "text-gray-500 hover:text-gray-700 hover:bg-white\/60"/g,
  '"bg-white text-gray-900 shadow-sm border border-gray-200"'
);

content = content.replace(
  /activeTab === "my-account"\n\s*\? "bg-white text-gray-900 shadow-sm border border-gray-200"\n\s*: "text-gray-500 hover:text-gray-700 hover:bg-white\/60"/g,
  '"text-gray-500 hover:text-gray-700 hover:bg-white/60"'
);

content = content.replace(
  /const isActive = activeTab === tab\.id;/g,
  'const isActive = false;'
);

fs.writeFileSync(path, content);
console.log('Fixed nav classes');
