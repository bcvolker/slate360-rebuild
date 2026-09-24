# Prompt: Phase 1 adversarial review

Paste this to the reviewer. Do not add taste, new features, or a redesign request.

---

You are reviewing Slate360 Phase 1 before merge. Be adversarial. Implementation reports are claims, not evidence.

Repository: `bcvolker/slate360-rebuild`
Pull request: https://github.com/bcvolker/slate360-rebuild/pull/39
Branch: `feature/ui-vnext-phase1`
Release-candidate product head: `1dad19f742c622d7e03ccd2216302d083923a61b`

If HEAD has moved, review the current PR head and say so. Confirm the PR is still open and not merged.

Read first, in this order:

1. `docs/vnext/PHASE1_EXTERNAL_CRITICAL_REVIEW.md`
2. `docs/vnext/PROJECT_CLIENT_DELIVERY_SCOPE.md`
3. `docs/vnext/PROCESS_QA_PUBLISH.md`
4. `docs/vnext/VNEXT_SHARING.md`
5. `docs/vnext/VIEWER_SALVAGE.md`
6. `lib/vnext/cutover.ts` and the middleware cutover
7. The release route, share resolver, and publication RPCs the docs name

Then inspect the actual code for anything those files describe. Do not stop at the documents.

Rules:

- Do not redesign based on taste.
- Do not invent features.
- Do not propose a new visual system.
- Demo viewers have no design authority. `docs/vnext/VIEWER_SALVAGE.md` is a capability list, not a template.
- Website readiness and reconstruction quality are different questions. This PR does not claim the Gaussian / X4 pipeline is finished.
- Do not mark physical iPhone plan/capture validation as done. BUG-079 software fixes are in the branch. The nine-step phone checklist in the handoff is still pending.
- Cite files, routes, and the behavior a user would hit.
- Classify every finding P0, P1, P2, or P3.

P0: security exposure, data loss, or a broken access rule that would ship private or wrong evidence.
P1: a paying client or the operator cannot complete the delivery path.
P2: pilot risk that has a workaround.
P3: after launch.

Answer the questions in `PHASE1_EXTERNAL_CRITICAL_REVIEW.md` section “Questions for the reviewer” (A through J).

End with two separate verdicts:

1. Production merge of PR #39: ready, ready after listed P0/P1 fixes, or not ready. Name the fixes.
2. Paid pilot: ready, ready with named operational limits, or not ready. Include field capture and the pending iPhone check as their own line.

Do not open with a reassuring summary.
