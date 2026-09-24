"""Logical run / attempt / active-owner lease on R2 conditional writes. Fail-closed, but recoverable.

Keys under runs/<runId>/:
  RUN.json          created once (If-None-Match) — the logical run exists; never deleted.
  OWNER.json        the active attempt's lease {attemptId, callId, heartbeat}; replaced only by conditional write
                    (If-Match on the ETag we read) so two workers cannot both take it.
  COMPLETED.json    terminal success; once present no attempt may start.
A new attempt may take OWNER only if (a) there is none, or (b) the previous owner is PROVEN inactive: its Modal
call is finished (checked through `is_call_finished`) AND its heartbeat is older than `stale_s`. Stale locks are
never deleted blindly."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone

from ids import check_id


class LockRefused(RuntimeError):
    pass


def _now() -> float:
    return time.time()


class RunLock:
    def __init__(self, store, root: str, run_id: str, attempt_id: str, call_id: str, is_call_finished,
                 stale_s: float = 600.0):
        self.store = store; self.root = root.rstrip("/"); self.run = check_id(run_id, "runId")
        self.attempt = check_id(attempt_id, "attemptId"); self.call_id = call_id
        self.is_call_finished = is_call_finished; self.stale_s = stale_s; self.etag = None

    def key(self, name: str) -> str:
        return f"{self.root}/runs/{self.run}/{name}"

    def _lease(self) -> bytes:
        return json.dumps({"runId": self.run, "attemptId": self.attempt, "callId": self.call_id,
                           "heartbeat": _now(), "utc": datetime.now(timezone.utc).isoformat()}).encode()

    def acquire(self) -> dict:
        if self.store.get(self.key("COMPLETED.json")) is not None:
            raise LockRefused("run already completed; no further attempts")
        self.store.put_if_absent(self.key("RUN.json"), json.dumps({"runId": self.run}).encode())
        etag = self.store.put_if_absent(self.key("OWNER.json"), self._lease())
        if etag is not None:
            self.etag = etag
            return {"acquired": True, "takeover": None}
        cur = self.store.get(self.key("OWNER.json"))
        if cur is None:
            raise LockRefused("owner lease vanished during acquire; retry later")
        body, cur_etag = cur
        prev = json.loads(body)
        if prev.get("attemptId") == self.attempt:
            raise LockRefused("this attempt id already owns (or owned) the run; use a new attempt id")
        age = _now() - float(prev.get("heartbeat", 0))
        finished = self.is_call_finished(prev.get("callId"))
        # Proof of inactivity is the platform saying the owner's call has ENDED. A stale heartbeat alone is only
        # a symptom (the owner may be stuck in a long upload), so it never suffices on its own.
        if finished is not True:
            raise LockRefused(f"previous owner {prev.get('attemptId')} not proven inactive "
                              f"(call finished={finished}, heartbeat age={age:.0f}s)")
        etag = self.store.put_if_match(self.key("OWNER.json"), self._lease(), cur_etag)
        if etag is None:
            raise LockRefused("lost the takeover race")
        self.etag = etag
        return {"acquired": True, "takeover": {"from": prev.get("attemptId"), "heartbeatAgeS": round(age)}}

    def heartbeat(self) -> None:
        etag = self.store.put_if_match(self.key("OWNER.json"), self._lease(), self.etag)
        if etag is None:
            raise LockRefused("lease was taken by another attempt")
        self.etag = etag

    def complete(self, decision: dict) -> None:
        if self.store.put_if_absent(self.key("COMPLETED.json"), json.dumps(decision).encode()) is None:
            raise LockRefused("COMPLETED already exists")


def callback_effect(current_status: str | None) -> dict:
    """A terminal callback (first delivery or any retry) records status only. It never starts a trainer."""
    terminal = current_status in ("completed", "failed", "cancelled", "rejected")
    return {"spawn": False, "retrain": False, "idempotent": terminal, "update": not terminal}


class R2Store:
    """Conditional writes on R2 (S3 API). Returns the ETag on success, None when the precondition failed."""

    def __init__(self, s3, bucket: str):
        self.s3 = s3; self.bucket = bucket

    def _cond(self, **kw):
        from botocore.exceptions import ClientError
        try:
            return self.s3.put_object(Bucket=self.bucket, **kw)["ETag"]
        except ClientError as exc:
            status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            code = exc.response.get("Error", {}).get("Code", "")
            if status in (409, 412) or code in {"PreconditionFailed", "ConditionalRequestConflict"}:
                return None
            raise

    def put_if_absent(self, key: str, body: bytes):
        return self._cond(Key=key, Body=body, IfNoneMatch="*")

    def put_if_match(self, key: str, body: bytes, etag: str):
        return self._cond(Key=key, Body=body, IfMatch=etag)

    def get(self, key: str):
        from botocore.exceptions import ClientError
        try:
            o = self.s3.get_object(Bucket=self.bucket, Key=key)
            return o["Body"].read(), o["ETag"]
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"NoSuchKey", "404", "NotFound"}:
                return None
            raise


class MemoryStore:
    """Test double with the same conditional semantics."""

    def __init__(self):
        self.d: dict[str, tuple[bytes, str]] = {}; self.n = 0

    def _tag(self):
        self.n += 1
        return f'"e{self.n}"'

    def put_if_absent(self, key, body):
        if key in self.d:
            return None
        t = self._tag(); self.d[key] = (body, t); return t

    def put_if_match(self, key, body, etag):
        if key not in self.d or self.d[key][1] != etag:
            return None
        t = self._tag(); self.d[key] = (body, t); return t

    def get(self, key):
        return self.d.get(key)
