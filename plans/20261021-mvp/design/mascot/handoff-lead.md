# Bàn giao Domain Lead · Mascot + UI template · 2026-10-22

## Người nhận và phạm vi
- General Lead mới: `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1`.
- Lead cũ: `ece4dfcd-64a6-4fdd-8429-d78f77042391`; parent cũ `abdfe90c-1375-4aee-a530-03020c1ce159`.
- Workspace: `wks_5d1bc443eaa9f683`; cwd `/Users/phamnhuphong/Git/quanlyhocsinh`.
- Mục tiêu: gói khám phá mascot original và UI template cho giáo viên/phụ huynh, chưa tích hợp.
- Brief gốc: `plans/20261021-mvp/briefs/50-lead-common.md`, `60-lead-mascot.md`.
- Brief bàn giao: `briefs/70-lead-handoff-request.md`; quyết định mới `briefs/71-decisions-20261022.md`.
- Quyền ghi chỉ `plans/20261021-mvp/design/mascot/` và `briefs/mascot-*.md`; không sửa prototype/app/backend/docs.

## Git và trạng thái thật
- Tự đọc metadata lúc bàn giao: branch `main`, HEAD `18323503244794cf3a1d1a0a217c06e9385b5285`.
- Làm trong thư mục chính, không có worktree/nhánh riêng mascot; không commit/push/merge.
- `git status --short -- <mascot> <briefs/mascot-*.md>`: cả thư mục mascot và brief01–05 đều untracked.
- Cwd có thay đổi của người dùng/các luồng khác; không checkout/reset/stash hay commit gộp.
- Research đã có 10 tham chiếu sản phẩm, ba UI template (shadcn/Tabler/Flowbite), nguồn và license.
- Ba hướng: Nếp (thẻ ghi chú, khuyến nghị tạm), Mầm (chậu cây nét mực), Nhịp (chim giấy góc cạnh), 6 SVG mỗi hướng.
- `proposal.md`, `research.md`, `index.html`, `visual-handback.md`, `evidence/` là các điểm đọc chính.
- `handback.md` đang ghi tiếp tục đợt22; không phải kết luận gói hoàn tất.

## Điều Lead cũ ĐÃ tự kiểm
- Ngày21: `python3 plans/20261021-mvp/design/mascot/validate.py` exit1: 18 SVG XML/viewBox hợp lệ; 0/10 mockup, thiếu sáu PNG chính.
- Số đo ngày21: SVG raw16.788 bytes; tổng gzip từng SVG7.726 bytes; folder khoảng100KB.
- Ngày21: so SHA-256 manifest `evidence/protected-baseline.json`: 260 file bảo vệ, 0 thay đổi.
- Ngày22 lúc tiếp tục: `df -k .` còn12.935.840KiB; ENOSPC cũ đã hết điều kiện chặn.
- Đợt22 có manifest trước làm: `evidence/protected-resume-20261022.json` gồm260 file; CHƯA so lại kết quả đợt22.
- Heartbeat dự phòng lần1: worker vẫn running; `du -sk .../mascot` là2.000KiB; đây không phải kiểm gói hoàn tất.
- CHƯA tự xem/giải mã hay xác minh10PNG đợt22. Không có kết quả render/iPhone/parity cuối do Lead cũ xác nhận.
- Theo yêu cầu70: từ giờ KHÔNG tự kiểm kết quả worker, KHÔNG giao việc tiếp.

## Worker đang chạy (theo lần kiểm heartbeat gần nhất)
- ID: `4584cf43-5a50-4785-8a97-1a7381a9da6d`, Từ Hoảng, `codex/gpt-6.1-sol`, full-access/medium.
- Brief hiện hành: `plans/20261021-mvp/briefs/mascot-05-complete-mockups.md`; kế thừa02 và04.
- Việc: hoàn tất10HTML +10PNG390×844 (Nếp6, Mầm2, Nhịp2) trên prototype thật, fixture giả, validator, bằng chứng, dọn temp riêng.
- Write-set: mascot/{directions/,assets/,mockups/,baseline/,evidence/,index.html,proposal.md,visual-handback.md,validate.py}.
- Không được ghi handback.md/coordination.md/research.md hay file sản phẩm.
- Worker cũ đáng nhớ: `ac4107c7-5688-458d-a226-06f169444319`, nghiên cứu, codex/gpt-6-luna full-access/high, brief01+03; DONE_WITH_CONCERNS (Lingokids timeout, nguồn chỉ search snippet).
- Không huỷ worker đang chạy. NotifyOnFinish vẫn bật; Lead cũ chỉ thêm nguyên văn kết quả vào cuối file này khi được báo xong và nhắn GL một dòng theo mục3 brief70.

## Ưu tiên còn lại cho Lead mới
1. Nhận kết quả worker05, đọc báo cáo rồi tự xác minh; không lấy status worker làm bằng chứng.
2. Kiểm đủ10PNG, decode mở được, mỗi ảnh390×844; đủ10HTML; toàn thư mục dưới15.000.000bytes.
3. Xem từng ảnh cạnh baseline prototype, kiểm đúng route/text, không che CTA/đổi geometry, ghi rõ phần đề xuất thêm.
4. So manifest đợt22, phân biệt thay đổi luồng khác; cập nhật handback/proposal/status hiện hành.
5. Trình người dùng ảnh và so sánh ba hướng bằng lời đơn giản; tạm đề xuất Nếp vì liên hệ phiếu/từ vựng, dễ đọc nhỏ.
6. Sau chọn hướng mới giao GL cập nhật spec và tích hợp; không tự tích hợp trong khám phá.

## Quyết định71 ảnh hưởng mảng
- Lead mới phải là con trực tiếp GL5c0868ed; Lead cũ chỉ bàn giao.
- Worker MỚI chỉ codex/gpt-6-luna high/full-access hoặc Pi peer/deepseek high; không tạo worker Sol mới. Worker4584cf43 hiện hữu vẫn tiếp tục theo lệnh rõ GL.
- Quy tắc cấm Pi trong brief50 hết hiệu lực; các profile-deviation cũ chỉ là lịch sử.
- Auth: bỏ Cấp mật khẩu/mật khẩu tạm/mã đăng ký; quên mật khẩu vận hành đặt lại; mật khẩu đầu cho phụ huynh đang chờ. Nếu prototype chưa cập nhật thì ghi độ lệch, không tự sửa màn hoặc nghiệp vụ.
- Điểm bước0,5; Q15/Q16 còn chờ. Mascot không thay trạng thái hoặc nghiệp vụ này.
- Phụ huynh chưa hoàn tất ở Claude Design: không làm thêm/sửa parity màn phụ huynh sản phẩm; hai mockup khám phá phụ huynh chỉ là đề xuất trên prototype hiện có.
- Giữ xanh#2F5BEA, nguyên chữ/luồng/layout đã duyệt; mascot là lớp trang trí tùy chọn.

## Lệnh chuẩn, tài nguyên và cạm bẫy
- `python3 plans/20261021-mvp/design/mascot/validate.py` (worker05 phải bổ sung kiểm đủ10PNG thay vì sáu ảnh cũ).
- `du -sk plans/20261021-mvp/design/mascot`; PNG decode bằng thư viện ảnh sẵn có, không cần cài gói nặng.
- Capture scripts trong `evidence/`; xem lệnh hiện hành worker ghi, draft cũ không phải bằng chứng chạy thành công.
- Prototype local trước đây ở `http://127.0.0.1:5173`; VitePID37020 là của người khác, không tự dừng. Không dùng staging/backend cho mascot.
- Chỉ khi chưa có server: `cd design/prototype && npm run dev -- --host 127.0.0.1`.
- Cạm bẫy: skipLogin và Vite module identity khiến dynamic import fixture chụp nhầm Chọn vai trò; phải fixture/intercept trước load và assert đúng màn.
- Hai ảnh sai ngày21 đã xóa; đừng dùng làm baseline. ENOSPC cũ là thật dù API báo còn byte; không lặp lại kết luận blocker cũ khi đĩa đã phục hồi.
- Prototype local không chứng minh server ACK: sent/published là minh hoạ trạng thái, không kết luận gửi backend thành công.
- Không dữ liệu thật, secret, SĐT/nhận xét trong log/fixture; không build lớn/DerivedData; chỉ dọn file tạm của mình.
- Heartbeat `6e3730be` đã xóa lúc bàn giao để tránh vòng tự kiểm cũ; không polling/sleep.

## Chờ kết quả worker để nối thêm
Chưa nhận finish notification cho brief05 tại thời điểm viết. Lead cũ sẽ nối nguyên văn Status/Summary và đường dẫn báo cáo tại đây, rồi báo GL theo mục3 brief70; không kiểm/giao tiếp.

## Kết quả worker05 vừa nhận · CHỈ THEO BÁO CÁO, Lead cũ không tự kiểm
Worker: `4584cf43-5a50-4785-8a97-1a7381a9da6d`. Nguyên văn Status/Summary nhận qua finish notification:

Status: DONE_WITH_CONCERNS

Đã hoàn tất [10 PNG 390×844, gallery và đề xuất](plans/20261021-mvp/design/mascot/index.html), kèm [contact sheet](plans/20261021-mvp/design/mascot/evidence/contact-sheet.png).
Validator đạt, tổng 1.865.227 byte (<15 MB), không đổi pixel ngoài vùng SVG; đã dọn tệp tạm, chưa kiểm iPhone/VoiceOver/ACK backend.

Đường dẫn cho Lead mới: [gallery](index.html), [contact sheet](evidence/contact-sheet.png), [báo cáo worker](visual-handback.md), [đề xuất](proposal.md), [bằng chứng](evidence/validation.md).
Lead cũ chỉ ghi nguyên văn thông báo, KHÔNG chạy validator/đọc báo cáo mới/mở ảnh hay giao việc tiếp. Các số đo và khẳng định pixel ở trên là của worker; Lead mới tự xác minh theo brief70.
