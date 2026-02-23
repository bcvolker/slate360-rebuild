const fs = require('fs');
const path = './components/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add slateDropFiles state
const stateMarker = 'const [dashboardSummary, setDashboardSummary] = useState<{ recentFiles: any[]; storageUsed: number } | null>(null);';
const newState = `const [dashboardSummary, setDashboardSummary] = useState<{ recentFiles: any[]; storageUsed: number } | null>(null);
  const [slateDropFiles, setSlateDropFiles] = useState<any[]>([]);`;
content = content.replace(stateMarker, newState);

// 2. Add fetch for slateDropFiles and accountOverview in useEffect
const fetchMarker = `    // Fetch dashboard summary
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setDashboardSummary(data);
      })
      .catch(console.error);`;
const newFetch = `    // Fetch dashboard summary
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setDashboardSummary(data);
      })
      .catch(console.error);

    // Fetch SlateDrop files
    fetch("/api/slatedrop/files?folderId=general")
      .then((res) => res.json())
      .then((data) => {
        if (data.files) setSlateDropFiles(data.files);
      })
      .catch(console.error);

    // Fetch account overview for quotas
    fetch("/api/account/overview")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setAccountOverview(data);
      })
      .catch(console.error);`;
content = content.replace(fetchMarker, newFetch);

// 3. Replace creditsUsed
const creditsMarker = 'const creditsUsed = 1847;';
const newCredits = 'const creditsUsed = accountOverview?.billing?.purchasedCredits ?? 0;';
content = content.replace(creditsMarker, newCredits);

// 4. Replace SlateDrop widget rendering
const slateDropWidgetMarker = `{dashboardSummary?.recentFiles && dashboardSummary.recentFiles.length > 0 ? (
                  dashboardSummary.recentFiles.slice(0, 3).map((file, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="text-[11px] text-gray-700 truncate flex-1">{file.file_name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-gray-400">No recent files</div>
                )}`;
const newSlateDropWidget = `{slateDropFiles && slateDropFiles.length > 0 ? (
                  slateDropFiles.slice(0, 3).map((file, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="text-[11px] text-gray-700 truncate flex-1">{file.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-gray-400">No recent files</div>
                )}`;
content = content.replace(slateDropWidgetMarker, newSlateDropWidget);

fs.writeFileSync(path, content);
console.log('Patched Widgets');
