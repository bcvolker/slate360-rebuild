"""Spawn a diag call on the deployed app and wait for it (the call keeps running server-side if this dies)."""
import json
import sys
import modal
fn = modal.Function.from_name("slate360-room213-detail-diag", sys.argv[1])
kwargs = json.loads(sys.argv[2])
call = fn.spawn(**kwargs)
print("call", call.object_id, flush=True)
res = call.get(timeout=6000)
json.dump(res, open(sys.argv[3], "w"), indent=1, default=str)
print("done", flush=True)
