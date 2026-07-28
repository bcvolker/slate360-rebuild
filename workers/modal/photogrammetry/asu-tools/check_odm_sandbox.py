"""Non-blocking ODM sandbox status: poll() + exec a status command inside
the sandbox (its stream terminates, unlike the live stdout of the run)."""
import sys

import modal

sb = modal.Sandbox.from_id(sys.argv[1] if len(sys.argv) > 1
                           else "sb-scQIYXguaMy7qXxR9HU0ma")
state = sb.poll()
print("state:", "RUNNING" if state is None else f"EXITED {state}")
if state is None:
    p = sb.exec("bash", "-c",
                "echo IMAGES $(ls /data/work/odm/asu/images 2>/dev/null | wc -l);"
                "ls /data/work/odm/asu 2>/dev/null | tr '\\n' ' '; echo;"
                "tail -c 2000 /data/work/odm/asu/log.json 2>/dev/null | tail -c 400; echo;"
                "ps aux --sort=-%cpu 2>/dev/null | head -4")
    print(p.stdout.read())
