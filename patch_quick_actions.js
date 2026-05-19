const fs = require('fs');
let code = fs.readFileSync('components/dashboard/command-center/CommandCenterContent.tsx', 'utf8');

code = code.replace(
  'import { MapPin, Plus, Search, Upload, Share2, Bell, MessageSquare, ClipboardList, Clock } from "lucide-react";',
  'import { MapPin, Plus, Search, Upload, Share2, Bell, MessageSquare, ClipboardList, Clock, Box, FolderOpen } from "lucide-react";'
);

const oldSection = `{/* ── Section 2: Quick Actions ── */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            label="New Worksite"
            icon={Plus}
            href="/site-walk/setup"
          />
          <QuickActionCard
            label="Search"
            icon={Search}
            onClick={handleSearch}
          />
          <QuickActionCard
            label="Upload Files"
            icon={Upload}
            href="/slatedrop"
          />
          <QuickActionCard
            label="Invite & Share"
            icon={Share2}
            onClick={() => openInviteShare(true)}
          />
        </div>
      </section>`;

const newSection = `{/* ── Section 2: Quick Actions ── */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            label="Create"
            icon={Plus}
            href={hasSiteWalk ? "/site-walk/setup" : "#"}
          />
          <QuickActionCard
            label="SlateDrop"
            icon={FolderOpen}
            href="/slatedrop"
          />
          <QuickActionCard
            label="Deliverables"
            icon={Box}
            href="/projects"
          />
          <QuickActionCard
            label="Search"
            icon={Search}
            onClick={handleSearch}
          />
        </div>
      </section>`;

code = code.replace(oldSection, newSection);

// Fix activity panel empty state for Open
code = code.replace(
  'Open\n        </Link>',
  'View Alerts\n        </Link>'
);

fs.writeFileSync('components/dashboard/command-center/CommandCenterContent.tsx', code);
console.log("Patched quick actions");
