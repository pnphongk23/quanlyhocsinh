# Plan: nhân sự, lương, học phí, báo cáo điểm (thiết kế trước)

Trạng thái: RESUMED 2026-10-18 (user: tự sửa design → review lại → prototype → deploy); trước đó PAUSED (stream P) · 2026-10-18 · Owner: General Lead (Gia Cát Lượng) — user: làm base trên Claude Design + review luồng trước, sau đó lên kế hoạch lại để prototype khớp Claude Design. Stream D xong.

## Outcome
- docs/spec.md có quy tắc đề xuất (chờ duyệt) + mục 10.9 thiết kế trước; mục 8 và quy tắc 3.4 giữ nguyên.
- design/claude-design-staff-tuition-scores-prompt.md để user dán vào Claude Design.
- design/prototype có màn mới cho Admin/giáo viên; typecheck + test + build pass; deploy Pages `quanlyhocsinh-proto`, URL trả 200.

Non-goals: màn phụ huynh trong prototype (prototype chưa có role phụ huynh; màn PH chỉ nằm trong prompt Claude Design), app thật ngoài design/prototype, đổi mục 8, commit/push.

## Topology (Lead Delegation Gate)
- Stream D (docs): 1 Worker trực tiếp dưới General Lead. Write-set: `docs/spec.md`, `design/claude-design-staff-tuition-scores-prompt.md`.
- Stream P (prototype): 1 Domain Lead (≥2 Worker, nhiều vòng, file chung). Write-set: `design/prototype/**` (trừ `dist/` do build sinh). Domain Lead tạo Worker peer, chạy tuần tự khi đụng file chung (`src/data/types.ts`, `seed.ts`, `migrations.ts`, `src/app/router.tsx`, `SettingsPage.tsx`).
- D và P chạy song song (write-set rời nhau).

## Quy tắc nghiệp vụ đề xuất (nguồn chung cho D và P)

**1.1 Phân công:** mỗi lớp có 1 giáo viên chính và 0..n trợ giảng (`position: main | assistant`). Chỉ Admin phân công. Gán vào lớp thì tự thêm lớp vào `member.classIds` (phạm vi thấy lớp); gỡ phân công không gỡ quyền thấy lớp. Chỉ chọn được thành viên nhân sự đang hoạt động.
**1.2 Dạy thay một buổi:** Admin đổi người dạy cho một buổi (kể cả buổi lẻ học bù): chọn vị trí, người thay, lý do. Người được thay không tính buổi đó; người thay tính buổi theo vị trí họ đảm nhận. Người thay xem được buổi đó (điểm danh, nhận xét) dù không được gán lớp. Không đổi người dạy buổi đã hủy.
**1.3 Lịch dạy:** theo tuần, liệt kê buổi một người dạy chính / trợ giảng / dạy thay, buổi bị thay (gạch, ghi "Được thay bởi …"), buổi hủy. Admin chọn được mọi người; nhân sự khác chỉ xem lịch của mình.
**1.4 Lương:** theo buổi, chỉ buổi người đó thực sự dạy (đã chốt 2026-10-18). Mỗi người có đơn giá dạy chính và đơn giá trợ giảng (VND/buổi). Lương tháng = Σ buổi đã diễn ra trong tháng × đơn giá theo vị trí + khoản điều chỉnh (thưởng/trừ, có ghi chú). Buổi hủy, buổi chưa diễn ra không tính (buổi chưa diễn ra hiện "dự kiến"). Chưa có đơn giá → cảnh báo "Chưa đặt đơn giá". Bảng lương tháng: Nháp → Đã chốt (khóa sửa). Admin quản lý; giáo viên/trợ giảng chỉ xem lương của mình (đã chốt 2026-10-18).
**2.1 Học phí theo buổi:** mỗi lớp có học phí/buổi và tuỳ chọn "Tính phí buổi vắng không phép" (mặc định bật). Buổi tính phí = buổi đã diễn ra trong tháng, trong khoảng ngày vào lớp..ngày rời lớp, trạng thái Có mặt/Muộn (+ Vắng nếu tuỳ chọn bật). Có phép và buổi hủy không tính. Buổi học bù tính theo tuỳ chọn "Tính phí buổi học bù" của lớp (Admin chọn, đã chốt 2026-10-18). Giảm học phí theo % từng học sinh. Phải thu làm tròn đến 1.000 đ.
**2.2 (team đề xuất):** phiếu học phí theo tháng mỗi học sinh; ghi nhận thu (số tiền, ngày, tiền mặt/chuyển khoản, ghi chú; nhiều lần); trạng thái Chưa thu / Thu một phần / Đã thu đủ; công nợ = tổng còn thiếu các tháng trước; gửi thông báo học phí cho phụ huynh (từng em hoặc cả lớp, cần mạng); số tiền đổi sau khi gửi (sửa điểm danh) → ghi "Số tiền đã thay đổi, cần gửi lại". Tháng chưa hết hiện "Tạm tính". Chỉ Admin. Phụ huynh xem phiếu và lịch sử thu (chỉ thiết kế ở Claude Design).
**3.1 Báo cáo điểm từng học viên:** mỗi em: các bài theo ngày (điểm / Vắng thi / Chưa có điểm), trung bình (quy tắc 3.2), xu hướng (biểu đồ đường), chênh lệch bài gần nhất.
**3.2 (team đề xuất):** báo cáo tổng hợp lớp cho giáo viên: phân bố trung bình học sinh theo dải (<5, 5–6,4, 6,5–7,9, 8–10), tiến độ nhập điểm từng bài (đã có điểm / vắng thi / chưa nhập), danh sách "Cần chú ý" (TB < 5; hoặc bài gần nhất giảm ≥ 2 điểm so với bài có điểm trước đó; hoặc ≥ 2 bài vắng thi/chưa có điểm). KHÔNG hiện trung bình lớp hay trung bình từng bài (quy tắc 3.1).
**Đã chốt 2026-10-18 (user trả lời câu hỏi mở):**
- Lương: chỉ tính buổi người đó thực sự dạy (buổi đã diễn ra, là người dạy thực tế sau dạy thay). Buổi hủy, kể cả hủy sát giờ, không tính lương, không phụ cấp.
- Học phí buổi học bù: buổi học bù (buổi lẻ đánh dấu "Học bù") có tính phí hay không do Admin chọn theo lớp (tuỳ chọn "Tính phí buổi học bù", mặc định bật để tổng phí bằng như học đủ: buổi có phép không tính, buổi học bù bù lại có tính). Admin tắt thì buổi học bù miễn phí.
- Không có gói học phí trả trước theo số buổi (bỏ khỏi đề xuất, không có UI).
- Role khác Admin (kể cả giáo viên của lớp) không xem được học phí của học viên.
- Giáo viên/trợ giảng xem bảng lương của chính mình, chỉ đọc (cả tháng Nháp và Đã chốt, ghi rõ trạng thái); không thấy lương người khác; Admin quản lý toàn bộ.
**Câu hỏi mở:** không còn.

## Hợp đồng prototype (Stream P)
Types mới trong `src/data/types.ts`, thêm vào `StoreState`, migration điền mặc định khi thiếu (người đã mở bản cũ vẫn thấy dữ liệu mẫu):
`StaffPosition = "main"|"assistant"`; `ClassStaff {classId, memberId, position}`; `SessionSubstitute {id, sessionId, position, originalMemberId: string|null, substituteMemberId, reason, createdAt}`; `PayRate {memberId, mainRate, assistantRate}`; `PayAdjustment {id, memberId, month, amount, note}`; `PayrollMonth {month, status: "draft"|"locked"}`; `ClassFee {classId, feePerSession, chargeAbsent, chargeMakeup}`; `Session.makeup?: boolean` (buổi học bù); `StudentFee {studentId, discountPercent}`; `TuitionPayment {id, studentId, month, amount, paidAt, method: "cash"|"transfer", note}`; `TuitionNotice {studentId, month, amount, sentAt}`.
Seed: 6A chính = Cô Lan (member-lan-teacher); IELTS chính = Thầy Quang Minh, trợ giảng = Cô Thu Trang. Dạy thay: 6a-session-6 (12/10) Thầy Minh thay Cô Lan "Cô Lan ốm"; 6a-extra-session (25/10, học bù) Thầy Minh dạy. Đơn giá: Cô Lan 300.000/–, Thầy Minh 350.000/200.000, Cô Trang –/150.000. Học phí: 6A 150.000 đ/buổi tính vắng, tính phí học bù; 6a-extra-session có `makeup: true`; IELTS 250.000 đ/buổi không tính vắng, không tính phí học bù; 6a-student-1 giảm 10%. Thu tháng 9: đa số đủ, 1–2 em thu một phần (có công nợ); tháng 10: vài em đã thu.
Logic thuần có test vitest: `src/data/teaching.ts` (buổi của một người theo khoảng ngày), `src/data/payroll.ts`, `src/data/tuition.ts`, `src/features/scores/scoreReport.ts`.
Route (tên màn trong `Loading` titles):
- `/phan-cong` Phân công giảng dạy (Admin) — lớp, GV chính, trợ giảng, sửa bằng Modal.
- `/lich-day` Lịch dạy — chọn người (Admin), tuần trước/sau, nhãn vị trí.
- `/luong`, `/luong/:memberId` Lương (Admin) — chọn tháng, bảng/ thẻ theo người, chi tiết buổi, điều chỉnh, đơn giá, Chốt bảng lương. Giáo viên/trợ giảng: `/luong` chuyển sang `/luong/<memberId đang dùng>`; `/luong/:memberId` của chính mình hiện chỉ đọc (không sửa đơn giá, không thêm điều chỉnh, không nút Chốt); memberId khác → NoAccess. Mục Cài đặt "Lương của tôi" cho role nhân sự không phải Admin.
- `/hoc-phi`, `/hoc-phi/:studentId` Học phí (Admin) — chọn tháng + lớp, tổng phải thu/đã thu/còn nợ, danh sách em, chi tiết phiếu, ghi nhận thu, gửi thông báo, sửa học phí lớp (học phí/buổi, tính phí vắng không phép, tính phí buổi học bù). Không có UI gói trả trước. Role khác Admin vào /hoc-phi thấy NoAccess, không có mục menu.
- SessionDetailPage: khu "Người dạy" + Modal "Đổi người dạy buổi này" (Admin).
- `/lop/:classId/bao-cao-diem` (tổng hợp 3.2 + danh sách em) và `/lop/:classId/bao-cao-diem/:studentId` (3.1, `handle: {detail: true}`); lối vào từ tab Điểm của lớp, dùng được trên mobile và desktop.
- Cài đặt: Admin thêm mục Phân công giảng dạy, Lịch dạy, Lương, Học phí; nhân sự khác thêm "Lịch dạy của tôi" và "Lương của tôi". Tabbar giữ nguyên.
UI chỉ dùng `src/shared/ui` và tokens sẵn có; không thêm thư viện.

## Kiểm chứng
`npm run typecheck`, `npm test`, `npm run build` trong design/prototype; mở `npx vite preview`, mỗi route mới render, không lỗi console (mobile 390px + desktop); deploy `wrangler pages deploy dist --project-name quanlyhocsinh-proto --branch main --commit-dirty=true`; `curl -sI` URL deployment và route mới → 200.

## Review
UI prototype + đề xuất chờ duyệt → rủi ro thấp, không chọn Reviewer trừ khi kiểm chứng phát hiện vấn đề.

## Vòng 2 (2026-10-18): sửa design theo review, review lại, prototype khớp design, deploy
Review Luna: BLOCKER E-101 (sidebar web vai trò Giáo viên hiện Học phí/mục Admin); REQUIRED D-073 (5 buổi × 150.000 ≠ 900.000), D-063/D-070 (6A tắt tính phí học bù, trái seed bật).
Quyết định: team không sửa được project trên claude.ai → sửa bản sao `design/export/claude-design-staff-tuition.dc.html` (copy từ /tmp/cd-src/dc.html), chụp lại board đổi vào `design/reference/claude-design-staff-tuition/`, viết `design/claude-design-staff-tuition-fix-prompt.md` để user dán vào Claude Design cho bản gốc khớp.
Sửa: (1) mọi board web có vai trò "· Giáo viên": sidebar bỏ Phân công, Học phí, Nhân sự, Vai trò; "Lương" → "Lương của tôi"; giữ Lịch dạy. (2) Lớp 6A tính phí học bù = bật ở mọi board học phí 6A; buổi học bù 6A "Tính phí 150.000 đ"; D-073 thành "6 buổi × 150.000 đ" = 900.000 đ (khớp với học bù được tính). (3) Số tổng liên quan tự khớp lại.
Bước: D1 Worker sửa + chụp + prompt → Reviewer Luna mới review lại board đổi + quét lỗi cùng gốc → Domain Lead Chu Du: gap prototype ↔ 104 board, Worker sửa theo nhóm A–E, verify, deploy.
Cập nhật 2026-10-18: user huỷ bước sửa design + review lại ("Mà thôi. Cho anh em làm prototype đi"). D1 bị cancel, không file nào đổi. Stream P làm prototype khớp 104 board (design/reference/claude-design-staff-tuition/), nhưng 3 lỗi review làm theo spec trong prototype, không chép lỗi từ board: sidebar/menu vai trò Giáo viên không có Phân công/Học phí/Nhân sự/Vai trò, có "Lương của tôi"; 6A tính phí học bù bật; số buổi × đơn giá = phải thu. Sau đó verify + deploy.

## Tiếp quản General Lead (2026-10-18)
- User chỉ định phiên `01222fa0-c717-4e61-8fe9-3847e4900fdf` tiếp tục lead cũ `49dd0682-bf4c-450b-a98d-8399ad82815b`. Lead cũ idle; không có turn đang ghi file.
- Giữ outcome cuối: prototype theo board A–E, bỏ màn PH; ba lỗi review theo spec; kiểm chứng và deploy Pages. Không đổi phạm vi mục 8, không app thật, không commit/push.
- Kiểm tra lịch sử Chu Du: lần RESUME trước dừng ngay sau đọc index.tsv vì quota Claude; chưa có sửa UI vòng 2 hoặc deploy. 184 tests/typecheck/build là bằng chứng lịch sử trước PAUSE, chưa tái xác minh.
- Gửi RESUME cho Domain Lead hiện hữu với thông báo hoàn tất về lead mới; nếu quota còn chặn, xử lý successor có ghi nhận thay vì retry liên tục.
- RESUME Chu Du nhận finish event: vẫn quota Claude, resets 02:00 Asia/Saigon. Không retry thêm.
- Successor Stream P: `5a29ca74-0f35-48d5-9bcc-4a960e72df35` (Tiêu Hà), parent General Lead mới, workspace đã kiểm đúng, status running. `profile-deviation`: profile lead dùng Claude không khả dụng do quota; probe Codex có mode full-access + model gpt-6.1-sol; dùng thinking medium như profile lead. Worker vẫn peer Pi theo yêu cầu user. Phần việc/acceptance không đổi; notification finish bật.
- Checkpoint Stream P: Domain Lead đã quan sát 98 board không phải PH (16 ảnh trực tiếp, 82 qua contact sheets; chưa khẳng định parity). Evidence: [stream-p-successor-evidence.md](stream-p-successor-evidence.md). W-AB `7281941d-f768-48fb-bd7e-533def42bf63` và W-CD `e4cca93e-2729-41ea-a2cb-14f9b0225614` đã nhận packet tách write-set, notification bật. Domain Lead kết thúc turn chờ handback, không phải hoàn tất stream; kế tiếp AB → E, hội tụ, kiểm browser/tests, freeze/review rồi deploy.

- Checkpoint review 1: cả hai reviewer CHANGES_REQUIRED; 7 REQUIRED (lương đã chốt, lịch sử phân công/buổi dạy, scope lớp và ngoại lệ dạy thay, chọn tháng lương cá nhân, ghi nhiều bước nguyên tử, ẩn thu khi đủ, mobile sheet/footer). Candidate v1 giữ bất biến; hai Worker cũ đã nhận correction với write-set tách biệt. Chưa candidate v2/checks tổng/review 2/deploy. Evidence chi tiết ở stream-p-successor-evidence.md.
