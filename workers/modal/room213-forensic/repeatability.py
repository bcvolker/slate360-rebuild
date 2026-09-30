import json, numpy as np, cv2
R = 'cp1/cp1'; P = json.load(open(f'{R}/prep.json'))
def gray(x): return cv2.cvtColor(np.ascontiguousarray(x, np.float32), cv2.COLOR_RGB2GRAY) * 255.0
def band(g, k): s = 2.0 ** k; return cv2.GaussianBlur(g, (0, 0), s / 2) - cv2.GaussianBlur(g, (0, 0), s)
def ncc(a, b, m): a, b = a[m] - a[m].mean(), b[m] - b[m].mean(); return float((a * b).mean() / (a.std() * b.std() + 1e-9))
def reg(mov, ref, lim=70):
    a, b = band(ref, 1) + band(ref, 2), band(mov, 1) + band(mov, 2)
    (dx, dy), _ = cv2.phaseCorrelate(a.astype(np.float32), b.astype(np.float32), cv2.createHanningWindow(a.shape[::-1], cv2.CV_32F))
    return (-dx, -dy) if np.hypot(dx, dy) <= lim else (0, 0)
def sh(i, dx, dy): return cv2.warpAffine(i, np.float32([[1, 0, dx], [0, 1, dy]]), i.shape[::-1], flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
K = 4; res = {}
for tn, T in P['targets'].items():
    rows = []
    for o in T['observations']:
        try: gt = gray(np.load(f"{R}/{tn}/{o['tag']}_train_face.npy"))
        except FileNotFoundError: continue
        adj = [gray(np.load(f"{R}/{tn}/adj/{o['tag']}_d{d:+d}.npy")) for d in (-1, 1) if __import__('os').path.exists(f"{R}/{tn}/adj/{o['tag']}_d{d:+d}.npy")]
        if not adj: continue
        cy, cx = int(o['face_px'][1] - o['face_bbox'][1]), int(o['face_px'][0] - o['face_bbox'][0]); H = 56
        m = np.zeros(gt.shape, bool); m[max(8, cy - H):cy + H, max(8, cx - H):cx + H] = True
        sharp = lambda g: float(np.abs(cv2.Laplacian(cv2.GaussianBlur(g, (0, 0), 0.8), cv2.CV_32F))[m].mean())
        row_sharp = [sharp(gt)] + [sharp(a) for a in adj]
        adj = [sh(a, *reg(a, gt)) for a in adj]
        Rk = np.mean([[ncc(band(gt, k), band(a, k), m) for k in range(K)] for a in adj], 0)
        row = {"tag": o['tag'], "grp": "CLOSE" if o['px_per_mm_train'] >= 0.9 else ("FAR" if o['px_per_mm_train'] <= 0.55 else "MID"), "px_mm": o['px_per_mm_train'], "R_adjacent": Rk, "sharp_trained_vs_neighbours": row_sharp[0] / np.mean(row_sharp[1:])}
        for M in ("A", "Aplus"):
            rd = cv2.imread(f"{R}/{tn}/{M}/{o['render_view']}_face_crop.png", 0)
            if rd is None or rd.shape != gt.shape: continue
            rd = rd.astype(np.float32); rd = sh(rd, *reg(rd, gt, 3 if M == "A" else 40))
            Mk = np.mean([[ncc(band(rd, k), band(a, k), m) for k in range(K)] for a in adj], 0)
            Ek = [band(rd, k)[m].std() / (band(gt, k)[m].std() * np.sqrt(max(Rk[k], 1e-3)) + 1e-9) for k in range(K)]
            row[M] = {"ncc_vs_neighbour": Mk, "retained_corr": Mk / np.sqrt(np.clip(Rk, 1e-3, None)), "energy_vs_repeatable": np.array(Ek)}
        rows.append(row)
    res[tn] = rows
    for g in ("CLOSE", "FAR"):
        rr = [r for r in rows if r['grp'] == g]
        if not rr: continue
        med = lambda f: np.round(np.median([f(r) for r in rr], 0), 2).tolist()
        print(f"{tn} {g} n={len(rr)} px/mm {np.median([r['px_mm'] for r in rr]):.2f}  (bands 1-2/2-4/4-8/8-16 train px)")
        print(f"   trained frame sharper than its neighbours by x{np.median([r['sharp_trained_vs_neighbours'] for r in rr]):.2f} (sharpest-of-3 selection)")
        print(f"   neighbour repeatability R      {med(lambda r: r['R_adjacent'])}  -> sqrt(R) = ceiling for a noise-free render {med(lambda r: np.sqrt(np.clip(r['R_adjacent'], 0, None)))}")
        for M in ("A", "Aplus"):
            if all(M in r for r in rr):
                print(f"   {M:5s} render vs never-trained neighbour {med(lambda r: r[M]['ncc_vs_neighbour'])}  retained {med(lambda r: r[M]['retained_corr'])}  energy/repeatable {med(lambda r: r[M]['energy_vs_repeatable'])}")
