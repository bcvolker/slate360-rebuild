# Ops Continuity Files

These files are the machine-readable continuity layer for implementation sessions.

## Files

- `module-manifest.json`
  - Canonical module list with route, gate, spec file, status, key components, and API surface.
- `bug-registry.json`
  - Active bug inventory with root cause summary and verification checks.
- `release-gates.json`
  - Required/optional release checks plus bug severity gate policy.
- `schemas/*.schema.json`
  - JSON Schema references for structure validation.

## Workflow

1. Update `module-manifest.json` when routes/gates/status/components change.
2. Update `bug-registry.json` when a bug is discovered/fixed/reclassified.
3. Keep `release-gates.json` aligned with what CI and local release validation require.
4. Run `npm run verify:release` before final handoff for production-bound changes.

## Notes

- `verify:release` runs checks in sequence and fails on required check errors.
- Bug gate currently blocks only `critical` bugs by default while high-severity refactors are in flight.
- Tighten the gate once monolith decomposition and high-priority runtime debt are closed.
