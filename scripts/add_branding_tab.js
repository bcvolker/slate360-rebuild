const fs = require('fs');

let content = fs.readFileSync('components/settings/AccountSettingsClient.tsx', 'utf8');

// 1. Add "branding" to TabKey
content = content.replace('type TabKey = "profile" | "team" | "billing" | "security";', 'type TabKey = "profile" | "team" | "branding" | "billing" | "security";');

// 2. Add icon to TABS
content = content.replace('{ key: "billing", label: "Billing & Subscription", icon: CreditCard },', '{ key: "branding", label: "Organization Branding", icon: Palette },\n  { key: "billing", label: "Billing & Subscription", icon: CreditCard },');

// 3. Add Palette, UploadCloud, ImageIcon imports
content = content.replace('ArrowUpRight, CheckCircle2 } from "lucide-react";', 'ArrowUpRight, CheckCircle2, Palette, UploadCloud, Image as ImageIcon } from "lucide-react";');

// 4. Add Tab Render
content = content.replace('{activeTab === "billing" && <BillingPanel tier={tier} />}', '{activeTab === "branding" && <OrgBrandingPanel orgName={orgName} />}\n        {activeTab === "billing" && <BillingPanel tier={tier} />}');

// 5. Append OrgBrandingPanel function
const newPanel = `
function OrgBrandingPanel({ orgName }: { orgName: string | null }) {
  const [companyName, setCompanyName] = useState(orgName ?? "");
  const [supportEmail, setSupportEmail] = useState("");
  const [website, setWebsite] = useState("");

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PanelHeader icon={Palette} label="Branding" title="Organization Branding" />
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Company Logo</h3>
            <div className="border-2 border-dashed border-white/10 rounded-2xl bg-slate-950/40 p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer">
              <div className="p-3 bg-white/5 rounded-full mb-3">
                <UploadCloud className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-200">Upload Company Logo</p>
              <p className="text-xs text-slate-500 mt-1">Drag and drop or click to browse</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider font-black">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Company Details</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Company Name</label>
                <Input 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Construction"
                  className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-11 rounded-xl px-4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Support Email</label>
                <Input 
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="e.g. support@apex.com"
                  className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-11 rounded-xl px-4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Website</label>
                <Input 
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. apexconstruction.com"
                  className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-11 rounded-xl px-4"
                />
              </div>
            </div>
          </div>
          
          <Button className="rounded-2xl px-6 bg-slate-100 text-slate-900 hover:bg-white font-black mt-2">
            Save Branding
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-200 mb-4">Deliverable Preview</h3>
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-xl select-none">
             <div className="bg-white w-full aspect-[1/1.4] rounded-lg p-5 flex flex-col pt-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="w-full flex justify-between items-start mb-6">
                   <div className="flex flex-col gap-1">
                      <div className="w-24 h-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                         <ImageIcon className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="h-2 w-16 bg-slate-200 rounded mt-1"></div>
                   </div>
                   <div className="text-right flex flex-col gap-1 items-end">
                      <div className="h-4 w-32 bg-amber-500 rounded"></div>
                      <div className="h-2 w-20 bg-slate-200 rounded mt-1"></div>
                   </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                  <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                  <div className="h-2 w-full bg-slate-100 rounded mt-6"></div>
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                  <div className="h-2 w-5/6 bg-slate-100 rounded"></div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-10 bg-slate-50 flex items-center px-5 justify-between">
                   <div className="h-1.5 w-12 bg-slate-200 rounded"></div>
                   <div className="h-1.5 w-24 bg-slate-200 rounded"></div>
                </div>
             </div>
             <p className="text-center text-xs text-slate-400 mt-4">This logo will appear on all exported PDF reports and client-facing 360 Tours.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
`;

content += newPanel;
fs.writeFileSync('components/settings/AccountSettingsClient.tsx', content);

