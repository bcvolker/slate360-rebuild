import json, sys, time
import modal

cid = open(sys.argv[1]).read().strip()
out = sys.argv[2]
call = modal.FunctionCall.from_id(cid)
t0 = time.time()
while True:
    try:
        res = call.get(timeout=0)
    except TimeoutError:
        print(f"running {int(time.time()-t0)}s", flush=True)
        time.sleep(120)
        continue
    except Exception as exc:  # remote failure
        print(f"FAILED {type(exc).__name__}: {str(exc)[:400]}", flush=True)
        sys.exit(1)
    json.dump(res, open(out, "w"), indent=1)
    print("DONE " + json.dumps({k: v for k, v in res.items() if not k.startswith("per_")})[:1500], flush=True)
    break
