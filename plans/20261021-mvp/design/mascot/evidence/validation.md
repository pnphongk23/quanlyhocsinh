# Validation hiện hành · 2026-10-22

Status: DONE_WITH_CONCERNS

- Command: `PYTHONDONTWRITEBYTECODE=1 python3 plans/20261021-mvp/design/mascot/validate.py`; exit0, errors[].
- 18 SVG XML/viewBox đúng, không remote resources/script/animation. Raw16788bytes / gzip7726bytes.
- Đúng 10 HTML và 10 PNG decode bằng Pillow sẵn có, signature đúng, mỗi PNG390×844.
- Local links và CSS background tồn tại; baseline hash khớp manifest; pixel khác ngoài SVGbox=0 ở cả10.
- Đã xem từng cặp baseline/đề xuất, contact sheet10, gallery390×844 và ba bảng pose.
- Dung lượng lúc kiểm1,862,610bytes trước ghi report này; toàn gói dưới15,000,000bytes.
- 263file prototype +260file baseline bảo vệ:0thay đổi; không source/config/lockfile/docs edits.
- Không còn runtime/profile/cache/pycache worker; server có trước không bị dừng.
- JSON chi tiết: [validation.json](validation.json); quan sát và giới hạn: [visual-check.md](visual-check.md).

Lịch sử21-10: Chromium mkdtemp ENOSPC và ghi log Errno28; recovery04 dừng đúng một launch. Ngày22-10 đĩa phục hồi, brief05 cho tiếp tục; không còn blocker render. Chưa claim iPhone/VoiceOver/large text/dark theme/ACK backend.
