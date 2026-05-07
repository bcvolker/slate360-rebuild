# Site Walk Build File

Last Updated: 2025-05-18

## Conceptual Architecture
- Site Walk is an app module within the Slate360 shell.
- It requires the `site_walk` app entitlement (standard or pro) to unlock.
- The Slate360 platform is a unified web and PWA-installable product.
- Site Walk acts as the first live, sellable application on the platform.

## Current System State
- The `basic` and `pro` tiers need to be refactored to `standard` and `pro` respectively.
- The entitlement model relies heavily on old whole-org tiers.
- Site Walk routes should be correctly guarded behind an active `site_walk` modular entitlement.
- The Slate360 project tools unlock when an organization possesses at least one active module.

## Required Implementations
1. **Tier Renaming**: Migrate code from `basic` to `standard` for all Site Walk entitlements.
2. **Access Guards**: Ensure routes like `/app/site-walk/...` are guarded by valid `site_walk` entitlements.
3. **Purchasing & Provisioning**: Enable complete and error-free checkout for Site Walk on Stripe, handling both standard and pro plans smoothly. Ensure webhooks correctly activate `site_walk` in the organization's subscription.
4. **Visibility Checks**: Enforce Site Walk as the primary accessible module, keeping other modules in a "Coming Soon" or conditionally locked state without active subscriptions.




Site Walk must deliver strong standalone value for a user who only subscribes to Site Walk, while still becoming much more powerful when bundled with other Slate360 apps. That means Site Walk cannot feel incomplete on its own, but it also cannot absorb the premium functions that should belong to 360 Tour Builder, Project Hub, Design Studio, or the other apps. That “standalone strong, bundle stronger” rule should guide the entire product architecture.

Site Walk — organized product foundation for development
1. What Site Walk is in the Slate360 ecosystem

Site Walk should be the mobile-first field documentation, issue capture, punch, inspection, progress reporting, and deliverables app inside Slate360.

Its job is to help users:

walk a site
document issues and progress
create punch lists
create field reports
create branded proposals and digital deliverables
communicate findings quickly to the office, owners, consultants, subs, and clients
organize field data spatially through plans, locations, and linked media
turn field observations into polished outputs

It should be the app that connects:

what was seen in the field → what needs to happen next → how it gets communicated

That gives it a very clear identity.

2. The most important product rule

This is the main rule I would use for the entire app:

Site Walk must be complete and valuable on its own, but expandable through bundles.

That means:

A Site Walk-only customer must still be able to:
create punch lists
perform inspections
take photos and videos
mark up images
pin issues on plans
use voice-to-text notes
assign items
track status
generate branded PDF reports
generate branded proposals
send digital deliverables by link, text, or email
share issue-specific views with mobile-friendly links
organize findings by room, level, trade, or category
But a Site Walk + 360 Tour Builder customer should additionally be able to:
insert navigable 360 photos into Site Walk deliverables
link findings to immersive 360 views
pin issues directly inside 360 scenes
send a link where the recipient can open a finding and then navigate the 360 context
use richer immersive deliverables without leaving the Slate360 ecosystem

That is the right kind of synergy.

3. What Site Walk should own vs what other apps should own

This is how you avoid cannibalization.

Site Walk should own:
field walks
site observations
punch lists
inspections
QA/QC findings
safety observations
field notes
progress photos
photo markup
plan-based issue pinning
branded reports
branded proposals
digital handoff packages
share links for findings and reports
mobile-first issue capture and communication
360 Tour Builder should own:
immersive 360 hosting
full 360 tour creation
360 scene linking
immersive navigation
advanced hotspot authoring
360-based storytelling and presentation
public/private immersive tours
persistent hosted 360 environments
Project Hub should own:
broader project management
schedules
RFIs
submittals
daily logs
owner records
cross-project management
central recordkeeping
Design Studio / BIM should own:
model-based workflows
BIM coordination
element-linked issue context
advanced model review
Reports & Analytics should own:
trend tracking
dashboards
performance analytics
executive reporting
trade and issue pattern intelligence

So:

Site Walk owns the field issue record and field communication.
Other apps enrich the context.

That keeps the ecosystem logical and sellable.

4. The standalone Site Walk value proposition

Site Walk should be able to sell by itself with a very clear promise:

“Everything you need to document field conditions, create punch lists, perform inspections, create branded proposals and reports, and send polished digital deliverables from mobile or desktop.”

That is strong enough to sell as a standalone app.

It does not sound dependent on other apps.
It does not feel incomplete.
It still leaves room for bundles.

5. What Site Walk should do for users

At its core, Site Walk should help users do five things very well:

1. Capture

Document problems, work status, or site conditions quickly in the field.

2. Organize

Sort findings by project, plan, level, room, area, trade, category, assignee, or date.

3. Communicate

Turn field data into understandable reports, proposals, and link-based deliverables.

4. Track

Assign, monitor, revisit, verify, and close issues.

5. Expand

Gain richer context when bundled with other Slate360 apps.

6. The best way to think about Site Walk’s users

Primary users include:

superintendents
project managers
project engineers
assistant project managers
general contractors
subcontractor foremen
inspectors
safety teams
QA/QC teams
owners’ reps
architects
engineers
consultants
facility managers
turnover teams
closeout teams
warranty teams
university capital programs staff
developers
small builders
remodelers
property condition reviewers

Site Walk should work equally well for:

a single inspector doing quick condition reports
a superintendent walking a hospital or stadium
a consultant delivering polished branded findings to a client
a contractor doing turnover and closeout
7. The core objects the app should be built around

This matters because it keeps the product scalable.

Workspace / Company

The organization using Site Walk.

Project

The jobsite, property, campus area, or facility.

Walk / Session

A specific field visit, inspection, or documentation run.

Finding / Item

The core record. This can represent:

punch item
issue
observation
deficiency
inspection note
safety item
progress note
corrective action item
Media
photo
video
voice note
attachment
marked-up image
linked plan view
linked immersive media if bundled
Location
plan pin
room
level
floor
area
building
gridline
elevation
map point
geolocation
optional 360 scene reference in bundles
Deliverable
report
proposal
link package
PDF export
image package
digital review package
Assignment / Responsibility
responsible party
trade
subcontractor
priority
due date
status
Activity
comments
updates
closeout verification
change history
8. The workflows Site Walk absolutely needs

These are the workflows the product should be designed around.

A. Punch walk workflow

User walks the site, documents deficiencies, pins them to plans, assigns trades, and generates a punch report.

B. Inspection workflow

User performs a formal or informal inspection, uses templates/checklists, adds evidence, and generates an inspection report.

C. Progress documentation workflow

User captures progress photos and notes over time and shares a summary with owners or project leadership.

D. Proposal / estimate workflow

User documents field conditions and turns them into a branded proposal, scope, or corrective action package.

E. Client/owner deliverable workflow

User creates a clean digital handoff package with issue details, marked-up photos, attachments, and optional linked views.

F. Closeout / verification workflow

User revisits findings, uploads completion proof, verifies fixes, and generates open/closed logs.

G. Plan-based field workflow

User uploads plans and uses them as the spatial backbone for issue creation and tracking.

H. Mobile-first site capture workflow

User quickly creates items on the move with photo + note + voice + markup + save.

9. The most important workflow to design first

If you want the strongest starting point, build this first:

Walk site → create item → organize → generate deliverable → send

That is the heartbeat of Site Walk.

A clean version of that flow looks like this:

Open project
Tap “Start Walk”
Choose walk type
punch
inspection
progress
safety
QA/QC
custom
Capture photo/video
Add quick title
Add voice-to-text or typed notes
Mark up photo if needed
Tag location
Assign responsible party
Set priority and due date
Save
Continue walking
Review items
Generate branded deliverable
Send by email, text, or link

If this feels fast and polished, the app will feel powerful.

10. What Site Walk-only users must be able to do

This is where your added clarification matters most.

A standalone Site Walk customer cannot feel like they bought an incomplete piece of a larger machine.

So Site Walk-only customers should be able to do all of this without needing any other app:

start and manage walks
create unlimited item types within their plan
take and upload standard photos
attach short videos
add notes
use voice-to-text
use bullet-point note cleanup
mark up images
pin findings on plans
organize findings by room, floor, area, and trade
assign and track issues
generate branded PDF punch reports
generate branded inspection reports
generate branded proposals
send digital deliverables by link
send by text or email
allow mobile viewing of deliverables
allow recipients to view marked-up photos and attached files
export structured reports and summaries
save and download deliverables

That is enough to make Site Walk a legitimate product by itself.

11. What bundle customers should unlock

When a customer has another app, Site Walk should gain visible power.

If user also has 360 Tour Builder:
attach navigable 360 scenes to findings
add immersive 360 references in reports
send issue links that open into the relevant 360 scene
pin issues directly in 360 imagery
include richer owner/client deliverables
If user also has Project Hub:
findings sync into the broader project system
issues contribute to project recordkeeping
deliverables roll into project communications
teams see field issues in context with project workflows
If user also has Design Studio / BIM:
findings can reference model locations
users can connect issues to design/model views
If user also has Reports & Analytics:
issue closure trends
recurring deficiencies
trade performance
recurring risk areas
executive dashboards

This is the right kind of bundle value: better together, but not dependent.

12. The cleanest anti-cannibalization rule

Use this:

Site Walk can reference richer media from other apps, but should not fully recreate the authoring system of those apps.

Examples:

Site Walk can attach or launch a 360 scene, but should not become a full 360 builder
Site Walk can display model context, but should not become full BIM authoring
Site Walk can generate field reports, but not absorb all enterprise analytics/reporting
Site Walk can send digital deliverables, but should not become full media production or hosting infrastructure

That is the product boundary.

13. Ten essential features Site Walk must have

These are the must-haves.

1. Fast issue capture

Photo/video, title, notes, status, assignment, and save in very few taps.

2. Punch list system

Open, assign, filter, re-inspect, close, verify, export.

3. Plan upload and plan pinning

Users must be able to upload plans and place issues directly on drawings.

4. Photo markup

Arrows, circles, text, highlights, and callouts.

5. Voice-to-text notes

Fast field note entry without heavy typing.

6. Branded report generation

Punch reports, inspection reports, summaries, and progress reports.

7. Branded proposal generation

Standalone Site Walk users should be able to create professional proposals from field findings.

8. Link-based digital deliverables

Send mobile-friendly view links by text or email.

9. Structured filtering and organization

By room, level, trade, category, assignee, date, priority, and status.

10. Easy send, download, and export

PDF, CSV, images, share links, and packaged handoffs.

14. Ten creative and highly useful features

These are the differentiators.

1. AI note cleanup

Turn rough dictated notes into polished bullet points or formal descriptions.

2. Smart category suggestions

Suggest likely trade/category from image + note.

3. Room-by-room guided walk mode

Guide user through areas to reduce missed items.

4. Before/after verification view

Side-by-side issue and completion proof.

5. Suggested corrective action text

Generate a likely fix description for reports or proposals.

6. Smart grouping of findings

Group by room, trade, type, or recurring pattern.

7. Walk replay timeline

Show the order and progression of items captured during a walk.

8. Turnover mode

Optimized workflow for units, rooms, suites, classrooms, hotel rooms, etc.

9. Stakeholder-friendly live digital package

A clean view link that looks premium on phone or desktop.

10. Bundle-aware immersive enhancement

If customer has 360 Tour Builder, let the deliverable include a “View 360 Context” button.

15. How plans, photos, deliverables, and 360 should work together

You asked specifically about uploading plans, pinning 360 photos, geolocated photos, sending data, and digital viewing.

Here is the cleanest version of that workflow.

Standard Site Walk workflow
User creates a project
Uploads plans
App separates plan sheets or lets user browse them
User opens a sheet
Drops a pin
Pin becomes a finding
User adds:
title
notes
voice note or voice-to-text
photos/videos
markup
assignee
category
due date
status
Finding appears:
on the plan
in the issue list
in the report builder
User generates branded deliverable
User sends by text, email, or direct link
If customer also has 360 Tour Builder
User attaches related 360 scene
Finding can reference exact 360 location
Report includes “Open immersive view”
Recipient opens link and can navigate the 360 content

That gives a bundle customer a very visible upgrade without weakening Site Walk.

16. Deliverables Site Walk should support

This is a major value driver and should be one of the selling points.

Site Walk deliverable types
punch list report
inspection report
progress report
site walk summary
deficiency report
turnover report
closeout verification package
field observation report
branded proposal
estimate summary
trade-specific action list
issue-specific memo
digital review package
Delivery methods
PDF
email send
textable share link
downloadable package
CSV
image export
link with restricted access window
branded mobile review page
Things recipients should be able to do

Depending on permissions:

view issue list
open marked-up images
view attached documents
see issue status and due date
save/download deliverables
open immersive views if included through a bundle
potentially comment or acknowledge in future versions
17. Mobile UX requirements

Because Site Walk is field-first, mobile UX is not secondary. It is central.

Site Walk mobile must be optimized for:
one-handed use
quick capture
big buttons
minimal typing
voice-first input
reliable save behavior
offline tolerance
fast photo handling
visible controls with keyboard open
easy send/share after the walk
Must-have mobile behaviors
sticky bottom action bar
floating capture button
large save button
auto-save drafts
keyboard-safe form layout
no hidden submit fields
no tiny note fields
swipe between captured items
review screen before sending
easy voice toggle on/off
easy bullet-point note formatting
fast preview of photos
easy markup with finger
compressed upload preview while originals process in background
Mobile problems you must avoid
keyboard covering the note box
save button disappearing
losing field notes if app gets interrupted
markup tools being too small
slow camera-to-item flow
too many taps to create a basic issue
hard-to-see statuses and assignments
difficult sharing on phone
overly heavy viewer components on weak devices
18. Data and processing controls for high margins

You mentioned wanting strong margins, around 90–95%. That means Site Walk has to be disciplined about storage and processing.

Good margin rules
optimize images for viewing
keep originals in controlled storage
use thumbnails/previews for everyday browsing
compress deliverables intelligently
meter storage and heavy exports
limit included hosted sharing duration by tier
avoid giving away heavy immersive hosting inside Site Walk-only plans
use low-cost defaults for standard reports and media
What to meter later
active projects
storage used
number of active share links
number of external recipients
number of reports exported
number of proposals generated
AI note cleanup usage
long-term hosted deliverables
bundled immersive content usage
large media uploads
Profitability principle

Site Walk should be mostly:

structured data
optimized photos
lightweight PDFs
controlled sharing
optional paid enhancements

That is much better than allowing unlimited heavy media in the base app.

19. Recommended MVP for Site Walk

To get moving without overbuilding, this is the best MVP.

MVP should include:
project creation
walk/session creation
finding/item creation
photo upload/capture
note entry
voice-to-text
photo markup
category/trade/status/priority/assignee
due date
plan upload
plan pinning
list filtering
branded PDF report generation
branded proposal generation
link-based deliverable sharing
mobile-friendly review pages
send by email/text workflow
export/download

That is already a real product.

20. Phase 2 features

Once MVP is stable:

templates and checklists
recurring walk templates
before/after compare
turnover mode
richer branded proposal layouts
external acknowledgement workflows
better closeout workflows
issue history timeline
stronger offline queueing
richer client presentation mode
21. Phase 3 features

After that:

360-linked issues
immersive issue context
BIM/model-linked findings
AI-generated descriptions and proposal drafts
recurring issue pattern detection
executive summary packages
trade performance insights
digital owner portal packages
geospatial tie-ins
automated closeout books
22. Best starting development order

To keep the product clean and extensible, build it in this order:

Step 1

Define data model:

project
walk
finding
media
location
deliverable
share link
Step 2

Build fast field capture:

create item
add photo
add note
add markup
assign
save
Step 3

Build issue list and organization:

filters
grouping
sorting
status views
Step 4

Build plan upload and pinning

Step 5

Build branded report generation

Step 6

Build branded proposal generation

Step 7

Build share links, email, and text delivery

Step 8

Add bundle hooks:

360 scene reference slot
Project Hub sync slot
Analytics slot
BIM slot

That gives you a strong standalone app with future expansion points.

23. Final product logic in one sentence

If I had to summarize the strategy in one sentence, it would be this:

Site Walk should be the field documentation and action app that fully works on its own, while bundles unlock richer context rather than basic capability.

That is the cleanest answer to your challenge.

It protects the value of:

Site Walk by itself
360 Tour Builder by itself
bundles as a higher-value upgrade path
Slate360 as a connected ecosystem
24. What I would recommend doing next

The next best step is to turn this into a build-ready Site Walk master blueprint with sections like:

product purpose
app boundaries
MVP features
phase 2 and 3 features
data model
user roles
deliverables
mobile UX requirements
bundle logic
monetization guardrails
screen-by-screen workflow map





Master build plan for Site Walk
1. Product boundary and ownership
Site Walk owns
field sessions
camera-first capture
voice notes and note transcription
issue capture
punch items
progress documentation
inspection data capture
proposals-from-field documentation
plan pinning
offline queue
quick review and submit
field-to-office sync
raw media capture metadata
session-level and item-level organization
simple deliverable initiation
Slate360 Core owns
auth
billing
access codes
org/team management
project creation
global permissions
SlateDrop file management
history snapshots
deliverable editing
desktop review
external links and access tokens
dashboard notifications
usage metering and quotas
Other Slate360 apps enrich Site Walk
360 Tour Builder adds immersive 360 proof and navigable linked context, not basic issue capture.
Content Studio adds edited clips and advanced media polish, not basic field media capture.
Project Hub provides office-side coordination, routing, assignments, logs, and broader workflow integration.
Virtual / BIM-linked experiences can power later “X-Ray BIM Vision” and other advanced contextual overlays.

This is the cleanest way to keep Site Walk strong by itself while making bundles feel much more valuable.

2. Canonical feature inventory, combined from all files

Below is the unified feature inventory so nothing gets dropped.

A. Core field capture
start a new Site Walk session
select or create project
choose session type: progress, punch list, inspection, proposal, general/custom
full-screen camera-first walk mode
capture photos
capture short videos
add text notes
add voice notes
auto-transcribe voice
tag GPS and timestamp
tag device orientation
attach weather data at session or item level
show item count
show GPS state
show offline state
save instantly
pause and resume session
review captured timeline
edit captured items
reorder captured items
delete captured items
session submit flow
B. Punch / inspection / issue management
issue records
punch list items
inspection checklist items
priorities
assignees
statuses: open, resolved, re-inspect, custom later
due dates and reminders
room/area/location labels
category/trade classification
bulk assign
bulk close
item status color on plans
resolution photos
closeout verification workflow
before/after verification later
C. Plan and spatial workflows
upload plans/drawings
drawing overlay button in walk mode
pinch/zoom/pan plan viewer
numbered pins on plans
pin linked to photo and note
status-colored pins
later sheet navigation enhancements
later BIM / model-linked context
later AR overlay / X-Ray BIM Vision
D. Offline and reliability
IndexedDB local storage
pending upload queue
sync badges
reconnect sync
conflict handling
pending submit while offline
service worker sync later
never lose field data
local-first item creation
raw upload to SlateDrop/S3 when online
E. Deliverables
progress report
punch list report
inspection report
proposal / estimate deliverable
custom report
PDF generation
digital viewer link
interactive email
branded company logo
white-label at enterprise
token-gated sharing
expiry / revocation / max views
history snapshot
editable copy + immutable snapshot for contributor submissions
F. Office and ecosystem sync
Site Walk sessions tied to projects
SlateDrop file storage
project activity log
deliverable access tokens
contributor invitations
dashboard card
desktop review
notifications
real-time field-to-office sync
project folder provisioning
history folder integration
G. AI and advanced automation
AI note cleanup
smart note formatting
speech-triggered capture
auto-defect suggestion
smart prioritization
recurring issue detection
auto-generated suggested fix and cost
smart subcontractor assignment via NLP
schedule-vs-progress comparison
low-light auto-enhance
auto-face/plate blur
object counting
offline transcription
BIM overlay vision
AR measurement
QR/barcode routing
H. Bundle enhancements
attach 360 scene to item
“Near Me” 360 linkage by GPS
add edited clip from Content Studio
immersive digital viewer button
360-linked deliverables
bundle upsell prompts
office-side Project Hub coordination
later model-based or VR-linked views
3. Features that must be in MVP vs later

This is the most important cleanup step.

MVP: must ship for beta

These are the features that form a complete, sellable first version.

MVP core workflows
open Site Walk from dashboard or PWA
select project
create session
choose session type
camera-first capture
text note
voice note using browser speech recognition
GPS + timestamp
weather capture
local queue and IndexedDB persistence
item timeline
edit/delete/reorder items
plan upload access and plan pinning
session review screen
submit session
create deliverable draft
PDF export
digital viewer link
branding/logo
token-based sharing
desktop office review
contributor invite flow
real-time notification to office
activity logging
folder provisioning and history snapshot
MVP data model

Ship these tables and routes first:

site_walk_sessions
site_walk_items
site_walk_deliverables
session CRUD
item CRUD
item reorder
deliverable CRUD
deliverable submit/share routes
MVP browser/device APIs
getUserMedia or file capture
geolocation
SpeechRecognition/webkitSpeechRecognition
IndexedDB
basic wake lock
optional vibration feedback
background sync fallback if unavailable
Beta differentiators: should come right after MVP

These are high-value and realistic without blowing up the schedule.

auto-weather logging
ghost overlay for before/after alignment
speech-triggered capture
auto-face/plate blur on device
“Near Me” 360 linkage
offline sync animation
audio waveform trimmer
templates/checklists
cost estimate field
manpower field
search/filter by trade/status/location
progress dashboard for a walk
one-tap generate report
custom statuses
signatures for signoff
role-based contributor views

These are strong enough to wow users without forcing risky architecture changes.

Phase 2 / 3 disruptor pack

These should not block beta, but they should absolutely be designed into the architecture now.

WebXR AR Tape Measure
true offline Whisper transcription
X-Ray BIM Vision
on-device object counting with YOLO/ONNX Runtime Web
VLM progress vs schedule matching
smart subcontractor assignment via NLP
QR/barcode asset auto-folder routing
low-light canvas auto-enhance

These are excellent differentiators, but they belong after the basic product is stable.

4. Recommended final phased build order
Phase 0 — lock architecture and schemas

Goal: no more ambiguity.

Build:

verify site_walk_sessions schema
add site_walk_items
add site_walk_deliverables
finalize RLS
finalize folder conventions
finalize item metadata schema
finalize entitlements/limits hooks
finalize contributor permission model
define extension hooks for 360, BIM, object detection, AR, and VLM

Output:

stable DB spec
stable API contract
stable file/folder convention
stable event model

This phase is mandatory because your docs still contain some conflicting states, like one part saying architecture is locked and another saying do not build until architecture decisions are locked.

Phase 1 — core capture engine

Goal: make Site Walk usable in the field.

Build:

PWA shell
project selector
session creation
walk mode UI
camera capture
note entry
browser speech-to-text
GPS/timestamp/device metadata
timeline
auto-save
IndexedDB queue
sync service
resume in-progress sessions
session review screen

This is the heart of the product. Until this works beautifully, nothing else matters.

Phase 2 — issue/punch/inspection system

Goal: turn raw capture into structured field operations.

Build:

item status
assignment
priority
due dates
categories/trades
checklist mode
punch-specific templates
inspection templates
bulk actions
plan pinning
drawing viewer
resolution cycle
reopen/re-inspect flow

This is what makes Site Walk more than a camera app.

Phase 3 — deliverables and sharing

Goal: make it professionally useful and sellable.

Build:

deliverable drafts
branded logo insertion
progress report templates
punch list report templates
proposal templates
PDF engine
digital viewer page
interactive email option
token-based link sharing
access/expiry/revocation controls
history snapshot
immutable contributor submission snapshot
open tracking and view analytics

This phase converts capture into client-facing value.

Phase 4 — desktop review and Project Hub sync

Goal: connect field with office.

Build:

desktop session review
comments/annotations
office-side editing
push notifications
Supabase realtime sync
Project Hub surfacing
project activity log events
stakeholder-based recipient selection
contributor review and approval workflows
office-to-field handoff for pre-walk punch lists

This is what makes Slate360 feel like the “central nervous system.”

Phase 5 — beta differentiators

Goal: increase stickiness and create visible product edge.

Build:

auto-weather logging
ghost overlay
speech-triggered capture
face/plate blur
360 proximity linking
audio waveform trimmer
templates/checklists polish
walk analytics
signatures
better filtering
role-limited views
daily summary email
recurring issue detection lite

These are strong enough to market.

Phase 6 — bundle integrations

Goal: unlock ecosystem value without cannibalization.

With 360 Tour Builder
attach scene to item
“Open immersive proof”
360 pin jump-in
linked viewer token support
With Content Studio
attach edited clip
add richer media proof
With Project Hub
pre-walk punch imports
route items into office workflows
assignment sync
With BIM/Virtual
reserve model reference fields
later use for X-Ray BIM and model-linked issue context

This phase should mostly be hooks and progressive enhancement, not a rewrite.

Phase 7 — disruptor R&D

Goal: market-leading capabilities.

Build in this order:

WebXR AR Tape Measure
Whisper.cpp offline transcription
YOLO object counting
VLM progress vs schedule
X-Ray BIM Vision
smart assignment NLP
QR/barcode routing
low-light enhancement

The order matters because the first four are easier to productize than full BIM overlay accuracy.

5. What should be added to the schema now so later features do not break things

Even if you do not build all advanced features now, reserve space for them.

Add or reserve in site_walk_items.metadata
weather
device orientation
heading
capture mode
offline sync state
measurement overlays
blur flags
defect suggestions
object counts
schedule comparison result
linked 360 scene id
linked model id
QR/barcode values
AI confidence
before/after reference id
Add or reserve in site_walk_sessions.metadata
session type config
route summary
checklist template id
weather summary
sync summary
linked deliverable ids
linked schedule segment
linked 360 map context
organization branding snapshot

That gives you forward compatibility.

6. What is still missing or underdefined in the docs

These are the places where things could still get missed unless explicitly added to the master plan.

Missing or underdefined items
exact session template model
checklist schema
plan file parsing/versioning behavior
voice note raw audio retention policy
video length/storage limits
item threading/comments model
cost estimate/manpower schema
signature storage and verification model
digital viewer permission matrix
external recipient identity tracking
object detection label taxonomy
BIM alignment calibration workflow
AR/browser support fallbacks
offline queue retry/backoff rules
analytics event taxonomy
subscription/usage enforcement per feature
watermarking rules for trial vs standard vs business

These should be added to the master blueprint before coding gets too deep.

7. Recommended final feature map by bucket
Bucket 1 — core required
sessioning
items
capture
notes
voice
GPS
weather
offline
plan pinning
review
deliverables
sharing
desktop review
contributor flow
activity log
Bucket 2 — ops and admin required
billing hooks
entitlements
quotas
folder provisioning
history snapshots
tokens
notifications
dashboard card
access codes
RBAC/RLS
Bucket 3 — beta differentiators
ghost overlay
speech-triggered capture
face/plate blur
360 proximity link
waveform trimmer
templates/checklists
signatures
walk analytics
Bucket 4 — bundle-only enrichments
immersive 360 context
edited clips
Project Hub office workflows
BIM/model references
Bucket 5 — disruptor R&D
AR measurement
offline Whisper
YOLO counting
VLM schedule comparison
BIM x-ray vision
NLP assignment
QR routing
low-light enhance
8. My recommendation for the official build sequence

If your goal is “do not miss anything,” this should become the official build order:

Release 1: Beta core
complete field capture
complete offline reliability
complete session/item model
complete plan pinning
complete deliverables
complete sharing
complete desktop review
complete contributor flow
complete dashboard/platform integration
Release 2: Beta-plus differentiation
ghost overlay
weather enrichment
speech-triggered capture
face/plate blur
templates/checklists
signatures
360 proximity hooks
better analytics and summaries
Release 3: ecosystem unlock
attach 360 scenes
attach edited clips
pre-walk imports from Project Hub
richer external viewers
Release 4: disruptor pack
AR measure
offline whisper
object counting
schedule-vs-photo VLM
BIM x-ray

That sequencing gives you a product users can pay for early, while protecting the bigger vision.

9. Bottom line

You do not actually have a “missing ideas” problem now. You have a structure and sequencing problem.

The files already contain the major ingredients:

strong field capture architecture
strong platform integration
strong deliverable logic
strong offline requirement
strong contributor and office-review flows
a good list of differentiators
a very strong disruptor pack

The safest path is to treat:

the Comprehensive Build Plan as the source of truth for architecture, data model, platform integration, flows, and deliverables, and
the Master Blueprint as the source of truth for PWA split and phased wow/disruptor features.

The one thing I would do next is turn this into a single merged master blueprint with these sections:

product boundary
source-of-truth architecture
complete feature inventory
schemas
APIs
UI screens
offline model
deliverable system
ecosystem integrations
tier/bundle gating
phased roadmap
“not now” backlog






The new product stack is:

Site Walk
360 Tours
Design Studio
Content Studio

And the big product idea becomes:

Slate360 is the main app container and operating system. Site Walk is the first app inside it, and it should become the bridge between the field and the office.

Because you also asked about app-store strategy and what will or will not work before store release, I checked the current Apple and Google guidance too. Apple’s App Review still rejects apps that feel too much like a thin website wrapper under its minimum-functionality standard, while Google Play requires apps to provide a stable, responsive, engaging user experience and not just a low-value web shell. Apple also requires in-app account deletion for apps that support account creation, and both Apple and Google have their own billing rules for digital subscriptions sold inside store-distributed apps.

The correct architecture now

The older planning assumed Site Walk would connect heavily into Project Hub. Since Project Hub no longer exists, you should replace that concept with this:

Slate360 Core

This is the shell users subscribe to and download first from slate360.ai. Later, it can also be distributed through the App Store and Google Play.

Slate360 Core should own:

authentication
billing and subscription management
organization/team management
project creation and project registry
shared file system and storage
notifications
permissions and role gating
shared activity feed
shared messaging/comment system
shared deliverable viewer infrastructure
shared settings/profile/branding
app launcher for Site Walk, 360 Tours, Design Studio, and Content Studio
Site Walk

This is the first field app and should be the field execution and communication layer.

Site Walk should own:

site sessions
field capture
punch/inspection/progress workflows
plan pinning
issue records
offline queue
field notes
mobile-first capture
field deliverables
field-to-office live sync
360 Tours

Owns immersive 360 capture, hosting, scene navigation, hotspots, and richer contextual viewing. It should enhance Site Walk, not replace it.

Design Studio

Owns BIM/model/design workflows, advanced spatial model context, print and technical model analysis. It can later enhance Site Walk with model-linked context and “X-ray BIM” style overlays.

Content Studio

Owns editing, media enhancement, branded clips, and more polished content deliverables. It should enrich Site Walk deliverables, not replace its basic field-media workflows.

That gives you a clean ecosystem without Project Hub.

Master product direction for Site Walk
What Site Walk is now

Site Walk should be the mobile-first field documentation, issue capture, communication, and action app inside Slate360.

It should let a user:

walk the site
capture photos, videos, notes, and voice notes
pin items on plans
organize findings by room/area/level/trade
assign issues
communicate with office staff in real time
receive assignments from the office
turn field data into polished deliverables
sync everything into Slate360 Core

So the new definition is:

Site Walk = the field-side operating app for capture, coordination, and communication.

The biggest change: make Slate360 the bridge between field and office

You specifically asked whether leadership in the office should be able to communicate or assign things to people in the field, and whether the office can see what the field sees in real time.

The answer is: yes, that should be built into the product vision from the start.

Site Walk should not just be a camera-and-report app. It should be a live field coordination app.

Office-to-field coordination features Site Walk should include
Real-time assignment flow

Office staff should be able to:

create an assignment
attach a deadline
attach a location/plan pin
attach reference images/files
assign to a field user or team
push it instantly to the user’s device

Field users should be able to:

receive a push/in-app alert
open the assignment directly
see instructions, plan pin, photos, and notes
add response notes/photos
mark in progress / complete / blocked
request clarification

This should work whether the assignment started from:

a punch item
a progress task
an office instruction
a corrective action
a client request
a safety concern
Live field feed

Office users should be able to open a project and see a live stream of what is happening:

active Site Walk sessions
newly captured items
status changes
who is online in the field
uploads pending sync
issues opened/resolved
field user location summary if enabled and permitted

This becomes the “live job pulse.”

Two-way comments and discussion threads

Every session and every item should support communication:

office asks for clarification
field responds with photo/note/voice
leadership leaves instructions
field can escalate an issue upward
threaded discussion remains attached to the item

This is much better than scattered texts and emails.

Live office review mode

A field user should be able to optionally share a live session with office staff:

office sees new captures appear in near real time
office can comment while the field user is still walking
office can ask for “one more photo,” “check the next room,” or “zoom in here”
field can acknowledge and continue

That would be a major differentiator.

“Dispatch to field” mode

Leadership or office coordinators should be able to create a field task package:

title
description
due time
project/area
plan pin
reference files
related 360 scene if available in bundle
checklist or required photos

Then push it to one or more field users.

This is one of the strongest missing links in many field apps.

Read receipts and response tracking

Office needs confidence that communication happened.

For each task or shared deliverable:

sent
delivered
opened
acknowledged
in progress
completed
verified

This matters a lot for leadership and accountability.

“Office sees what field sees” enhancements

You asked specifically about this, and there are several ways to do it.

Practical approach for early versions
live upload stream during a walk
immediate thumbnail sync
live notes/comments
optional audio note playback
optional “request next capture” prompts from office
Later premium approach
low-latency live field video mode
office can observe camera stream
office can freeze a frame and request a capture
office can point user to next location on plan

That later version is more complex, but the architecture should leave room for it.

Revised master feature structure for Site Walk
1. Core field capture
project selector
session types
camera-first walk mode
photos
short videos
text notes
voice notes
speech-to-text
GPS/timestamp/weather metadata
local timeline
edit/reorder/delete items
auto-save
offline queue
2. Field issue workflows
punch items
inspection items
progress items
proposal-condition items
priorities
assignees
due dates
statuses
room/area/trade categories
verification cycle
before/after proof later
3. Office coordination workflows
assign item to field staff
dispatch task package to field
field acknowledgment
two-way item comments
office review of live session
field escalation to office
read receipts and progress tracking
leadership view of active field sessions
field team status board
4. Spatial workflows
plan upload
drawing overlay
numbered pins
status-colored pins
location labels
later 360-linked context
later BIM/model-linked context
5. Deliverables
progress report
punch report
inspection report
proposal package
custom report
PDF
digital viewer link
email-ready outputs
branding
history snapshots
downloadable files
6. Bundle-aware enhancements

With additional apps, Site Walk should gain power:

360 Tours: immersive linked context, scene launching, issue-linked 360 viewing
Design Studio: model/BIM references, X-ray BIM direction later
Content Studio: polished clips and richer media outputs
Communication and coordination features I strongly recommend adding

These are not just “nice extras.” They support your field-office bridge idea.

Must-add coordination features
item-level comments
office-to-field assignments
field-to-office escalation
live session activity feed
in-app notifications
role-based dashboards: leadership / office coordinator / superintendent / subcontractor / inspector
acknowledgment required for assigned tasks
assignment due dates and overdue alerts
office-generated checklists pushed to field
“need help” flag from field user
quick office response templates
project announcement channel
item-specific voice replies
markups from office on photos/plans that field can reopen on mobile
High-value premium coordination features
office observer mode for active sessions
“request another photo from here”
live camera assist mode
walkie-talkie style voice thread on an item
office heatmap of unresolved field issues
coordination timeline showing who did what and when
smart routing to the right field person based on role/location
field staffing load view
recurring issue alerts across jobs
leadership digest emails each day

These would make Slate360 feel like a true operations bridge, not just a documentation tool.

Revised phased build plan
Phase 0 — lock architecture

Because Project Hub is gone, lock the architecture around:

Slate360 Core
Site Walk
360 Tours
Design Studio
Content Studio

Decide now that Site Walk talks to Slate360 Core, not to Project Hub.

Build:

final project registry model in Slate360 Core
final team/roles model
final activity/event model
final shared messaging/comment model
final file/folder conventions
final session/item/deliverable schemas
extension hooks for 360, Design, and Content
Phase 1 — Slate360 Core shell

Before Site Walk, the shell must exist.

Build:

auth
account creation/login
subscriptions
app launcher
project registry
shared notification center
shared file storage base
shared branding settings
shared team/user roles
shared activity log
shared deliverable token system

This is what users subscribe to first on slate360.ai.

Phase 2 — Site Walk MVP

Build the first real app inside Slate360.

MVP must include
project selection
session creation
camera-first capture
note entry
browser speech-to-text
GPS/timestamp/weather
local queue
timeline
edit/reorder/delete
offline support
plan pinning
review screen
deliverable creation
PDF export
digital viewer link
branding
contributor access
push/in-app notifications
office-side review view
office-to-field assignment
field-to-office response/comments

That last set is important because your bridge idea should be part of version 1 planning, not just a late add-on.

Phase 3 — Site Walk beta differentiators

After MVP stability:

ghost overlay
speech-triggered capture
auto-face/plate blur
offline sync polish
templates/checklists
signatures
“Near Me” 360 linkage hooks
audio waveform trimming
richer leadership views
live active-session board
Phase 4 — 360 Tours integration

Once 360 Tours is the second app:

add linked 360 scene references to Site Walk items
allow “Open immersive context”
allow deliverables to include a 360 launch button
allow office users to request 360 proof from field
allow issue pins in immersive scenes for bundle users

The 360 authoring still belongs to the 360 Tours app. Site Walk only references it.

Phase 5 — Design Studio integration

Once Design Studio exists:

attach model references to Site Walk items
link to model viewpoint
allow office-side model context
prepare for X-Ray BIM Vision later
Phase 6 — Content Studio integration

Once Content Studio exists:

attach edited clips to deliverables
attach enhanced media proof
allow polished client-facing visual packages
Phase 7 — disruptor pack

After the product is already valuable:

WebXR AR Tape Measure
true offline Whisper transcription
on-device object counting
VLM progress-vs-schedule matching
X-Ray BIM Vision
smart assignment NLP
QR/barcode routing
low-light auto-enhance

These are excellent, but they should not block launch.

Website download vs App Store / Play Store

This is a very important question.

Can Slate360 work if downloaded from slate360.ai first?

Yes — a lot can work extremely well as a PWA installed from your website, especially on Android and modern desktop browsers. PWAs are installable, support offline behavior, can use many web APIs, and can feel very app-like. Chrome’s PWA documentation explicitly supports install flows, and Apple supports home-screen web apps and web push for web apps as well.

What should work fine from slate360.ai as a web/PWA install

For your first release, these can work without waiting for the app stores:

login and subscriptions handled on the website
project selection
camera/photo capture
geolocation
note entry
many offline/PWA behaviors
install to home screen
push notifications for supported web-app environments
token-based sharing
comments/messaging
plan pinning
standard deliverable viewing
most Site Walk coordination workflows
What is weaker or riskier in website/PWA-only form

These are the areas where native/store builds are usually stronger, or web support is more inconsistent across platforms:

On iPhone especially
background behavior can be more limited or less predictable than native
some advanced background sync behaviors are weaker than on Chrome/Android
app-store style deep OS integration is more limited
app discovery and trust are lower than App Store distribution
web install friction is higher than “Get” in the App Store
In general PWA-only
no native StoreKit/Google Play subscription UX
limited access to some deeper native frameworks
more browser-variation risk
app-store search discovery is missing
store ratings/reviews and install trust are missing
Features that are much easier or better as native/store apps

These are the ones I would not depend on for early PWA-only perfection:

very deep background processing
highly reliable background upload/sync in all iOS cases
richer push/notification integrations
tighter OS share-target and file-handler behaviors across all platforms
native AR frameworks beyond browser WebXR
some device-specific integrations like richer NFC or advanced sensor workflows
Live Activities / Dynamic Island type features on iOS
some native camera and media capture controls

For your current plan, Site Walk can absolutely start as a website-downloadable PWA, but some of the most ambitious later features will benefit from native wrappers or fuller native builds.

Do you have to wait for all apps before going to the app stores?

No. You do not need all four apps finished first.

In fact, the better strategy is:

Release Slate360 with Site Walk first

That is completely viable.

You can position the initial release as:

Slate360 app
includes Site Walk as the first production app
360 Tours, Design Studio, and Content Studio listed as “coming soon” or hidden until released

That is normal and workable.

Apple and Google do not require your whole future roadmap to be complete first. What matters is that the submitted app is functional, useful, reviewable, and compliant. Apple’s submission guidance emphasizes making functionality clear and accessible for review, and Apple’s minimum-functionality guideline means the app you submit must stand on its own. Google Play likewise focuses on stable, responsive, engaging functionality.

So yes:

you can submit Slate360 with only Site Walk complete
then add 360 Tours later
then add Design Studio later
then add Content Studio later

That is probably the smartest path.

Best app-store strategy for your situation
Best near-term strategy
Step 1

Launch Slate360 on slate360.ai as:

web app
installable PWA
Site Walk inside it
subscription and onboarding handled on the website
Step 2

Use that to:

test users
fix workflows
verify demand
refine pricing
reduce risk before store submission
Step 3

Then package Slate360 for stores:

iOS wrapper/native shell
Android wrapper/native shell, likely easier with a PWA-first approach
submit with Site Walk as the only live app inside Slate360
Step 4

Add the other apps in later releases

This gives you the fastest path to users while still leaving room for app-store expansion.

Android app-store path

For Android, PWAs are friendlier. Google officially supports Trusted Web Activities for opening your PWA fullscreen inside an Android app, and Google documents Bubblewrap as a way to package a PWA for Play distribution. Google also has Play billing requirements for digital goods/services sold in a Play-distributed app.

So Android is the easier first store target.

Good Android path
keep Slate360 as a strong PWA
package with TWA/Bubblewrap
publish Slate360 with Site Walk first
later add apps inside the same shell
use app updates as needed for shell/native changes
deploy most web feature updates immediately on your server
iOS App Store path

Apple is stricter. If you submit a very thin website wrapper, you risk rejection under minimum functionality. That means the iOS version needs to feel like a real app experience, not just “Safari inside a frame.” Apple’s review guidance and forum examples around Guideline 4.2 reinforce that. Apple also requires in-app account deletion if the app supports account creation.

Good iOS path
make the Site Walk experience feel app-first
include meaningful mobile-specific flows
include install-worthy field features
make offline, notifications, capture flow, sessioning, and communication polished
include account deletion inside the app
be careful not to make it feel like “just a website”

That does not mean you need four complete apps. It means the one app you do have, Site Walk, needs to be strong enough.

Billing and subscriptions: website vs app stores

This matters a lot.

If users subscribe on slate360.ai

That is simplest for your early web/PWA release.

If you distribute through stores and sell digital access inside the app

Then billing rules matter:

Apple uses In-App Purchase / StoreKit for digital content and subscriptions sold in-app.
Google Play generally requires Google Play Billing for digital goods/services in Play-distributed apps, subject to policy details and region-specific programs.

So for a pure website/PWA release, website billing is fine.
For app-store distribution, your billing design needs a proper store-compliance strategy.

Can you add more apps later?

Yes.

That is actually the normal way to do it.

You can release:
Slate360 v1 with Site Walk
Slate360 v2 with 360 Tours added
Slate360 v3 with Design Studio added
Slate360 v4 with Content Studio added

This is much better than waiting to finish everything.

What you should do is architect Slate360 Core now so the app container already knows how to:

show subscribed apps
hide unavailable apps
show “coming soon”
add modules later without restructuring everything
How app updates, additions, and fixes work once you are in app stores

This is a key operational point.

For a web/PWA-first architecture

A lot of your UI and feature changes can still be delivered through the web layer.

That means:

server-side changes
web UI changes
many bug fixes
workflow refinements
copy/design updates
app-module additions inside the web experience

can often be released without waiting for a full store review, depending on how the shell is built.

When you do need a store update

You will need an App Store / Play update when you change:

native wrapper code
native permissions
native SDK integrations
billing integrations
app manifests/capabilities
push setup at native level
deep linking behavior
store metadata/assets
some major packaged dependency changes
Practical meaning for you

If Slate360 is built as:

strong web app
installable PWA
native wrapper/shell for stores

then many day-to-day improvements can still move fast, while shell/native changes go through store review as needed.

That is one of the best reasons to keep the product web-first underneath.

What features may truly need native/store packaging later

These are the features I would flag as likely better in native/store form:

richer push notification behavior on iOS
stronger background uploads/sync
deeper device file/system integration
advanced AR and BIM overlay features
certain sensor-heavy workflows
native share target and file-opening experiences
Live Activities / lock-screen style live task surfaces on iOS
more advanced biometric/security flows
deeper OS-level camera/media control

For early Site Walk, you do not need all of those on day one.

Recommended official launch plan
Launch path I recommend
First

Build:

Slate360 Core shell
Site Walk
strong field ↔ office coordination
website subscriptions
installable PWA from slate360.ai
Second

Use real users to validate:

capture flow
coordination flow
office-to-field assignments
live session review
deliverables
pricing and packaging
Third

Package for app stores:

Android first is easier
iOS next with stronger app-like polish
Fourth

Add 360 Tours
Then Design Studio
Then Content Studio

That sequence is realistic and strong.

Final bottom line

Here is the cleanest version of the strategy:

Product structure
Slate360 = master app container, subscription shell, team and communication bridge
Site Walk = first production app and the field-office coordination engine
360 Tours = second app, immersive context
Design Studio = third app, model/design intelligence
Content Studio = fourth app, media polish and branded storytelling
Coordination principle

Site Walk should not only capture field data. It should let:

office assign
field respond
leadership observe
teams communicate in context
project data move both directions
Distribution principle

You do not need all apps complete before launch or before the app stores.
You can launch Slate360 with Site Walk first, then add the other apps later.

Platform principle

You can absolutely start from slate360.ai as a PWA/web install.
That is the fastest path.
But the most advanced long-term features and the best store discoverability will still benefit from eventual App Store and Google Play distribution.

Store principle
Android is friendlier first
iOS is stricter about minimum functionality and app-like value
store billing rules matter for digital subscriptions
account deletion must be supported in the iOS app if account creation exists

If you want, the next thing I should do is turn this into a single master build-and-launch roadmap with:

Slate360 Core
Site Walk
field-office coordination system
website/PWA launch
app-store rollout
later app additions
billing/compliance checklist



Master build map
1. Product architecture map
Slate360 Core

This is the shared shell everything depends on.

It should own:

auth
orgs and users
roles and permissions
subscriptions and entitlements
project registry
shared notification center
shared activity feed
shared comments/messaging system
shared file storage layer
deliverable link/token system
app launcher
app gating by subscription
branding and account settings
App 1: Site Walk

This is the first production app and should be the field/office bridge.

It should own:

field sessions
punch/progress/inspection/proposal capture
media capture
voice notes/transcription
GPS/timestamp/weather metadata
plan pinning
item assignment and status
offline queue
field-to-office sync
deliverable generation entry point
office review and office-to-field coordination
App 2: 360 Tours

It should own:

360 scene hosting
360 navigation
hotspots
scene linking
immersive viewer links
360 embedding in deliverables
optional 360 references from Site Walk items
App 3: Design Studio

It should own:

models
BIM/design context
model review
model-linked issue references
later BIM-linked field tools
App 4: Content Studio

It should own:

advanced media editing
branded edited clips
enhanced deliverable media
richer marketing/client outputs
2. Functional system map

Everything should flow through projects.

Core shared entities
Organization
User
Role
Subscription / entitlement
Project
Folder / asset
Activity event
Notification
Comment / thread
Deliverable token / viewer link
Site Walk entities
Session
Item
Item media
Drawing pin
Assignment
Deliverable
Session sync state
Contributor invitation/access
Future linked entities
360 scene
Tour hotspot
Design model
Content clip/edit asset

That way, Site Walk can launch first without future rewrites.

Master roadmap
Phase 0 — audit and lock the foundation

Goal: understand the real codebase and stop guessing.

Required output
actual repo structure
frontend app/router structure
backend/API structure
DB schema
auth setup
storage setup
billing setup
environment variables list
current Site Walk code inventory
current mobile/PWA state
current notification/messaging state
current deliverable/token state
current project model
Deliverables for this phase
repo audit document
dependency inventory
risk list
architecture mismatch list
“ready / missing / broken / mock-only” matrix

Do not build anything major before this is done.

Phase 1 — lock Slate360 Core

Goal: make the shell real and reusable.

Build or verify
auth works end-to-end
user/org model is real
project creation is real
folder/storage model is real
entitlements are real
billing hooks are real
app launcher and app gating are real
activity log is real
shared notifications exist
shared comment/thread model exists
deliverable access token system exists
account branding exists
team invites/roles exist
Exit criteria
a user can create an account
subscribe or be granted access
create/open a project
see allowed apps
store files under a project
receive notifications
share a token-based viewer link

This must work before Site Walk is layered on top.

Phase 2 — Site Walk schema and API layer

Goal: make Site Walk real on the backend before polishing UI.

Build
verify/upgrade site_walk_sessions
create site_walk_items
create site_walk_deliverables
add policies/RLS
add session CRUD routes
add item CRUD routes
add reorder route
add deliverable CRUD routes
add deliverable submit/share routes
add assignment/comment routes for field-office communication
add event logging hooks
add notification triggers
add contributor invitation/access flow
Also add now

Reserve metadata fields for:

weather
heading/orientation
sync state
linked 360 scene id
linked model id
object count
measurement overlays
AI flags
schedule comparison result
blur flags
before/after reference ids

That prevents future schema pain.

Exit criteria
API is real
DB is real
auth/permissions are real
nothing relies on mock data
Phase 3 — Site Walk field capture engine

Goal: make the field app genuinely usable.

Build
project selector
session type picker
session start/resume
camera-first capture screen
photo capture
short video capture
text note entry
voice note entry
browser speech recognition
GPS/timestamp/device metadata
weather session metadata
item timeline
item edit/delete/reorder
plan overlay entry point
save locally first
upload/sync when online
Required UX focus
one-handed use
big controls
fast capture
zero data loss
strong offline behavior
visible sync state
no keyboard blocking core actions
Exit criteria
a user can walk a site and capture 20+ items reliably
session survives interruptions
sync works
data appears correctly in backend
Phase 4 — field ↔ office coordination layer

Goal: make Slate360 the bridge between field and office.

Build
office-to-field assignment system
item-level comments
threaded discussions
office instructions on session/item
field acknowledgments
status updates
read receipts
live session activity feed
office observer/review mode
assignment notifications
“need help” / escalation flag from field
markups from office that appear on field mobile
leadership activity dashboard for active sessions
This phase matters a lot

This is the part that turns Site Walk from “field documentation app” into “field-office operations bridge.”

Exit criteria
office can assign to field
field can respond from mobile
office can see updates quickly
communication stays attached to project/session/item context
Phase 5 — plan pinning, punch, inspections, proposals

Goal: make Site Walk operationally complete.

Build
drawing upload/use flow
numbered plan pins
pin-linked items
status-colored pins
punch workflows
inspection checklist workflows
proposal-condition workflows
priorities
assignments
due dates
resolution cycle
verification cycle
templates/checklists
bulk actions
Exit criteria
punch walks work
inspections work
progress walks work
proposal site documentation works
Phase 6 — deliverables and sharing

Goal: make outputs client-ready and professional.

Build
deliverable draft creation
report templates
proposal templates
branding/logo
PDF generation
digital viewer page
link sharing
email flow
access expiry/revoke/max-view logic
history snapshots
immutable contributor submission copies
open/view analytics
Exit criteria
reports look professional
external viewers work
deliverables are shareable and traceable
Phase 7 — PWA install and production hardening

Goal: make it stable enough for early users from slate360.ai.

Build/verify
installable PWA
manifest
icons
service worker
offline persistence
cache strategy
auth persistence
upload retry logic
device/browser support matrix
telemetry/error logging
feature flags
quota enforcement
rate limiting
storage tracking
AI usage metering hooks
Exit criteria
users can install from the website
core flows work on mobile
offline behavior is acceptable
telemetry shows stability
Phase 8 — app store packaging

Goal: get Slate360 with Site Walk into stores.

Android first
package with TWA/wrapper or native shell
test permissions
test uploads
test notifications
test billing approach
prepare store listing
submit
iOS second
create native/wrapper shell with app-like UX
ensure account deletion support
ensure app is not a thin website shell
test permissions, install, notifications, capture, auth persistence
prepare App Store assets and review notes
submit
Exit criteria
Slate360 app is in stores with Site Walk live
360 Tours / Design Studio / Content Studio can be hidden or marked coming soon
Phase 9 — 360 Tours app

Goal: add the second app without breaking Site Walk.

Build
360 scenes
hotspot system
tour hosting
external links
Site Walk reference hooks
“Open immersive context” from Site Walk item
linked deliverable enhancement
Phase 10 — Design Studio app

Goal: add design/model context.

Build
model upload/view basics
model reference links
Site Walk model references
future BIM overlay hooks
Phase 11 — Content Studio app

Goal: add advanced content polish.

Build
edited media
branded clips
enhanced deliverables
Site Walk deliverable enrichments
Phase 12 — disruptor pack

Goal: advanced market-leading features.

Build in this order
WebXR AR tape measure
Whisper.cpp offline transcription
YOLO on-device counting
VLM schedule-vs-photo checks
X-Ray BIM Vision
NLP smart assignment
QR/barcode asset routing
low-light auto-enhance
How many prompt waves this likely takes

This depends on how solid the repo already is, but for a safe build, assume:

Prompt Wave 1 — full fact finding and repo audit

1 large prompt

Prompt Wave 2 — architecture corrections and source-of-truth map

1–2 prompts

Prompt Wave 3 — Slate360 Core foundation fixes

3–6 prompts

Prompt Wave 4 — Site Walk backend/data/API

4–8 prompts

Prompt Wave 5 — Site Walk mobile capture UX and offline engine

5–10 prompts

Prompt Wave 6 — field-office coordination layer

4–8 prompts

Prompt Wave 7 — plan pinning / punch / inspections / proposals

4–8 prompts

Prompt Wave 8 — deliverables / sharing / PDF / viewer

4–8 prompts

Prompt Wave 9 — PWA hardening and production checks

3–6 prompts

Prompt Wave 10 — Android and iOS packaging

3–6 prompts

So the realistic total for a safe, verified implementation is probably:

32–63 prompts, depending on how much already exists and how many retries/fixes are needed.

That is normal for a real product, especially one that must work and not just look pretty.

Safe build method

Use this method for every prompt wave:

Step 1

Audit before changing anything

Step 2

Change one bounded slice only

Step 3

Run checks immediately

lint
typecheck
build
tests if present
route/API verification
DB migration verification
auth/permission verification
Step 4

Return changed files and exact reasons

Step 5

Manual acceptance checklist before next wave

That prevents Copilot/Codespace from “fixing” the wrong things or causing architecture drift.





Refined build plan
Phase 0 — Preparation and cleanup before any new feature building

This is where both the audit and second opinion agree you should start.

Do first
clean or stub dead navigation links for Design Studio, Content Studio, Virtual Studio, and Geospatial
decide how Project Hub should be handled in the product surface since it still exists in code but is no longer the lead product direction
backfill missing migrations for slatedrop_uploads and slate_drop_links
set real Stripe prices so checkout is no longer “TBD”
identify and freeze the canonical planning docs
define the new app order in-code and in docs:
Site Walk
360 Tours
Design Studio
Content Studio
decide whether old Project Hub features will be reused as backend capability later or just deprioritized in the UI
document the current “real vs partial vs missing” truth table as the source of truth going forward

This phase is directly supported by both the audit and the second opinion.

Phase 1 — Slate360 Core stabilization

Before Site Walk is built, Slate360 itself needs to become a cleaner and more useful app shell.

Build or verify
auth
org/user/team roles
projects
entitlements
billing
app gating
storage and folders
notifications
shared activity feed
shared comments/thread foundation
deliverable token sharing
company branding
onboarding / app launcher
Dashboard redesign goal

Your current dashboard should stop being mostly decorative metrics and become a command center.

That means the new dashboard should emphasize:

active projects
active field sessions
pending assignments
unread threads
deliverables awaiting review
files recently uploaded
storage/quota status
quick actions
app launcher
alerts and blockers
who in the field is active right now
what office staff need to review next

If something cannot be clicked, filtered, opened, or acted on, it probably does not belong in the first version of the dashboard.

The second opinion explicitly supports making the dashboard an actionable command center instead of “useless metrics.”

Phase 2 — SlateDrop hardening and optimization

SlateDrop is already real, which is a major advantage. The audit confirms it has file management, presigned S3 uploads, tokenized shares, external upload portals, quotas, and folder CRUD.

What should happen now
make migration coverage complete and reproducible
verify all folder creation logic
verify quota enforcement and file validation
verify share-link creation and expiry behavior
optimize file retrieval and downloads
add better previews / thumbnails if missing
improve project file navigation
make SlateDrop more app-centric, not just a generic file bucket
ensure Site Walk and future apps can write predictable file structures into it
make history/archive behavior explicit
make external upload / client magic link flows polished and reliable
Strategic role of SlateDrop

SlateDrop should become a core subscriber value asset, not just background storage.

It should feel like:

the project file nervous system
the central evidence locker
the external handoff and intake system
the place where Site Walk sessions, deliverables, 360 scenes, and later design/content assets live in structured ways

So SlateDrop is not just a utility. It is one of the product pillars.

Phase 3 — Lock Site Walk architecture before design

This is where the older Site Walk build plan is still useful, but only after removing dependencies on Project Hub and anchoring it to Slate360 Core.

The existing Site Walk planning still correctly defines:

session model
item model
deliverable model
field capture loops
offline importance
browser APIs
future wow/disruptor ideas.
Build/lock now
site_walk_items
site_walk_deliverables
session CRUD API
item CRUD API
deliverable CRUD API
item reorder API
deliverable share/submit API
folder conventions for Site Walk inside SlateDrop
metadata shape for GPS/weather/orientation/sync state
comment/thread model
office-to-field assignment model
contributor invite/access model
event logging model
notification triggers
Reserve metadata now for later features
linked 360 scene id
linked model id
object count
measurement overlays
AI flags
before/after reference
schedule-match result
QR/barcode value
blur flags

That preserves the disruptor roadmap without overbuilding now.

Phase 4 — v0 design against real contracts

Only after the above is locked should v0 be used.

What v0 should design
app shell layouts
command-center dashboard layouts
SlateDrop file views
Site Walk mobile capture screens
Site Walk review screens
office review screens
assignment and communication surfaces
deliverable screens
app launcher and empty states
What v0 should not decide
DB schema
route design
auth logic
entitlements
storage flows
API shapes
share token logic
offline strategy
realtime transport

That point is one of the strongest parts of the second opinion and should absolutely become policy.

Phase 5 — Site Walk MVP build
Core MVP
project select
session create
session types
camera-first capture
note entry
voice note entry
browser speech recognition
GPS and weather tagging
item timeline
review screen
deliverable draft creation
PDF / viewer link flows
local persistence
offline queue
folder writes into SlateDrop
Field ↔ office bridge in MVP

This should be in early, not postponed forever:

office-to-field assignment
item-level comments
session-level comments
read receipts
acknowledgments
active session visibility
office review of incoming field data
field escalation / “need help”
leadership live status board

This is how Slate360 becomes the bridge between field and office rather than just a field photo app.

Phase 6 — Site Walk operations completeness

Add:

plan pinning
punch workflows
inspection workflows
proposal-condition workflows
due dates
priorities
resolution cycle
before/after proof
signatures
templates/checklists
search/filtering
cost estimate fields
manpower / crew-size fields
room-by-room guided workflows later

These ideas came from earlier Site Walk planning and should stay in the roadmap even if not all are MVP.

Phase 7 — PWA hardening

The audit is very clear that the app is not yet a real PWA in the field-tool sense.

Build
service worker
IndexedDB
background/reconnect sync
camera permission fixes
wake lock
install prompt UX
browser/device compatibility testing
telemetry and sync-state diagnostics

This is mandatory before real field beta.

Phase 8 — 360 Tours as App 2

The audit says Tour Builder is already the most mature app module, which is good.

Refocus it as App 2
finish/polish current builder
improve sharing and branding
improve scene management
connect Site Walk items to 360 scene references
add immersive context to deliverables
support “Near Me” 360 linking later
Phase 9 — Design Studio as App 3

Greenfield foundation:

create page
create data model
create upload/view basics
create future link points back to Site Walk
Phase 10 — Content Studio as App 4

Greenfield foundation:

create page
create asset model
create upload/basic editing workflows
create future attachment path back to Site Walk and 360 Tours
Phase 11 — disruptor pack

Keep these in the roadmap, do not let them vanish:

WebXR AR Tape Measure
offline Whisper transcription
object counting
VLM progress-vs-schedule checks
X-Ray BIM Vision
smart subcontractor assignment
QR/barcode routing
low-light enhancement
What the second opinion changes in practice

It gives us a clearer direct-action starting point.

Instead of asking Copilot/Continue to “start building Slate360,” ask them to do this:

clean the foundation
make the dashboard and SlateDrop real command surfaces
define and lock contracts for Site Walk
only then proceed to new builds

That is the safer sequence.

Direct action prompt for Copilot and Continue

Use the prompt below in both Copilot and Continue. It is written as a Phase 0 / readiness prompt, not a “build everything now” prompt.

Writing

You are working inside the Slate360 codebase. Do not generate aspirational mock features or pretty placeholder screens. Work strictly from the existing code reality and prepare the project to begin a safe rebuild/reimagining of the platform.

Mission

Prepare Slate360 to begin:

fixing and reimagining the dashboard into an actionable command center
getting SlateDrop fully working, reproducible, and optimized for an app-centric platform
preparing the codebase to build Slate360 Core cleanly
preparing the codebase to build Site Walk as the first real app inside Slate360
Critical constraints
Do NOT invent backend functionality.
Do NOT create mock-only pages that look complete but are not wired.
Do NOT add placeholder metrics unless they are explicitly temporary and labeled.
Do NOT change product direction back toward Project Hub as the flagship.
Do NOT start building Design Studio, Content Studio, Virtual Studio, or Geospatial yet.
Do NOT use v0-style speculative UI logic. We are preparing the repo for real implementation.
Every change must be small, reviewable, and verifiable.
Prefer “hide/stub/mark coming soon” over leaving broken links.
Preserve working auth, billing, storage, and Tour Builder behavior.
Current known truth

Use these facts as baseline:

Slate360 is a single Next.js 15 app with Supabase, Stripe, AWS S3, and real SlateDrop.
Site Walk is only partial: it has a session table and local-only BlockEditor pieces, but no real item/deliverable tables, no APIs, no offline flow, and no camera capture.
Tour Builder is the most mature app module and should remain intact.
Design Studio and Content Studio do not have real page routes yet.
The dashboard currently contains low-value or weakly actionable metrics and needs to become a command center.
Navigation contains dead links for apps/pages that do not exist.
slatedrop_uploads and slate_drop_links appear to be missing tracked migrations and this must be addressed safely.
Phase 0 objectives

Complete ONLY these preparation tasks unless explicitly asked to continue further.

A. Navigation and product-surface cleanup
Audit all nav/sidebar/app-launcher links.
Identify dead routes and stale app entries.
Remove, hide, or convert dead links into explicit “Coming Soon” stubs.
Ensure the visible app order reflects the real product direction:
Site Walk
360 Tours
Design Studio
Content Studio
Do not expose broken/nonexistent routes to users.
B. Dashboard command-center preparation
Audit the current dashboard widgets, cards, metrics, and click paths.
Produce a list of:
actionable widgets worth keeping
useless/decorative metrics to remove or collapse
missing command-center features needed for Slate360 Core
Refactor only enough to make the dashboard ready for a later reimagining:
identify monolith boundaries
isolate widget registry/config if possible
preserve working functionality
Do not fully redesign the dashboard yet unless explicitly instructed.
Add TODO-safe scaffolding only where it supports future command-center work.
C. SlateDrop hardening and optimization readiness
Audit SlateDrop routes, APIs, folder logic, share-link logic, and upload flow.
Verify or backfill tracked migrations for slatedrop_uploads and slate_drop_links.
Ensure the file/storage system can safely support app-specific folders and future app outputs.
Identify where SlateDrop should evolve from generic file storage into app-centric project storage.
Preserve all working file upload/download/share flows.
Document any missing thumbnail, indexing, or preview optimizations, but do not overbuild them yet.
D. Site Walk readiness prep
Confirm what currently exists for Site Walk:
routes
components
tables
entitlements
billing hooks
Prepare the repo for real Site Walk work by:
identifying where site_walk_items and site_walk_deliverables migrations should go
identifying where Site Walk APIs should live
identifying where PWA/offline/camera work will need to be added
Do NOT build Site Walk features yet unless explicitly instructed.
Create a readiness document or code comments showing the safest insertion points.
E. Monolith-risk assessment
Identify the giant files that should be split before heavy work continues.
Propose a safe split plan for the worst offenders, especially dashboard-related files.
Do not do a risky large refactor in one shot.
If a small extraction is safe and clearly helpful, do it with minimal behavior change.
F. Verification and documentation

For every change:

run lint
run typecheck
run build if safe
report exactly what changed
report what is still blocked
report what is real vs still missing
Required output format

Return:

Summary of Phase 0 findings
Exact files changed
Exact migrations created or updated
Exact routes hidden/removed/stubbed
Dashboard readiness findings
SlateDrop readiness findings
Site Walk readiness findings
Risks/blockers
Recommended next prompt
Success criteria

Phase 0 is complete when:

broken nav is no longer exposed
SlateDrop migration gaps are resolved or clearly documented with exact remediation
dashboard has a clear keep/remove/rework map
Site Walk has a clear implementation insertion map
the repo is safer to begin real Slate360 Core and Site Walk work
no fake UI or placeholder logic was introduced

Start with an audit, then make only the smallest safe changes needed to complete Phase 0.

How this helps refine the build plan

This second opinion helps by narrowing the first real move.

Instead of jumping straight into:

v0 redesign
app-store prep
Site Walk implementation

we should first use Copilot/Continue to:

clean the product surface
fix migration reproducibility
prepare the dashboard to become a command center
make SlateDrop structurally ready
mark exact insertion points for Site Walk

That gives you a safer starting line for the bigger build roadmap.

After that Phase 0 cleanup is done, the next prompt should be a Slate360 Core reimagining prompt focused on:

app launcher
dashboard command center
actionable widgets
team communication surfaces
project and file control
alerts and live activity

Then after that, a Site Walk backend contract prompt.

If you want, next I’ll write the Phase 1 prompt for Copilot/Continue to begin the real dashboard/SlateDrop reimagining after Phase 0 is complete.