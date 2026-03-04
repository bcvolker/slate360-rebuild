const fs = require('fs');

let content = fs.readFileSync('components/dashboard/DashboardClient.tsx', 'utf-8');

// Replace new Date(session.lastActive).toLocaleDateString() with something safe or suppress it
// We can use a small 'useEffect' or just wrap suppression
// Next 15 has suppressHydrationWarning. Which DashboardClient doesn't directly use correctly on these inner text nodes unless wrapped.

content = content.replace(
  'new Date(session.lastActive).toLocaleDateString()',
  'isClient && session.lastActive ? new Date(session.lastActive).toLocaleDateString() : ""'
);

content = content.replace(
  'new Date(key.createdAt).toLocaleDateString()',
  'isClient && key.createdAt ? new Date(key.createdAt).toLocaleDateString() : ""'
);

content = content.replace(
  '{new Date(event.createdAt).toLocaleString()}',
  '{isClient && event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}'
);

content = content.replace(
  '{new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}',
  '{isClient ? new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}'
);

content = content.replace(
  '{calSelected ? new Date(calSelected + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "Upcoming events"}',
  '{isClient && calSelected ? new Date(calSelected + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "Upcoming events"}'
);

content = content.replace(
  'const [calMonth, setCalMonth] = useState(new Date().getMonth());',
  'const [calMonth, setCalMonth] = useState(0);'
);

content = content.replace(
  'const [calYear, setCalYear] = useState(new Date().getFullYear());',
  'const [calYear, setCalYear] = useState(2026);'
);

fs.writeFileSync('components/dashboard/DashboardClient.tsx', content);
console.log('Fixed dates.');
