# Slate360 — Revenue Roadmap

Last Updated: 2026-03-27
Financial Goal: $7,000/month recurring revenue

---

## The Goal In Numbers

### Platform Tier Revenue (Already Built and Billable Once Stripe Is Verified)

| Tier | Monthly Price | Subscribers To Hit $7k | Subscribers To Hit $3.5k |
|---|---|---|---|
| Creator | $79/mo | 89 | 45 |
| Model | $199/mo | 36 | 18 |
| Business | $499/mo | 15 | 8 |
| Mix (realistic) | — | See below | — |

**Realistic blended platform scenario:**
> 5 Business @ $499 + 10 Model @ $199 + 20 Creator @ $79
> = $2,495 + $1,990 + $1,580 = **$6,065/mo**

This is achievable from the SaaS platform alone with 35 subscribers.

### App Revenue (Tour Builder + PunchWalk)

**Current proposed prices: Tour Builder $25/mo, PunchWalk $19/mo.**

These are too low for construction software. The competitive landscape:
- Procore: $500–$1,000+/project/month
- BuilderTrend: $99–$499/month
- Fieldwire: $54/user/month
- Raken: $39/user/month

**Recommended revised pricing:**

| App | Current Proposed | Recommended | Why |
|---|---|---|---|
| Tour Builder | $25/mo | **$49/mo** | Architects and developers pay for visualization tools — this is still a fraction of what they spend on Matterport or similar |
| PunchWalk | $19/mo | **$39/mo** | Superintendents and GCs are accustomed to $30–$50/user/month for field tools |

At revised pricing:
- 143 Tour Builder subscribers @ $49/mo = $7,000
- 180 PunchWalk subscribers @ $39/mo = $7,002

**Blended scenario toward $7k (realistic first-year target — standalone only):**

| Revenue Source | Count | Price | Monthly |
|---|---|---|---|
| Business platform | 5 | $499/mo | $2,495 |
| Model platform | 8 | $199/mo | $1,592 |
| Creator platform | 15 | $79/mo | $1,185 |
| Tour Builder standalone | 25 | $49/mo | $1,225 |
| PunchWalk standalone | 15 | $39/mo | $585 |
| **Total** | **68 subscribers** | — | **$7,082/mo** |

**68 subscribers in the construction industry is very achievable.** One active GC who mentions it to their subs or at a trade association meeting is 5–10 referrals.

### Enterprise Tier — The Multiplier

The standalone subscriber math assumes individual users. The Enterprise tier changes the economics entirely — one contract replaces 3–10 standalone subscriptions.

**Enterprise pricing (Tour Builder):**

| Tier | Monthly | Annual | Seats | Storage |
|---|---|---|---|---|
| Tour Builder Standalone | $49/mo | $490/yr | 1 | 5 GB |
| Tour Builder Team | $149/mo | $1,490/yr | 5 | 25 GB |
| Tour Builder Enterprise | $499/mo | $4,990/yr | 25 | 100 GB |
| Capital Programs / Custom | Contact sales | — | Unlimited | Negotiated |

**Revised blended scenario with 3 Enterprise contracts:**

| Revenue Source | Count | Price | Monthly |
|---|---|---|---|
| Enterprise contracts | 3 | $499/mo | $1,497 |
| Team contracts | 5 | $149/mo | $745 |
| Business platform | 3 | $499/mo | $1,497 |
| Model platform | 5 | $199/mo | $995 |
| Tour Builder standalone | 15 | $49/mo | $735 |
| PunchWalk standalone | 10 | $39/mo | $390 |
| Creator platform | 10 | $79/mo | $790 |
| **Total** | **51 paying entities** | — | **$6,649/mo** |

**51 contracts including 8 enterprise/team deals** gets to $7k faster than 68 individual standalone subscribers. And enterprise contracts renew annually — reducing churn risk significantly.

**Key insight:** One capital program department, one realtor office, one GC company = up to $499/mo per deal. Direct outreach to these buyers (not app store discovery) is what closes enterprise. The Meeting Mode feature (synchronized 360 viewer for OAC meetings) is the specific hook for capital programs.

---

## Startup Pricing Reality — Pre-Revenue Phase

**The financial pressure is real: more going out than coming in. The plan below accounts for where you actually are, not where you wish to be.**

### The Hard Facts

- You cannot immediately charge $499/month if no one knows the product exists
- You cannot market at standard rates without a marketing budget
- The fastest cash comes from personal outreach, not SEO or ads
- The first 10–20 subscribers need a reason to take a risk on a new product
- "Beta" pricing is not a discount — it is a business tool to acquire proof-of-use

### Beta Pricing Strategy (First 20 Subscribers)

Lock in early adopters with a limited-time beta price:

| Product | Full Price | Beta Price | Term |
|---|---|---|---|
| Creator platform | $79/mo | $39/mo | First 6 months, then $79 |
| Tour Builder standalone | $49/mo | $24/mo | First 6 months, then $49 |
| PunchWalk standalone | $39/mo | $19/mo | First 6 months, then $39 |

**Beta rules:**
- Maximum 20 beta slots per product (artificial scarcity is real scarcity when you're 1 person)
- Beta subscribers get: early access, direct access to you for feature requests, credit toward future upgrades
- Use a simple Stripe coupon (`BETA50` = 50% off for 6 months) — no code required

**Beta revenue floor (if 20 beta Tour Builder subscribers month 1):**
> 20 × $24/mo = $480/mo immediately
> At month 7, those 20 roll over to $49/mo: $980/mo from the same 20 people

### Free Marketing Channels That Actually Work for Construction SaaS

You have no marketing budget. That's fine — the construction industry responds to direct outreach more than any other B2B market.

**Week 1 actions (zero dollars):**

1. **Post in one Facebook Group** — "Residential Construction Community" (~140k members) or AGC's LinkedIn group. Show a 30-second Loom video of a tour you built. One genuine post with a real demo gets clicks.
2. **Ask 3 GCs or architects you know** — not "want to buy?" but "would you try this free for 2 weeks and tell me what's wrong with it?" Real feedback creates real testimonials.
3. **List on Capterra / G2 / GetApp** — free to list, construction folks search these. Single-day setup.
4. **Local architecture / GC firms** — one cold email to 20 local firms per week. A 5% reply rate is 1 conversation. A 10% close rate from conversations is 1 subscriber. 20 emails/week × 52 weeks = 104 emails → potentially 5 new subscribers/year from zero budget.
5. **Google Maps integration (Phase 2)** — once Tour Builder can publish scenes to Google Street View, EVERY published tour becomes free marketing. A business that wants their property on Google Maps will find Slate360 through their Google Business Profile portal.

### Scope Reduction — What To Stop Building (Important for Financial Focus)

Building things that don't generate revenue is burning runway. Consider pausing or removing:

| Module | Status | Revenue Potential | Recommendation |
|---|---|---|---|
| Geospatial & Robotics tab | Scaffolded shell, no features | None in next 12 months | **Pause — hide the tab, don't build** |
| Virtual Studio tab | Scaffolded shell, no features | Unclear market | **Pause — hide the tab, don't build** |
| Athlete360 | Internal route, out of scope | None | **Remove the nav entry, archive the route** |
| Content Studio | Planned, not built | Medium-term | **Build after Tour Builder is live and paying** |
| Design Studio | Planned, not built | Long-term | **Do not build until platform has 30+ subscribers** |

**Rule of thumb:** If a module is not on the path to your first paying subscribers, don't touch it.

### Bridge to $7k Map

| Month | Milestone | Revenue |
|---|---|---|
| 1 | 5 beta subscribers (Tour Builder $24/mo) | $120/mo |
| 2 | Stripe verified, 10 beta subscribers, 2 platform Creator | $392/mo |
| 3 | Tour Builder live + embed feature, 20 beta subscribers, 5 Creator | $870/mo |
| 4 | PunchWalk beta launch, 20 Tour Builder + 10 PunchWalk beta | $670/mo |
| 5 | First non-beta subscribers start converting, platform growing | $1,400/mo |
| 6 | Beta cohort rolls to full price; referrals kicking in | $2,800/mo |
| 9 | App Store listing live, SEO starting; word-of-mouth | $4,500/mo |
| 12 | 68 subscribers blended portfolio | **$7,082/mo** |

This is aggressive but achievable if you start personal outreach in week 1.

---

## Do These Things Right Now (No Code Required)

These are configuration and admin steps. Do them today in parallel with development.

### 1. Apply for Apple Developer Program — TODAY

Without this, you cannot submit to the iOS App Store.

- URL: https://developer.apple.com/programs/enroll/
- Cost: $99/year
- Approval time: 2–5 business days (has improved recently, often 1–2 days)
- **If you wait until the code is done to apply, you lose a week.** Apply now.

### 2. Create Google Play Developer Account — TODAY

- URL: https://play.google.com/console
- Cost: $25 one-time fee
- Approval time: Within 24 hours usually
- **Apply now.** You can set up the app listing shell before code is done.

### 3. Set Stripe to Test Mode and Smoke-Test — HIGHEST PRIORITY CODE TASK

Before any new subscriber can pay, verify the existing Stripe integration works (it has NOT been tested end-to-end). This is Group C1 in MASTER_BUILD_SEQUENCE.md.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

If the webhook is broken, fix it immediately — everything else depends on this.

### 4. Raise App Pricing in Your Plan Before Building the Checkout

Before building the Tour Builder subscription checkout (Group E), update the prices in `app/plans/page.tsx` and in the Stripe products. It is much harder to raise prices after users are already subscribed.

**Set Tour Builder at $49/mo / $490/yr and PunchWalk at $39/mo / $390/yr before the first subscriber.**

### 5. Set Stripe Tax Collection Status

In Stripe Dashboard → Tax → Settings — enable automatic tax collection. This handles sales tax compliance as you scale to different states. Off by default, easy to enable, hard to fix retroactively.

---

## Fixing vs. Building: Realistic Time Estimates

The user is correct that fixing and refactoring existing code is harder and slower per prompt than building new features from a clean spec.

### Why Fixing Is Slower

- You must read the full file before making any change (large files = many read prompts before a single write)
- The change touches working code — a mistake breaks existing users
- The test suite for "did I break anything" is manual smoke-testing, which takes time between prompts
- Monolith files with shared state require understanding the whole before touching the part

### Realistic Prompt Rate Estimates

| Prompt Type | Example | Min Minutes | Max Minutes | Prompts/Day |
|---|---|---|---|---|
| Config/setup | Stripe product creation, env vars | 5–15 | 30 | 15–20 |
| Quick bug fix | BUG-019 widget extra click | 20–40 | 60 | 8–12 |
| Refactor (small file) | Extract a focused component | 30–60 | 90 | 5–8 |
| Refactor (monolith) | useDashboardState split | 60–120 | 180 | 3–5 |
| Refactor (complex) | LocationMap DrawingManager | 90–150 | 240 | 2–4 |
| Build (new module) | Tour Builder API routes | 15–30 | 45 | 10–15 |
| Build (UI component) | PunchWalk item form | 15–25 | 40 | 10–15 |
| Stabilization | get_errors + typecheck + wiring | 20–40 | 60 | 8–12 |

**The good news:** Group B (the big stabilization refactors) does NOT need to happen before Tour Builder or PunchWalk are live and generating revenue. Those are new modules that do not touch the monolith files.

---

## Revenue-First Build Order

**Defer all Group B (stabilization refactors) until after first revenue arrives.** They make the codebase healthier but do not block new features from being built and sold.

### Critical Path to First Revenue (Tour Builder)

| Step | Group | Est. Prompts | Est. Days | Revenue Impact |
|---|---|---|---|---|
| Stripe smoke test + fix if broken | C1 | 1–2 | 0.5 | **Unblocks all monetization** |
| BUG-018 DrawingManager migration | A1 | 3 | 1.0 | Prevents dashboard breaking in May 2026 |
| BUG-019 + BUG-001 quick fixes | A2, A3 | 2 | 0.5 | Cleans known bugs before building on top |
| Create Tour Builder + PunchWalk Stripe products | C2 | 0 (UI) | 0.5 | Required before checkout is built |
| org_feature_flags + entitlements | C3, C4, C5 | 3 | 1.0 | Enables app subscription gating |
| App landing pages + funnel | C6, C7 | 2 | 0.5 | New subscriber discovery starts here |
| Tour Builder MVP (dashboard tab) | D1–D8 | 8 | 1.0* | App is usable and has value |
| Tour Builder standalone + subscription | E1–E3 | 3 | 0.5 | **First subscriber possible from here** |
| **Total** | | **~23 prompts** | **~5.5 days** | **Tour Builder live and billable** |

*At 8+ building prompts/day — green field module, clear spec.

### Path From First Revenue to App Stores

| Step | Group | Est. Prompts | Est. Days |
|---|---|---|---|
| PunchWalk MVP + subscription | F1–F8, H1–H2 | 10 | 1.5 |
| PWA service worker + install | G1–G3 | 3 | 1.0 |
| Capacitor + iOS submission | I1–I5 | 5 | 2.0 (+ Apple review 1–5 days) |
| Android submission | I6 | 1 | 0.5 (+ Play review 1–3 days) |
| **Total from first revenue to both app stores** | | **~19 prompts** | **~5 days + store review** |

### Full Timeline (Aggressive but Realistic)

```
Week 1:
  Day 1: C1 (Stripe smoke test) + C2 (Stripe products in UI)
  Day 2: A1 (BUG-018 DrawingManager, 3 prompts)
  Day 3: A2 + A3 (quick bug fixes) + C3–C5 (entitlements)
  Day 4: C6–C7 (app pages) + D1–D4 (Tour Builder types, API, upload, shell)
  Day 5: D5–D8 (viewer, overlay, publish, stabilization)

Week 2:
  Day 6: E1–E3 (Tour Builder standalone + subscription = FIRST SUBSCRIBER POSSIBLE)
  Day 7: F1–F4 (PunchWalk types, API, shell, list)
  Day 8: F5–F8 (PunchWalk form, camera, resolve, stabilization)
  Day 9: H1–H2 (PunchWalk subscription) + G1 (PWA config)
  Day 10: G2–G3 (offline queue, install prompt)

Week 3:
  Day 11: I1–I2 (Capacitor iOS + Android setup)
  Day 12–13: I3–I4 (auth + camera in native shell)
  Day 14: I5 (iOS build → TestFlight → App Store submission)
  Day 15: I6 (Android → Google Play submission)
  + Apple review (1–5 business days)
  + Google Play review (1–3 days)

Target: Both apps in app stores within 4 weeks from start.
```

**This is achievable if every build prompt goes cleanly.** Assume +50% time buffer for debugging, resets, and surprises. Realistic: **6 weeks to both app stores.**

---

## Group B Refactors — When To Do Them

Do NOT block revenue on Group B. Here is the recommended order:

**Do before building NEW dashboard tabs (Design Studio, Content Studio):**
- B1 (useDashboardState split) — required before safely adding new dashboard state

**Do when LocationMap is next being touched anyway:**
- B8 (LocationMap extraction into sub-files) — only after A1 (DrawingManager) is done

**Do when Project Hub tool pages need new features:**
- B4, B5 (Project Hub page extractions) — do the specific page that needs work, not all 9 at once

**SlateDrop items can be deferred longest (it's working fine):**
- B6, B7 (SlateDropClient extraction) — do when you are adding SlateDrop features

**Priority:**
1. B2 (BUG-013, analytics snapshot) — quick, high user-visible value, 1 prompt
2. B1 (useDashboardState split) — before Design Studio build
3. B3 (DashboardWidgetRenderer) — after B1
4. B8 (LocationMap extraction) — after A1
5. B4–B5 (Project Hub pages) — when adding new PH features
6. B6–B7 (SlateDrop) — when adding SlateDrop features

---

## Agent Collaboration Protocol

Each AI agent has a different role. Use them in the right sequence to maximize output quality.

### Grok 4.2 — Research and UX Design

**Use Grok for:**
- Filling in Research Intake Templates in BUILD_GUIDEs (competitor research, UI patterns, user journey flows)
- Brainstorming feature requirements users in construction might need
- Drafting marketing copy for app landing pages and app store listings
- Reviewing the PunchWalk BUILD_GUIDE for field workflow gaps (does it match how superintendents actually work?)
- App Store description copy + keywords

**Do NOT use Grok for:**
- Executing code (it invents fictional APIs, ~20 TypeScript errors per prompt)
- Reviewing TypeScript types (it cannot verify against the actual codebase)

**Handoff format from Grok to Copilot:**
> "Grok researched [topic]. Here are the requirements it identified: [list]. Add these to the Research Intake Template in [BUILD_GUIDE]. Then implement prompt [X]."

### Gemini 3.1 — Visual Review and Gap Analysis

**Use Gemini for:**
- Reviewing screenshots or design mockups for visual consistency
- Checking if the app landing page designs are competitive and clear
- Gap analysis: "Given this BUILD_GUIDE, what might a user need that isn't covered?"
- Reviewing the app store screenshots plan

**Do NOT use Gemini for:**
- Writing or modifying any code files
- Running terminal commands (it has a history of truncating files)

**Handoff format from Gemini to Copilot:**
> "Gemini reviewed [design/guide]. Gaps identified: [list]. Please add these to [BUILD_GUIDE] section [X] before we start implementation."

### Copilot — All Code Execution

All implementation prompts go to Copilot (this agent):
- TypeScript types, Supabase migrations, API routes, React components
- Verification (get_errors, typecheck, file size check)
- Context doc updates after each prompt
- Git commits and pushes

### Document Refinement Workflow

Before executing any Group D–F prompt, run this refinement cycle:

```
1. USER: Review BUILD_GUIDE Research Intake Template
2. GROK:  "What would a [architect/superintendent] need that's missing?"
           → Add findings to Research Intake Template
3. GEMINI: "Review this implementation plan for UX gaps"
           → Add findings to Research Intake Template
4. USER:  Finalize the Research Intake Template
5. COPILOT: Execute Prompt 1 of BUILD sequence
```

This is the "one sitting" that produces a comprehensive result — all features needed for a professional deliverable mapped out before the first line of code is written.

---

## Subscription + App Store Monetization Steps

### Immediately (No Code — Do Now)

1. **Apple Developer**: Apply at developer.apple.com ($99/yr) → Takes 2–5 days to approve
2. **Google Play**: Create account at play.google.com/console ($25) → Approved within hours–1 day
3. **Stripe Tax**: Enable in Stripe Dashboard → Tax (prevents retroactive compliance issues)
4. **Pricing decision**: Confirm Tour Builder = $49/mo, PunchWalk = $39/mo before building checkout
5. **App Store screenshots plan**: Start collecting screenshots of the UI as you build each module — you'll need these for submission; capturing them live during build is faster than doing it all at the end

### Once Stripe Is Verified (Group C1 Done)

6. **Add Tour Builder + PunchWalk products** in Stripe Dashboard with the finalized prices
7. **Set up Stripe customer portal** (users manage their own billing) — already in the billing helpers, just needs the products linked

### Once Tour Builder Is Live (Groups D + E Done)

8. **Announce to beta list** — if you have any email list or LinkedIn network in construction, this is the moment for a "soft launch" post
9. **Set up a referral/affiliate structure** — construction networks are relationship-driven; even an informal "refer a GC and get 1 month free" doubles early growth
10. **App Store listing preparation**:
    - Write the App Store description (Grok can draft this)
    - Prepare 5–7 screenshots in required sizes (Capacitor phase I5)
    - Prepare a demo video walkthrough (screen record a complete tour creation → publish flow)

### Fastest App Store Strategy

**Reality:** Apple review for NEW apps takes 1–5 business days initially. Subsequent updates usually 24–48 hours.

**Strategy to shorten the cycle:**
- Submit the iOS app as late-in-the-day as possible on a Thursday (Friday reviews often go into Monday; earlier in the week is faster)
- Avoid submission in early January (post-holiday backlog)
- The "What we test" metadata field matters — be very specific about how to test your app
- For PunchWalk: include a sample project + test account credentials for reviewers to try the camera and punch item workflow — Apple rejects apps that crash during review, not apps that require setup

**Minimum viable App Store build:**
The app doesn't need to be perfectly refactored to be submitted. It needs to:
- Load without crashing
- Auth flow works
- Core feature works (create a tour, or walk a punch list)
- Camera permissions are declared in Info.plist
- Privacy policy URL is set (can be a simple `/privacy` page on slate360.ai)
- Support URL is set (`/support` or an email address)

---

## Revenue Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe webhook broken in production | Medium | High | Test WITH the live Stripe CLI before soft launch |
| App Store rejection on first submission | Medium | Medium | Read Apple guidelines before submission; have the test account ready for reviewers |
| Tour Builder has low early adoption | Medium | High | Seed with 5 beta users (free 30-day) before charging; get testimonials |
| PunchWalk not differentiated enough vs. simpler alternatives | Low | Medium | Emphasize the Slate360 platform integration — users get PunchWalk + Project Hub + SlateDrop |
| Pricing too high for solo contractors | Low | Medium | Annual pricing ($490/yr) makes Tour Builder feel more like a tool purchase than a subscription |
| App Store raises requirements mid-cycle | Low | Medium | Target the current minimum SDK requirements (iOS 16+, Android API 34) |

---

## The One-Sitting Goal

The user wants: "all in one sitting and have it saved in the corresponding tab or be able to go into slatedrop (where everything is saved and accessible for the user), and open a partially completed project to complete."

This is the most important UX requirement for both apps. It means:

**For Tour Builder:**
- Sessions auto-save. Closing and reopening returns to exactly where you were.
- Tour draft state persists in the database, not just in-memory.
- SlateDrop receives the published tour file for archival.
- A user can start a tour from a field laptop and finish it in the office.

**For PunchWalk:**
- Walk sessions persist. Close the app, reopen, and the active session is still there.
- Offline queue (Phase B) means bad cell signal doesn't lose work.
- The completed punch list is accessible in Project Hub AND can be exported to SlateDrop.
- A superintendent can start a walk, close the app, and a GC can open the same walk from their browser.

**This means:** The persistence layer (database schemas + draft-state API) must be designed in Prompt 1 of each module — not retrofitted. The BUILD_GUIDEs already specify this but make sure draft/autosave design is explicitly in the Research Intake Template before implementation.

---

## Key Links (Do Not Lose These)

- Apple Developer Program: https://developer.apple.com/programs/enroll/
- Google Play Console: https://play.google.com/console
- Stripe Dashboard: https://dashboard.stripe.com
- Supabase Dashboard: https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm
- Vercel Dashboard: https://vercel.com (check for function timeouts and environment variables)
- Slate360 live: https://www.slate360.ai
