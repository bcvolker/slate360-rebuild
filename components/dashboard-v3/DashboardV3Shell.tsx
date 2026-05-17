import { DashboardV3Sidebar } from "./DashboardV3Sidebar";
import { DashboardV3Topbar } from "./DashboardV3Topbar";
import { DashboardV3AlertStrip } from "./DashboardV3AlertStrip";
import { DashboardV3Hero } from "./DashboardV3Hero";
import { DashboardV3ContinueWorkRail } from "./DashboardV3ContinueWorkRail";
import { DashboardV3ToolsLauncher } from "./DashboardV3ToolsLauncher";
import { DashboardV3MyWorkBrowser } from "./DashboardV3MyWorkBrowser";
import { DashboardV3CoordinationPanel } from "./DashboardV3CoordinationPanel";
import { DashboardV3ProcessingQueue } from "./DashboardV3ProcessingQueue";
import { DashboardV3StorageBilling } from "./DashboardV3StorageBilling";

export function DashboardV3Shell({ data }: { data: any }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F15] text-zinc-100 selection:bg-amber-500/30">
      <DashboardV3Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <DashboardV3Topbar roleName={data.roleName} />
        <DashboardV3AlertStrip alerts={data.alerts} />
        
        <main className="flex-1 overflow-y-auto p-7 scrollbar-hide">
          <div className="mx-auto max-w-[1480px] space-y-8 pb-12">
            <DashboardV3Hero project={data.latestProject} />
            <DashboardV3ContinueWorkRail projects={data.recentProjects || []} walks={data.recentWalks || []} />
            <DashboardV3ToolsLauncher />
            
            <div className="grid grid-cols-2 gap-6 min-h-[350px]">
              <DashboardV3MyWorkBrowser items={data.myWork || []} />
              <DashboardV3CoordinationPanel alerts={data.coordinationAlerts || []} />
            </div>
            
            <div className="grid grid-cols-2 gap-6 min-h-[280px]">
              <DashboardV3ProcessingQueue jobs={data.processingJobs || []} />
              <DashboardV3StorageBilling usage={data.usage} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
