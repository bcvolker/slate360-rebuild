# Prompt — reframe slate360.ai from SaaS product to services business

Give this to another AI platform, or use it as the brief for the rebuild. It needs no repo
access to produce the copy, structure and design direction; implementation lands in the
existing Next.js marketing site.

---

You are redesigning the marketing website for **Slate360 LLC**, a reality-capture and
technical services company for the building industry. The site currently sells the wrong
business and must be reframed.

## The problem you are solving

The site today sells **self-serve software subscriptions**: Site Walk $787/year, Pro
$1,484/year, a bundle at $3,476, 14-day free trials, credit packs from $27.99, app-store
download badges. Headlines read *"Capture the site. Keep the twin."* and *"Walk the job. It
documents itself."*

The actual business is **done-for-you services sold on contracts and purchase orders**. The
founder visits the site, captures it, processes it, and hands the client a finished
deliverable in a portal.

A contractor landing on the current site concludes he is being asked to buy an app and do the
work himself — which is precisely the thing he would hire someone to avoid. **Every trial
signup is a lost service enquiry.**

## The business you are selling

**Four service lines**, all delivered by the founder:

1. **Digital twins** — measurable, walkable 3D records. Floor plans, area take-offs net of
   openings, document pinning, progression over time, a portal the client reshares to their
   own stakeholders.
2. **360 tours** — navigable photographic tours. Faster and cheaper than a twin, no
   measurement claims.
3. **Thermography** — thermal survey and reporting: moisture intrusion, missing insulation,
   electrical and mechanical anomalies.
4. **Technical builds** — websites, dashboards and project tooling for small firms without
   the staff to build them.

**Buyers:** general contractors, construction managers, architects (existing conditions),
engineers (as-builts, above-ceiling), owners and facility managers, institutions.

**The single strongest sales trigger, and the story the site should lead with:**
*something is about to become invisible.* A ceiling closing, a wall going up, a slab pouring.
**"Document it before you cover it."** That is a risk-and-evidence purchase on a different
budget line than a marketing "3D tour", and it recurs on every job and every phase.

## Hard rules — these are not stylistic preferences

1. **Never name equipment, devices, or brands.** No phone models, no camera makes, no drone
   names, anywhere on the site, in any image caption, or in any alt text. The site describes
   *outcomes and accuracy*; what produced them is never mentioned. This is deliberate
   commercial policy.
2. **Never claim certification.** Thermal work is sold as documented findings — *"moisture
   intrusion documented and located"* — never as a certified inspection. No certification
   logos, acronyms, or credential language.
3. **Never imply survey grade.** Accuracy language is *estimating-grade*, with the honest
   framing that a laser governs where a legal dimension is required. Do not use "survey",
   "certified", "guaranteed", or "exact".
4. **No free trials, no pricing tiers, no credit packs, no app-store badges, no self-serve
   checkout.** Remove all of it. Pricing is quoted per project.
5. **Do not invent case studies, client names, logos, or testimonials.** Placeholders must be
   obviously placeholders. Real examples will be added once permission is obtained.

## What the site must do

**Primary conversion:** a service enquiry — *"Request a site visit"* — capturing project type,
location, timeline, and what is about to be covered.

**Secondary:** let a visitor experience a real twin in the browser without signing up. The
product demonstrates itself in ninety seconds; a deck does not.

## Structure to produce

1. **Hero.** The pre-cover story, stated plainly. One sentence on what the client gets, one
   clear call to action. Behind or beside it: a live, interactive twin the visitor can move
   around immediately, not a video of one.
2. **The problem.** Short. What it costs when something gets covered and nobody documented it
   — disputes, rework, guesswork on renovation, no reliable as-builts.
3. **Interactive examples.** The centrepiece. See the section below.
4. **Services.** Four cards, each with what it is, who it is for, what the client receives.
5. **How it works.** Four or five steps: enquiry → site visit → processing → deliverable in
   your portal → you reshare it to your own client.
6. **What makes the deliverable different.** Measurement net of openings, above-ceiling
   views, progression over time, documents pinned in place that survive re-scanning, honest
   accuracy labelling.
7. **Pricing approach.** No numbers. Explain that every project is quoted on scope, frequency
   and how long access is kept, and that work is invoiced against a contract or purchase
   order. This is a trust signal for institutional buyers.
8. **Enquiry form.**

## Interactive examples — the most important part of the page

The site should be **visually striking and genuinely interactive**, not a brochure. A visitor
must be able to touch the product.

Build the page so these slot in as real embeds once content is cleared:

- **A live embedded twin.** Walk it, look around, switch to dollhouse, open the floor plan.
  Not a screenshot, not a video.
- **A ceiling toggle demo.** Open → closed → above-the-ceiling. Show duct and tray visible
  before burial. **This is the single most differentiating visual available** and no
  competitor's dollhouse can do it.
- **A before/after progression slider.** The same room on two dates.
- **A measurement demo.** Click two points, see a dimension appear with its accuracy label.
- **A 360 tour embed.**
- **A thermal overlay** shown pinned in place within a twin.

Until real permissioned examples exist, build these as **clearly-labelled placeholder embeds
with the correct interaction implemented**, so dropping in real content is a content change
rather than a rebuild.

## Design direction

- **Dark, technical, precise.** Deep near-black canvas, glass panels, hairline borders,
  restrained accent colour used only on interactive states — never as decorative fill.
- Type: clean sans for prose, monospaced uppercase for small labels and data.
- **Let the 3D be the visual.** The product is beautiful; the chrome should be quiet.
- **Motion with purpose** — reveal on scroll, smooth transitions between example states.
  Nothing gratuitous, nothing that delays interaction.
- **Mobile first and genuinely good on a phone.** A superintendent will open this on a job
  site in bright sun, one-handed, wearing gloves. Large touch targets, high contrast, fast.
- Accessible: real contrast ratios, keyboard navigable, alt text everywhere, respects
  reduced-motion preferences.

## Tone

Confident and specific. Written for someone who builds things and can tell when they are being
sold to. Concrete over adjectival — *"wall areas net of door and window openings, exported to
your estimator"* beats *"powerful measurement tools"*.

State limits honestly. A page that says what the deliverable does **not** do is more credible
to a professional than one that implies perfection, and honesty about accuracy is this
company's actual competitive position.

## Deliverable

1. **Full copy** for every section — headlines, body, calls to action, form labels.
2. **Page structure and component breakdown.**
3. **Design specification** — layout, spacing, type scale, colour roles, motion.
4. **Interactive example specs** — what each demo does, what it needs, and how it degrades
   before real content exists.
5. **A short list of what must be removed** from the current site.

Where a requirement is ambiguous, choose the option that **gets a contractor to enquire**
rather than the one that explains more. The site's job is to start a conversation, not to
close a sale.
