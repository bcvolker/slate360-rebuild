r"""glTF 2.0 requires the JSON chunk to be padded to 4 bytes with SPACES (0x20);
only the BIN chunk pads with zeros. My writer used \x00 for both, so TextDecoder
handed JSON.parse trailing NUL characters and it threw
"Unexpected non-whitespace character after JSON".

Rewrites the chunk padding in place. Structural only -- no geometry touched.
"""
import struct
import sys

path = sys.argv[1]
raw = open(path, "rb").read()
magic, ver, total = struct.unpack("<4sII", raw[:12])
assert magic == b"glTF" and ver == 2, (magic, ver)

off = 12
chunks = []
while off < len(raw):
    clen, ctype = struct.unpack("<I4s", raw[off:off + 8])
    body = raw[off + 8:off + 8 + clen]
    chunks.append((ctype, body))
    off += 8 + clen + ((4 - clen % 4) % 4)

out = b""
for ctype, body in chunks:
    if ctype == b"JSON":
        # the stored length already includes the bad \x00 padding, so strip it
        # back to the real JSON before re-padding with spaces
        body = body.rstrip(b"\x00")
    pad = (4 - len(body) % 4) % 4
    fill = b" " if ctype == b"JSON" else b"\x00"
    body2 = body + fill * pad
    out += struct.pack("<I4s", len(body2), ctype) + body2
    print(ctype.decode(), len(body), "-> padded", len(body2),
          "with", repr(fill))

glb = struct.pack("<4sII", b"glTF", 2, 12 + len(out)) + out
open(path, "wb").write(glb)
print("rewrote", path, len(glb), "bytes")
