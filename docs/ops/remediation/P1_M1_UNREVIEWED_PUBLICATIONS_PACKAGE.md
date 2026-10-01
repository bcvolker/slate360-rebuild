# P1-M1 — Unreviewed backfill publications: reversible remediation package

**Status: READ-ONLY. Nothing in this document has been executed against production.**
Prepared for Brian/Astra approval before any write.

## Critical finding — read this before approving anything

For **every one of the 58 rows below**, `sibling_reviewed_active_count = 0`: there is **no other
active, reviewed publication** (`published_by IS NOT NULL`, `revoked_at IS NULL`) for the same
project + representation. That means these are **not stale legacy rows sitting behind real
reviewed content** — for these 4 projects, they are currently **the entire client-visible content**
for Reality (and, for AOB205, Plans). **AOB205 — ASU is a real, active client-facing project.**

Running the revoke SQL below exactly as written will make Reality (and AOB205's one Plans sheet)
**disappear from the client portal** for all 4 projects until an operator explicitly reviews and
republishes a source for each. No saved view or shared link currently points at any of these 58
source rows (checked directly — zero matches), so no already-distributed client link breaks, but
the *default* Explore view for these projects will go from "shows something" to "shows nothing"
the moment this runs.

This is not a reason to skip the fix — auto-published, unreviewed content is the actual defect —
but it means **this should not be run silently**. Recommended sequencing: either (a) have the
operator review-and-republish at least one source per project/representation in the same session
right after revoking, or (b) run this only for projects where that's already been done, or (c)
explicitly accept the client-facing gap for AOB205 for whatever window it takes to review.

## Snapshot summary

- **58** active rows with `published_by IS NULL AND revoked_at IS NULL`, captured at query time below.
- All 58 share the identical `published_at = 2026-09-23 00:43:19.310473+00` — a single bulk
  backfill, not organic individual publishes.
- By representation: **reality 55, geometry 2, plans 1**.
- By project: **Quick Scans** 38 (reality 37 + geometry 1), **AOB205 — ASU** 11 reality + 1 plans,
  **Phase1 Mavic3E mission 0015** 5 reality + 1 geometry, **HouseWalk (engineering fixture)** 1 reality.
- **0 of 58** have any `project_source_reviews` row (approved or rejected) at all.
- **0 of 58** have a reviewed sibling publication that would remain visible after revoke.
- **0 of 58** are referenced by any `project_saved_views` row.
- No sibling-auto-revoked-by-the-old-exclusive-publish-function rows were found (nothing needs
  restoring as a side effect of this fix).

## Exact pre-change snapshot (all 58 rows, `id | project_id | project_name | representation | source_id | published_at | published_by | revoked_at | revoked_by`)

```
74639af0-8414-4b30-9657-4871d689ed18 | 08ccef1b-6c3f-4197-8023-356c2ef00bef | HouseWalk (engineering fixture) | reality  | 9c2892b1-2a9b-4241-9c40-148e42390fd8 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
8ce14b2b-0efd-469f-9516-59c8ea3c3dd6 | 1acd1aca-12d0-4bcc-8b04-d2d8a9f618fc | Phase1 Mavic3E mission 0015     | geometry | a45b9f8b-5eb4-4615-81e6-09842d4c1d1e | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
b860f862-bfa8-4191-b6e1-a9ae80d3f63d | 1acd1aca-12d0-4bcc-8b04-d2d8a9f618fc | Phase1 Mavic3E mission 0015     | reality  | 719fe8f9-143d-4df7-8ad8-3cad657a74c1 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
22333661-7e5a-4a3a-9fe2-bf59cf09077e | 1acd1aca-12d0-4bcc-8b04-d2d8a9f618fc | Phase1 Mavic3E mission 0015     | reality  | 30860783-3273-4073-9816-c4dce5e2db23 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
5c4c3276-7349-4c91-87c8-b1a229bbf623 | 1acd1aca-12d0-4bcc-8b04-d2d8a9f618fc | Phase1 Mavic3E mission 0015     | reality  | 3f75e2a2-90f8-40fa-8c3f-5bd65182ece8 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
3f6bf8fe-3732-4792-98f9-64bdec202ae0 | 1acd1aca-12d0-4bcc-8b04-d2d8a9f618fc | Phase1 Mavic3E mission 0015     | reality  | ef330d9a-fd97-4c42-9182-52592c374e2e | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
d9b756d8-d773-455d-8217-e597f8b3ee77 | 1acd1aca-12d0-4bcc-8b04-d2d8a9f618fc | Phase1 Mavic3E mission 0015     | reality  | 9381f062-0d41-4add-80a6-ad39f17ffc36 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
48e51743-321d-41eb-b5cc-46bb2ba5b775 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | geometry | 1daa8ed7-0e0d-432f-b0c3-59b9567c3ce6 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
5f5f61b8-a697-424a-ad96-9e51bac9fdec | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 8969556e-b38a-40b8-9f5f-78f6aa023aa0 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
7d011f2c-7427-49c4-8d27-190edb3be727 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 8f77412a-8a7b-4fb4-877c-f1ec6884af7e | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
f0dbc8e2-b87b-47d2-a1de-88bf63d803e1 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | c75c53d1-48eb-4cc2-92e5-e3209f5ed8d8 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
458a83b4-8958-4779-9211-4b28629b208e | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 8b9eb52b-000e-47ef-9ad8-db3a346532e8 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
d4ff3478-5c10-4913-b80b-a0b838b76e46 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 797ac682-894f-4b2e-ae11-5cfdc80f0e6f | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
046771e1-a1dc-4521-8154-6ef4f6fab38a | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 36789c10-4370-4612-ba32-c22d97aea446 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
abc19e28-e0db-4cb0-b4f5-466619e22c29 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 8a5baf57-308c-499e-b08d-18f374bf9923 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
704df1a0-d631-4545-ac40-27b227ddfad2 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 62e7f39f-551e-446a-98d8-8603c99fa8ec | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
2b2d33f8-682a-492e-bb7b-46e4595cab5f | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 1ff1f774-4823-4308-8ccf-ab3e407fc89e | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
71212690-edcb-4147-99b0-0fe7642d087b | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 48716882-961d-4a0b-9ae9-c47f92d37337 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
ff92fffd-fcbc-413d-ae35-1c7ceb34fff6 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 7961e39d-22af-43db-ba81-391bdafd76ba | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
bf101ffa-a417-4ddb-a591-c0ac176b6643 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 24156632-4247-4449-baa0-5b73c9052e6d | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
f2cac34f-e2f6-487d-acec-8c812b550c89 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 0bb099a0-1eaf-475a-8bb1-80aa553152dd | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
5a0b31c9-d337-4cc2-92d6-3e6e05e2b03b | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 8e59c5dd-1c56-4669-bec5-2009040a6493 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
d147e654-b4ea-41e3-a6bb-9be9baba8b5b | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 7d4e5abd-c05f-4861-ae2a-e25831e35218 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
5f9ef672-e6c0-48e7-aa9a-923113c6d04a | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 841c7669-044a-4fdf-915d-cc3458441703 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
b4bfa268-46c5-43cc-807c-19f03612f1ab | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 0ef600bc-c4f9-4b6c-8105-f974d01a7d18 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
e0840448-fd21-4804-badc-333fabe2a451 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 19a555e2-399e-42dc-bc88-347ba9f1705c | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
594f9954-520e-44e9-b747-fbe8af6b0edf | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 923bd3f6-551e-413e-8aca-8164b7a06e89 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
b1711e11-af07-45cd-a8d3-58684e4cd4c5 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | ceedec3c-e742-427e-a968-81b0f570129c | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
9eaa5ca3-35c2-44c3-b2ad-ead0750fafa0 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 3d2c9eeb-81fd-447d-8ee5-3b06874078ee | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
cc43029a-3cec-4d7b-b558-338dbd3d4853 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | b93a6077-85ae-4372-99b3-29f30dd46b1a | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
19be9c39-03db-4137-94d1-a89f84434cfd | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | dd02827f-227b-4762-bb8c-50866cc76d59 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
1c60a0b4-7025-4089-8a35-ab72c11c9134 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 20057b10-4850-4d6c-ac80-dd8cb84330e1 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
546520a1-4547-4498-9a17-8a87c1f41e8f | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 6fec9554-2f90-4b9d-8718-ce6ffa77d689 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
bb56622e-a56b-4d92-99b1-d3211d2e3e56 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 8a56df63-c56d-4735-809c-ee4ba6bedbf0 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
cb3588d1-31ed-40f2-abe8-c5fd92a18465 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | cbdecde1-930d-49d7-98e9-bb696e24d372 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
c029d50a-3de5-4908-90e7-7b990325f168 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | d3bb3957-6517-4f7e-a1f0-0abcea170f93 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
d29c688d-53ed-4a2c-a847-3dc8defda602 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 237a62ba-5d65-4cb9-92ea-4d5b0ea5c983 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
6e4d2d01-86c8-4f89-8654-900bf57e24bf | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 9f446883-a285-4e4e-b1a5-de4e6bd89c6c | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
605814ec-cec5-4055-a50e-a5d234ecb129 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 51336949-258f-492d-8fdd-b50ff08ff7b7 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
e66394e6-3079-439d-bb69-9c37e8855e9a | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | b78eba18-a4b3-4787-8eb3-539805cbd81e | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
766685f1-25f8-46d5-bda2-80b50b90a273 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 95a859cd-61a2-4d35-bb0d-bd750ed13837 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
2aaf37e1-138b-413a-9de4-de9c37d3ec78 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 2af836b4-c874-44b2-95b0-3a2164081f33 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
a43a7bd0-c0cd-4c1a-98f3-85eb78ae89cd | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 1aaf409a-758f-4b9e-87c1-be8b7034c1f9 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
beb30eed-df08-46c8-a445-33ad2c7f6770 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | fca256fe-9a51-42ef-885b-cb3f3bf46719 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
5f3eade3-231a-4eb9-a2de-42834487aa3c | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 564adedc-6e88-4067-b799-2cf2881a1ff8 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
591f0b4e-bcd8-420a-a3c3-cb31ae22dd43 | 3f313844-4ab4-400a-9b95-e4a8c4a6f7f5 | Quick Scans                     | reality  | 28b3fcd4-9c18-45f9-9ffc-bbb9b6acf5db | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
e215055f-56cb-4d4a-a063-9fd8d4f224ec | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | plans    | b85f9c58-a235-49a5-984f-62de857c9408 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
8768e658-0d69-42d6-8221-1d5a11cf7d72 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | 618f3da3-12be-4e85-82ce-081a2cd2a7d7 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
e3a8928a-75d7-48b0-aba9-c1d84a721844 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | b24faae8-35c6-42cf-a920-2cd9c73d4ab4 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
a2cf9c2a-252e-42ef-a0d9-93bfff9c81e4 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | b85f4732-0643-4e08-abda-347fd48ef02d | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
4bc59595-7eb9-409d-8054-2fd8ef30a0b8 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | c3f78a0f-a03f-4345-b9e2-89035399847a | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
664661fa-ebc3-42bc-9683-34caaf484b55 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | f8e905b7-786a-44a3-aa79-480aed9a5f93 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
6f187403-3492-468d-ace9-0607595bdac0 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | acea63b6-737b-4720-909b-0f2356070185 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
7ba3917c-00fc-418c-b359-7b91d7cb442d | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | 5e0b9735-0567-41b7-b46e-05633f1b6091 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
985139aa-fc89-4dde-8323-ecb0102048e7 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | 2b458ef1-7145-4b0a-b252-47811c1c8003 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
082b8347-e5fe-4d99-80b0-6b084034ece4 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | 12898d77-4ae3-4700-8745-8c04d598b90a | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
319c4de1-3a8d-42c9-a952-fcc180cafd81 | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | 431a854b-16a2-4b92-9185-c214b767b8b0 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
f82a19cd-83eb-4a3d-ad26-ae4898ca888e | f3f23c68-5510-4f78-ae12-3ea978340f6a | AOB205 — ASU                    | reality  | db94418d-4ddd-4515-99e0-51d4ec9608c1 | 2026-09-23 00:43:19.310473+00 | NULL | NULL | NULL
```

## Exact ID-scoped revoke SQL (NOT executed — proposed only)

Scoped to the exact 58 IDs captured above (not the general `WHERE published_by IS NULL` predicate),
so it cannot accidentally catch a row published after this snapshot was taken:

```sql
UPDATE public.project_source_publications
SET revoked_at = now(),
    revoked_by = NULL
WHERE id IN (
  '046771e1-a1dc-4521-8154-6ef4f6fab38a','082b8347-e5fe-4d99-80b0-6b084034ece4','19be9c39-03db-4137-94d1-a89f84434cfd','1c60a0b4-7025-4089-8a35-ab72c11c9134','22333661-7e5a-4a3a-9fe2-bf59cf09077e','2aaf37e1-138b-413a-9de4-de9c37d3ec78','2b2d33f8-682a-492e-bb7b-46e4595cab5f','319c4de1-3a8d-42c9-a952-fcc180cafd81','3f6bf8fe-3732-4792-98f9-64bdec202ae0','458a83b4-8958-4779-9211-4b28629b208e','48e51743-321d-41eb-b5cc-46bb2ba5b775','4bc59595-7eb9-409d-8054-2fd8ef30a0b8','546520a1-4547-4498-9a17-8a87c1f41e8f','591f0b4e-bcd8-420a-a3c3-cb31ae22dd43','594f9954-520e-44e9-b747-fbe8af6b0edf','5a0b31c9-d337-4cc2-92d6-3e6e05e2b03b','5c4c3276-7349-4c91-87c8-b1a229bbf623','5f3eade3-231a-4eb9-a2de-42834487aa3c','5f5f61b8-a697-424a-ad96-9e51bac9fdec','5f9ef672-e6c0-48e7-aa9a-923113c6d04a','605814ec-cec5-4055-a50e-a5d234ecb129','664661fa-ebc3-42bc-9683-34caaf484b55','6e4d2d01-86c8-4f89-8654-900bf57e24bf','6f187403-3492-468d-ace9-0607595bdac0','704df1a0-d631-4545-ac40-27b227ddfad2','71212690-edcb-4147-99b0-0fe7642d087b','74639af0-8414-4b30-9657-4871d689ed18','766685f1-25f8-46d5-bda2-80b50b90a273','7ba3917c-00fc-418c-b359-7b91d7cb442d','7d011f2c-7427-49c4-8d27-190edb3be727','8768e658-0d69-42d6-8221-1d5a11cf7d72','8ce14b2b-0efd-469f-9516-59c8ea3c3dd6','985139aa-fc89-4dde-8323-ecb0102048e7','9eaa5ca3-35c2-44c3-b2ad-ead0750fafa0','a2cf9c2a-252e-42ef-a0d9-93bfff9c81e4','a43a7bd0-c0cd-4c1a-98f3-85eb78ae89cd','abc19e28-e0db-4cb0-b4f5-466619e22c29','b1711e11-af07-45cd-a8d3-58684e4cd4c5','b4bfa268-46c5-43cc-807c-19f03612f1ab','b860f862-bfa8-4191-b6e1-a9ae80d3f63d','bb56622e-a56b-4d92-99b1-d3211d2e3e56','beb30eed-df08-46c8-a445-33ad2c7f6770','bf101ffa-a417-4ddb-a591-c0ac176b6643','c029d50a-3de5-4908-90e7-7b990325f168','cb3588d1-31ed-40f2-abe8-c5fd92a18465','cc43029a-3cec-4d7b-b558-338dbd3d4853','d147e654-b4ea-41e3-a6bb-9be9baba8b5b','d29c688d-53ed-4a2c-a847-3dc8defda602','d4ff3478-5c10-4913-b80b-a0b838b76e46','d9b756d8-d773-455d-8217-e597f8b3ee77','e0840448-fd21-4804-badc-333fabe2a451','e215055f-56cb-4d4a-a063-9fd8d4f224ec','e3a8928a-75d7-48b0-aba9-c1d84a721844','e66394e6-3079-439d-bb69-9c37e8855e9a','f0dbc8e2-b87b-47d2-a1de-88bf63d803e1','f2cac34f-e2f6-487d-acec-8c812b550c89','f82a19cd-83eb-4a3d-ad26-ae4898ca888e','ff92fffd-fcbc-413d-ae35-1c7ceb34fff6'
)
AND published_by IS NULL
AND revoked_at IS NULL;
-- The trailing AND clauses are a defensive no-op given the snapshot above, kept so this statement
-- is still safe to re-run if any of these 58 rows were independently reviewed/republished
-- between snapshot and execution (it would then simply not touch that row).
```

## Exact rollback SQL (restores the exact pre-change state from the snapshot)

Every one of the 58 rows' pre-change state was `revoked_at = NULL, revoked_by = NULL` (none of
them were ever revoked before). Rollback is therefore exact and deterministic — restore those two
columns to NULL for the same 58 IDs, not "manually republish":

```sql
UPDATE public.project_source_publications
SET revoked_at = NULL,
    revoked_by = NULL
WHERE id IN (
  '046771e1-a1dc-4521-8154-6ef4f6fab38a','082b8347-e5fe-4d99-80b0-6b084034ece4','19be9c39-03db-4137-94d1-a89f84434cfd','1c60a0b4-7025-4089-8a35-ab72c11c9134','22333661-7e5a-4a3a-9fe2-bf59cf09077e','2aaf37e1-138b-413a-9de4-de9c37d3ec78','2b2d33f8-682a-492e-bb7b-46e4595cab5f','319c4de1-3a8d-42c9-a952-fcc180cafd81','3f6bf8fe-3732-4792-98f9-64bdec202ae0','458a83b4-8958-4779-9211-4b28629b208e','48e51743-321d-41eb-b5cc-46bb2ba5b775','4bc59595-7eb9-409d-8054-2fd8ef30a0b8','546520a1-4547-4498-9a17-8a87c1f41e8f','591f0b4e-bcd8-420a-a3c3-cb31ae22dd43','594f9954-520e-44e9-b747-fbe8af6b0edf','5a0b31c9-d337-4cc2-92d6-3e6e05e2b03b','5c4c3276-7349-4c91-87c8-b1a229bbf623','5f3eade3-231a-4eb9-a2de-42834487aa3c','5f5f61b8-a697-424a-ad96-9e51bac9fdec','5f9ef672-e6c0-48e7-aa9a-923113c6d04a','605814ec-cec5-4055-a50e-a5d234ecb129','664661fa-ebc3-42bc-9683-34caaf484b55','6e4d2d01-86c8-4f89-8654-900bf57e24bf','6f187403-3492-468d-ace9-0607595bdac0','704df1a0-d631-4545-ac40-27b227ddfad2','71212690-edcb-4147-99b0-0fe7642d087b','74639af0-8414-4b30-9657-4871d689ed18','766685f1-25f8-46d5-bda2-80b50b90a273','7ba3917c-00fc-418c-b359-7b91d7cb442d','7d011f2c-7427-49c4-8d27-190edb3be727','8768e658-0d69-42d6-8221-1d5a11cf7d72','8ce14b2b-0efd-469f-9516-59c8ea3c3dd6','985139aa-fc89-4dde-8323-ecb0102048e7','9eaa5ca3-35c2-44c3-b2ad-ead0750fafa0','a2cf9c2a-252e-42ef-a0d9-93bfff9c81e4','a43a7bd0-c0cd-4c1a-98f3-85eb78ae89cd','abc19e28-e0db-4cb0-b4f5-466619e22c29','b1711e11-af07-45cd-a8d3-58684e4cd4c5','b4bfa268-46c5-43cc-807c-19f03612f1ab','b860f862-bfa8-4191-b6e1-a9ae80d3f63d','bb56622e-a56b-4d92-99b1-d3211d2e3e56','beb30eed-df08-46c8-a445-33ad2c7f6770','bf101ffa-a417-4ddb-a591-c0ac176b6643','c029d50a-3de5-4908-90e7-7b990325f168','cb3588d1-31ed-40f2-abe8-c5fd92a18465','cc43029a-3cec-4d7b-b558-338dbd3d4853','d147e654-b4ea-41e3-a6bb-9be9baba8b5b','d29c688d-53ed-4a2c-a847-3dc8defda602','d4ff3478-5c10-4913-b80b-a0b838b76e46','d9b756d8-d773-455d-8217-e597f8b3ee77','e0840448-fd21-4804-badc-333fabe2a451','e215055f-56cb-4d4a-a063-9fd8d4f224ec','e3a8928a-75d7-48b0-aba9-c1d84a721844','e66394e6-3079-439d-bb69-9c37e8855e9a','f0dbc8e2-b87b-47d2-a1de-88bf63d803e1','f2cac34f-e2f6-487d-acec-8c812b550c89','f82a19cd-83eb-4a3d-ad26-ae4898ca888e','ff92fffd-fcbc-413d-ae35-1c7ceb34fff6'
);
```

Rollback is safe to run at any later time — it does not depend on execution timing, since it sets
the columns to their known original value for these exact rows rather than to "now minus X."

## Expected post-change counts

- Before: `SELECT count(*) FROM project_source_publications WHERE published_by IS NULL AND revoked_at IS NULL;` → 58
- After revoke: same query → **0** (assuming no new unreviewed backfill runs between now and execution)
- After revoke, per project: Reality/Geometry/Plans queries against `project_source_publications`
  for Quick Scans, AOB205 — ASU, Phase1 Mavic3E mission 0015, and HouseWalk will return **0 active
  rows** for the affected representations — confirmed above to mean Explore's default source
  resolution (post P1-P1 fix) returns nothing, not a fallback to an older reviewed source, because
  none exists.
- Rollback verification: re-run the "before" query → 58 again, with `revoked_at`/`revoked_by` back
  to NULL for exactly these 58 ids.
