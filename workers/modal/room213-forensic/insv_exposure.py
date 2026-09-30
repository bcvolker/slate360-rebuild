import struct, sys, json, numpy as np
def rec(path, want):
    f = open(path, 'rb'); f.seek(0, 2); n = f.tell(); f.seek(n - 72); h = f.read(72); extra = struct.unpack('<I', h[32:36])[0]
    f.seek(n - extra); blob = f.read(extra); off = extra - 72; idx = blob[off - 256:off - 6]
    ents = {}
    for i in range(len(idx) - 9):
        rid, fmt, size, o = struct.unpack('<BBII', idx[i:i + 10])
        if rid and size and 0 <= o and o + size <= extra:
            if rid == 4:
                if size % 16: continue
                e = np.frombuffer(blob[o:o + size], dtype=[('t', '<u8'), ('e', '<f8')])['e']
                if not (np.all(e > 1e-5) and np.all(e < 1)): continue
            ents.setdefault(rid, (size, o))
    return {k: blob[o:o + s] for k, (s, o) in ents.items() if k in want}, sorted((k, s) for k, (s, o) in ents.items())
out = {}
for p in sys.argv[1:]:
    r, ents = rec(p, {4})
    a = np.frombuffer(r[4][: len(r[4]) // 16 * 16], dtype=[('t', '<u8'), ('e', '<f8')])
    t = (a['t'] - a['t'][0]) / 1000.0; e = a['e']
    name = p.split('/')[-1][:-5]; out[name] = {"records": ents, "n": len(e), "t_span_s": float(t[-1]) / 1000, "exposure_s_p10_p50_p90": [float(np.percentile(e, q)) for q in (10, 50, 90)],
                                             "one_over_median": round(1 / float(np.median(e)), 1), "min_max": [float(e.min()), float(e.max())],
                                             "by_5s": [(round(float(tt) / 1000, 1), round(1 / float(ee), 1)) for tt, ee in zip(t[::300], e[::300])]}
    print(name, json.dumps(out[name]))
json.dump(out, open('exposure.json', 'w'), indent=1)
