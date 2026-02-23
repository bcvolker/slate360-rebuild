const fs = require('fs');
const path = './components/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '{/* ════════ TAB NAVIGATION BAR (hidden on overview — tiles serve as nav) ════════ */}';
const endMarker = '        {/* ════════ OVERVIEW TAB CONTENT ════════ */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newNav = `        {/* ════════ TAB NAVIGATION BAR ════════ */}
        {activeTab === "overview" && (
        <nav className="mb-6">
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {/* Overview / Home tab */}
            <button
              onClick={() => setActiveTab("overview")}
              className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap \${
                activeTab === "overview"
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
              }\`}
            >
              <Home size={14} />
              Dashboard
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Module tabs */}
            {visibleTabs
              .filter((t) => t.id !== "my-account" && !t.isCEOOnly)
              .map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === "slatedrop") { openSlateDrop(); return; }
                      setActiveTab(tab.id);
                    }}
                    className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap \${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                    }\`}
                  >
                    <TabIcon size={14} style={{ color: isActive ? tab.color : undefined }} />
                    {tab.label}
                  </button>
                );
              })}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* My Account tab */}
            <button
              onClick={() => setActiveTab("my-account")}
              className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap \${
                activeTab === "my-account"
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
              }\`}
            >
              <User size={14} />
              My Account
            </button>

            {/* CEO-only tabs */}
            {isCEO && visibleTabs
              .filter((t) => t.isCEOOnly)
              .map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap \${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                    }\`}
                  >
                    <TabIcon size={14} style={{ color: isActive ? tab.color : undefined }} />
                    {tab.label}
                  </button>
                );
              })}
          </div>
        </nav>
        )}

        {activeTab !== "overview" && (
          <div className="mb-6">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        )}

`;
  content = content.substring(0, startIndex) + newNav + content.substring(endIndex);
  fs.writeFileSync(path, content);
  console.log('Patched Tab Navigation');
} else {
  console.log('Markers not found');
}
