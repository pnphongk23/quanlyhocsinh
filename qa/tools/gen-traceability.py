#!/usr/bin/env python3
"""Sinh qa/traceability.md từ qa/testcases/*.md. Giữ nguyên cột flow/trạng thái đã điền trong traceability.md cũ."""
import re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
old = {}
tfile = root / "traceability.md"
if tfile.exists():
    for line in tfile.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 7 and cells[0].startswith("TC-"):
            old[cells[0]] = cells[4:]

def load_status(plat):
    d = {}
    f = root / "maestro" / plat / "status.tsv"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            c = line.split("\t")
            if len(c) >= 3 and c[0].startswith("TC-"):
                d[c[0]] = (c[1], c[2])
    return d
st_ios, st_web = load_status("ios"), load_status("web")

rows, counts = [], {}
for f in sorted((root / "testcases").glob("*.md")):
    text = f.read_text(encoding="utf-8")
    for block in re.split(r"(?m)^### ", text)[1:]:
        head, _, body = block.partition("\n")
        m = re.match(r"(TC-[A-Z]+-\d+) · (.+)", head)
        if not m:
            continue
        tid, title = m.groups()
        def field(name):
            r = re.search(rf"- {name}: (.+)", body)
            return r.group(1).strip() if r else ""
        spec = field("Nguồn spec").replace("docs/spec.md:", "").replace("docs/architecture.md:", "arch:")
        spec = re.sub(r"\s*\(.*", "", spec)
        auto = field("Flow tự động")
        ios, web, st = old.get(tid, ["", "", ""])[0:3] if tid in old else ["", "", ""]
        if tid in st_ios: ios = st_ios[tid][0]
        if tid in st_web: web = st_web[tid][0]
        got = [x[1] for x in (st_ios.get(tid), st_web.get(tid)) if x]
        if got: st = "; ".join(f"{n}: {v}" for n, v in (("iOS", st_ios.get(tid, ("", ""))[1]), ("web", st_web.get(tid, ("", ""))[1])) if v)
        elif not st:
            st = "thủ công" if auto.startswith("thủ công") else "chưa làm"
        rows.append((tid, title, field("Ưu tiên"), spec, ios, web, st))
        counts[(tid.split("-")[1], field("Ưu tiên"))] = counts.get((tid.split("-")[1], field("Ưu tiên")), 0) + 1

out = ["# Truy vết testcase", "", "Sinh bằng `python3 -I qa/tools/gen-traceability.py`; cột flow và trạng thái cập nhật tay hoặc qua script. Trạng thái: tự động / thủ công (lý do ở testcase) / chưa làm / chưa làm được (lý do).", "",
       "| TC | Tiêu đề | Ưu tiên | Dòng spec | Flow iOS | Flow web | Trạng thái |", "|---|---|---|---|---|---|---|"]
out[5:5] = []
for r in rows:
    out.append("| " + " | ".join(r[:2] + r[2:]) + " |")
# giữ 8 cột để parse lại: thêm cột rỗng không cần; dùng 7 cột
tfile.write_text("\n".join(out) + "\n", encoding="utf-8")
print(len(rows), "TC")
for k in sorted(counts): print(k, counts[k])
