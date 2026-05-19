const fs = require('fs');
let code = fs.readFileSync('components/site-walk/v1/SiteWalkV1BottomNav.tsx', 'utf8');

// Update to match Slate360 style
code = code.replace(
  '    <nav className="flex h-14 items-stretch border-t border-white/10 bg-zinc-900/90 backdrop-blur-sm lg:hidden">',
  `    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden rounded-t-3xl border-t border-white/10 bg-[#0B0F15]/88 shadow-lg backdrop-blur-md flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingTop: "4px" }}
    >
      <ul className="flex min-h-[70px] flex-1 items-stretch justify-around px-2 w-full">`
);

// We need to replace the mapping inside
// Current:
/*
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              active
                ? "text-amber-500"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Icon className="size-5" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
*/

code = code.replace(
  /\{tabs\.map\(\(\{ id, label, icon: Icon \}\) => \{[\s\S]*?\}\)\}\n\s*<\/nav>/m,
  `{tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <li key={id} className="flex-1">
          <button
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "relative flex flex-col items-center justify-center h-full w-full gap-1 py-2 transition-colors duration-200 rounded-lg mx-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
              active
                ? "bg-amber-500/10 text-amber-500"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.45)]"
              />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 2}
              className={cn("transition-transform", active && "-translate-y-0.5")}
            />
            <span className={cn("text-[10px] font-medium leading-none truncate", active && "font-semibold")}>
              {label}
            </span>
          </button>
          </li>
        );
      })}
      </ul>
    </nav>`
);

fs.writeFileSync('components/site-walk/v1/SiteWalkV1BottomNav.tsx', code);
console.log("Patched SiteWalkV1BottomNav");
