#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function check(name, pass, detail) {
  const status = pass ? "PASS" : "FAIL";
  console.log(`${status} | ${name} | ${detail}`);
  return pass;
}

const results = [];

const locationMap = read("components/dashboard/LocationMap.tsx");
const dashboardClient = read("components/dashboard/DashboardClient.tsx");
const projectHubPage = read("app/(dashboard)/project-hub/page.tsx");
const projectGrid = read("components/project-hub/ProjectDashboardGrid.tsx");

results.push(
  check(
    "Shared LocationMap import in Dashboard",
    dashboardClient.includes('import LocationMap from "./LocationMap"'),
    "Dashboard uses shared LocationMap"
  )
);

results.push(
  check(
    "Shared LocationMap import in Project Hub",
    projectHubPage.includes('import LocationMap from "@/components/dashboard/LocationMap"'),
    "Project Hub uses shared LocationMap"
  )
);

results.push(
  check(
    "Shared LocationMap import in Project Grid",
    projectGrid.includes('import LocationMap from "@/components/dashboard/LocationMap"'),
    "Project-level hub grid uses shared LocationMap"
  )
);

results.push(
  check(
    "Satellite default enabled",
    locationMap.includes("const [isThreeD, setIsThreeD] = useState(true);"),
    "LocationMap default mode is satellite"
  )
);

results.push(
  check(
    "Expanded map-first controls behavior",
    locationMap.includes("const showToolbar = isModal;") && locationMap.includes("condensed={true}"),
    "Controls are hidden in compact mode and exposed in expanded mode"
  )
);

results.push(
  check(
    "Expanded controls panel cap",
    locationMap.includes('overflow-visible'),
    "Controls panel constrained to preserve map space"
  )
);

results.push(
  check(
    "Compact diagnostics toggle available",
    locationMap.includes('widgetDiag') && locationMap.includes('[widget-diag][location]'),
    "Runtime diagnostics instrumentation present"
  )
);

results.push(
  check(
    "Project widgets uniform by default",
    projectGrid.includes("compact={!isExpanded}") && projectGrid.includes("expanded={isExpanded}"),
    "Project grid binds LocationMap compact/expanded state to widget size"
  )
);

const failed = results.filter((r) => !r).length;
console.log("---");
console.log(`Summary: ${results.length - failed}/${results.length} checks passed`);
if (failed > 0) process.exit(1);
