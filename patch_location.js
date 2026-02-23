const fs = require('fs');
const path = './components/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import
const importMarker = 'import MarketClient from "@/components/dashboard/MarketClient";';
const newImport = 'import MarketClient from "@/components/dashboard/MarketClient";\nimport LocationMap from "./LocationMap";';
content = content.replace(importMarker, newImport);

// 2. Add to available set
const availableMarker = '...(ent.canViewSlateDropWidget ? ["slatedrop"] : []),';
const newAvailable = '...(ent.canViewSlateDropWidget ? ["slatedrop"] : []),\n            "location",';
content = content.replace(availableMarker, newAvailable);

// 3. Add to renderWidget
const renderMarker = 'case "slatedrop": return (';
const newRender = `case "location": return (
                <div key={id} className={span}>
                  <LocationMap />
                </div>
              );
              case "slatedrop": return (`;
content = content.replace(renderMarker, newRender);

fs.writeFileSync(path, content);
console.log('Patched Location');
