# vNext sharing

Phase 1 has one project/evidence share layer. It does not replace Site Walk deliverable shares, Digital Twin shares, Thermal shares, or generic deliverable tokens.

## Route

`/portal/[token]` is the existing branded deliverable viewer (`deliverable_access_tokens`). The vNext link is `/share/project/[token]`, beside `/share/twin/[token]` and `/share/thermal/[token]`. Legacy routes are unchanged.

The public URL is `APP_URL` from `lib/email.ts` (`NEXT_PUBLIC_APP_URL`, otherwise `https://slate360.ai`).

## Targets

**Project.** The link opens the project's current client-published portal. A later publish appears. An unpublish disappears. Turning a capability off removes that service from the link. Turning it back on does not publish an unpublished source. The token does not need to be recreated.

**Saved view.** The link opens that row's project, representation, source, date, and saved camera or view state. A newer published source does not replace it. If the saved source is unpublished, or its capability is removed, the link shows "This link is not available." The saved-view row stays. Deleting the saved view cascades the link, so the token stops resolving.

Thermal saved views are not created here. Thermal keeps `/share/thermal/[token]`.

## What a public project link shows

Overview, Explore, and History, and only when that section's capability is included.

Explore and History use the same publication-aware resolvers as the authenticated client, then drop Thermal. History drops item rows. Compare is available when Compare is included, without a Thermal side.

Items and Documents are omitted. Authenticated client access is not a persisted "share this file with anyone who has the URL" flag. Phase 1 does not invent one.

There is no owner UI, no QA, no publish control, no save, no question, and no account navigation. Preview as client stays an authenticated owner route and does not mint a token.

## Token

32–128 character random token. The public loader checks the format, then that the row exists, is not revoked, and is not expired. It then checks the project, the target, included capabilities, publication, and renderability. A failure is one sentence: "This link is not available." It does not say whether the project or source exists.

Anonymous roles cannot read `project_share_links`. Resolution and media go through the service-role server. Media routes also require the source's project to match the token, the capability to be included, and the source to be published. A saved-view token can stream only that saved source. An open is counted once, by `claim_project_share_open`, after the page is allowed to render. Asset requests do not increment it. The owner list calls that number Opens.

Revoke sets `is_revoked`. It does not delete the project, the saved view, or a publication, and it does not change authenticated client access. Expiration is a property of the link only.

Password protection is deferred. A weak gate was not added.

## Who can create a link

The operations owner, the same gate as `/vnext/ops`. Ordinary project members cannot. The owner page is `/vnext/ops/shares`.

Existing Thermal, Twin, and Site Walk links stay in their own tools. They are not copied into this table.

## Settings and Account

`/vnext/ops/settings` points at project scope, publication, and Shares. `/vnext/ops/account` shows the signed-in email. Neither page is a billing or settings product.
