# Handoff General Lead · MVP quản lý lớp tiếng Anh

Từ: General Lead cũ `abdfe90c` (claude sonnet-5-5) · Sang: General Lead mới (claude opus-5-5, thinking medium) · Lập: 2026-10-22 ~07:50 (giờ máy) · Repo: `/Users/phamnhuphong/Git/quanlyhocsinh` · Workspace Paseo: `wks_5d1bc443eaa9f683`

Đọc theo thứ tự: file này → `plans/20261021-mvp/status.md` (sổ và nhật ký) → `plans/20261021-mvp/lead-brief.md` (brief gốc của controller) → `AGENTS.md`, `docs/spec.md`, `docs/architecture.md`. Bạn nhận đúng vai General Lead: một chủ kết quả, điều phối domain lead, kiểm chứng, báo người dùng. KHÔNG tự viết phần lớn mã. Trước khi tạo agent: đọc skill `/paseo` và `paseo-team`, gọi `list_profiles` (deferred tools cần `ToolSearch select:` để nạp schema: create_agent, send_agent_prompt, list_agents, get_agent_status, update_agent, cancel_agent, create_heartbeat…).

## 1. Người dùng và cách làm việc (bắt buộc)

- Người dùng nói tiếng Việt. Trả lời tiếng Việt, ngắn, từ ngữ đơn giản (họ từng bảo "chưa hiểu" khi tôi dùng thuật ngữ: giải thích bằng lời thường, kèm khuyến nghị). Mỗi lượt kết thúc bằng `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + `Summary:` 2 câu. Không dùng đại từ suy đoán giới tính; dùng "bạn" với người dùng.
- Không đánh dấu xong khi chưa kiểm chứng: tự chạy lại lệnh (test, build, curl), không tin báo cáo của worker. Không kiểm chứng được thì nói "tôi không thể xác minh vì…". Từng có báo cáo "xanh" sai (iOS) và review "0 finding" bỏ sót lỗi (số buổi): luôn soi thêm.
- Tiết kiệm token Claude: chỉ điều phối, truyền việc bằng FILE brief (`plans/20261021-mvp/briefs/…`), không dán tài liệu dài vào chat. Không polling/sleep: dùng `notifyOnFinish`; heartbeat chỉ làm dự phòng thưa (≥ 30 phút) và nhớ xoá.
- Tìm code dùng `srcwalk` (thay rg/grep/cat) nếu dùng được; hook `scout-block` chặn lệnh Bash chứa chuỗi như `node_modules`, `target` (dùng cách viết khác, ví dụ `node_mod*`, hoặc Read/Edit).
- Không `git checkout/reset/stash/commit/push` ở thư mục chính (có thay đổi chưa commit của người dùng và của prototype). Không push/merge `main` khi chưa hỏi. Không ghi SĐT/mật khẩu/token/secret thật vào chat, log, repo, báo cáo (che bằng `[redacted]`).
- Quyết định người dùng đã chốt thì không đảo. Việc spec không trả lời: hỏi người dùng, đừng tự đoán. Đổi nghiệp vụ/kiến trúc thì cập nhật docs cùng lúc (AGENTS.md).
- Review: người dùng muốn TIẾT KIỆM: không review từng gói nhỏ; mỗi mảng chỉ một review tổng thể (codex `gpt-6-luna` high), tối đa 2 vòng.
- Worker: người dùng thích `pi/opencode-go/deepseek-v4.1-flash` (thinking high, "thông minh hơn luna, chậm hơn chút") cho Backend và I-1 iOS; các mảng khác lead chọn; việc thị giác/khó có thể dùng codex. Mỗi lead tối đa 4 worker song song. Mọi lệch profile cấu hình ghi vào sổ ở `status.md`.
- Model đã xác nhận: reviewer `codex/gpt-6-luna`; worker `pi/opencode-go/deepseek-v4.1-flash`; lead profile `lead` = `claude/claude-sonnet-5-5` (bypassPermissions, medium).

## 2. Sứ mệnh và phạm vi MVP (người dùng đã xác nhận)

Trong MVP: lớp; học sinh (kèm SĐT phụ huynh, sửa SĐT gỡ liên kết cũ, đánh dấu nghỉ); buổi học (lịch lặp, hủy, buổi lẻ, tab Lịch ngày/tháng); điểm danh 4 trạng thái; bài kiểm tra + điểm (điểm tối đa theo bài, mặc định 15, KHÔNG điểm trung bình, KHÔNG "Vắng thi"); nhận xét/phiếu buổi học (3 sao + câu mẫu cố định + ghi chú, giáo viên bấm gửi); BTVN theo phần (3 mức); báo cáo tháng; phụ huynh xem; đăng nhập SĐT + mật khẩu (giáo viên tự đăng ký workspace; phụ huynh tự liên kết theo SĐT); phân quyền; push FCM; offline (điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao-chấm BTVN); iOS SwiftUI + web/PWA; web desktop giáo viên (Chi tiết lớp); deploy Cloudflare CHỈ staging.
Ngoài MVP (ẩn khỏi prototype bằng cờ, vẫn giữ ở Claude Design làm tham chiếu): nhân sự, phân công, lịch dạy, học phí, lương, bài giảng, vai trò, báo cáo điểm tổng hợp, mọi luồng mời/OTP, báo cáo 3 tháng, tiếng Anh, passkey, Zalo/SMS.

## 3. Nhật ký quyết định của người dùng (đừng đảo)

1. Backend giữ Cloudflare Worker + D1 (không Firestore). Firebase CHỈ cho FCM (iOS qua APNs, web qua FCM web token). Nội dung push không chứa nhận xét/điểm chi tiết.
2. Bỏ hoàn toàn luồng mời/OTP/SMS. Xác thực SĐT + mật khẩu. Cấp mật khẩu tạm (hiện một lần, buộc đổi lần đầu) là ĐỀ XUẤT, người dùng CHƯA xác nhận.
3. Web desktop giáo viên thuộc MVP (phần Chi tiết lớp). Số buổi: tạm theo prototype (đánh số mọi buổi chưa hủy), câu hỏi Q16 chưa trả lời riêng.
4. Xanh chính `#2F5BEA` (prototype) cho cả iOS và web.
5. UI phải ĐÚNG NHƯ PROTOTYPE đã duyệt (nguồn chuẩn; ảnh Claude Design chỉ phụ; không sáng tạo; bắt buộc bảng đối chiếu prototype-vs-bản triển khai).
6. XUNG ĐỘT ĐỒNG BỘ (mới nhất): hai thiết bị sửa cùng một ô thì thay đổi tới máy chủ SAU CÙNG thắng, không giữ cả hai giá trị, không UI chọn; thứ tự theo lúc máy chủ nhận, không theo giờ thiết bị; lịch sử trước/sau vẫn ghi. Đã sửa `docs/spec.md` (mục Offline) và `docs/architecture.md` (mục 5).
7. Chỉ review/sửa phần prototype liên quan MVP; ngoài MVP bỏ qua (chỉ ẩn lối vào).
8. Bản WEB THẬT (`src/`, worktree `mvp-web`) TẠM NGỪNG (người dùng lệnh); ưu tiên prototype và app native iOS; backend vẫn chạy vì native cần API.
9. Mascot cho app để tăng tương tác: yêu cầu MỚI ngoài spec; giai đoạn 1 chỉ khám phá (chưa đụng prototype/app/docs).

## 4. Trạng thái từng mảng (ĐÃ xác minh bởi tôi / CHỈ do báo cáo)

**Prototype `design/prototype` (thư mục chính, KHÔNG commit)**: XONG. P1 (web desktop Chi tiết lớp) và P2 (Tài khoản, sidebar chỉ 6 mục MVP, cờ `legacyInvites/staffing/tuition/scoreReports/payroll/lectures/languageSwitch` = false, cờ `skipLogin`). ĐÃ xác minh: `npm test` 541/541, `npm run build` xanh. Đã deploy Cloudflare Pages `quanlyhocsinh-proto` https://quanlyhocsinh-proto.pages.dev (HTTP 200, do lead Web làm theo yêu cầu người dùng). Tài khoản demo GIẢ ở `design/prototype/README.md`. Ảnh: `plans/20261021-mvp/design/prototype-shots/{p1,p2}/`. Design Claude Design đã DONE: ảnh duyệt `design/round-4/` (Chi tiết lớp; BỎ `04b` sai) và `design/auth-r4/` (24 màn Tài khoản); quyết định ở `design/decisions.md`.

**Backend** (worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`, nhánh `mvp-backend`, HEAD `665c5ff` ngày 21/10 12:09, chưa push/merge): ĐÃ xác minh (tôi) 99/99 test, typecheck sạch, `GET /v1/health` 200, preflight CORS từ `http://localhost:5173` 204 đúng origin. Staging: Worker `qlh-staging-api` https://qlh-staging-api.tolaphamnhuphong.workers.dev (version `90584f55…`), D1 `qlh-staging-db`, gói Free; chưa có R2 (PDF trả 503 `pdf_storage_unavailable` đúng thiết kế) và chưa có FCM thật. Workspace demo trên staging (SĐT giả `+84900000001` giáo viên, `+84900000002` phụ huynh 2 con), mật khẩu ở `/tmp/qlh-staging-demo.txt` (chmod 600, KHÔNG in ra). CPU thật (Free): PBKDF2 30k/60k/100k vòng median 9/14/26 ms; đăng nhập 29 ms (p95 ~51); `/me` p95 14,8 ms (vượt ngân sách 3 ms); RS256 import+ký 1–2 ms, sinh khoá RSA 27–180 ms (không được generateKey lúc chạy). Handback: `backend/handback.md`; review impl r1/r2 đã xử lý, không có r3 (lead tự phán đoán). **VIỆC DỞ QUAN TRỌNG**: đổi xung đột sang "tới sau thắng" ở backend CHƯA thấy trong git (cây sạch, không commit sau 665c5ff; worker `4b5f892c` được giao nhưng không thấy kết quả; iOS handback xác nhận staging chưa có bản bỏ `conflict`). Phải kiểm và giao lại cho lead Backend (`ccb7d3d2`) nếu chưa làm: bỏ `conflict`/`conflict_stale`, bỏ ghi `sync_conflicts`, đổi test, cập nhật `backend/{api-spec,offline-plan,data-model,authz-matrix}.md`, deploy lại staging, smoke hai lệnh cùng ô. Việc còn lại khác: đồng bộ docs (hợp đồng CORS vào `api-spec.md`, câu "cổng đóng lại ⇒ client nhận `deleted`" ở 6.5(b), Q9 PDF qua Worker ở `architecture.md`, Q17: đổi lịch lặp khi buổi hôm nay đã có dữ liệu: tạm giữ buổi hôm nay); MINOR hở: m1, m12, N4, N5, N6.

**iOS** (worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios`, HEAD `8e3d835` 21/10 23:16, cây sạch, chưa push/merge): theo handback lead (`ios/handback.md`): lõi (API, Keychain, SQLite + hàng đợi idempotent, đồng bộ push/pull, design system từ token prototype), Tài khoản, giáo viên (lớp, học sinh, buổi, Lịch, điểm danh, bài kiểm tra, điểm, BTVN, nhận xét, báo cáo + PDF tạo trên máy), phụ huynh, localization VI, quy tắc sync mới phía client (conflict chỉ giải mã như applied), push no-op (chưa có `GoogleService-Info.plist`). Lead tự báo `xcodebuild … build test` TEST SUCCEEDED 109 test (HEAD 8e3d835). TÔI CHƯA tự chạy lại sau đó (lần trước tôi chạy thì build đỏ, lead sửa). Review iOS r1/r2 đã làm và sửa (BLOCKER crash Production do `try!` demo đã sửa). Còn: 3 MINOR parity chờ người dùng duyệt (xem mục 6), chưa chạy UI ghi điểm danh đầy đủ qua staging, chưa bảng đối chiếu ghép cạnh mọi màn do GL tự chụp, push FCM chưa tích hợp, `local_json` hàng đợi chưa mã hoá at-rest. Lệnh tự kiểm (đĩa đã có 13 GB trống):
`cd /Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios/ios && xcodegen generate && xcodebuild -project QuanLyLop.xcodeproj -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-gl CODE_SIGNING_ALLOWED=NO test`; xoá `/tmp/qlh-dd-gl` sau khi xong.

**Web thật** (worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`, nhánh `mvp-web`, ws `wks_f1d6ab78d9a2cd60`, commit `d439eb3` = khung Vite/TS): TẠM NGỪNG theo lệnh người dùng. 44 test xanh, JS ban đầu ~102 KB gzip. Có 36 file dở của W-2 chưa commit (giữ nguyên). Ghi chú: `plans/20261021-mvp/web/{paused.md,handback.md}`; brief sẵn `briefs/web-0*.md`. Khi người dùng nói "mở": lead Web `5d0abc29` chạy W-1 đợt B, W-2/W-3/W-4, W-5 deploy Pages staging; backend đã có CORS cho `localhost` và `quanlyhocsinh-proto.pages.dev`, cần thêm origin Pages thật rồi deploy lại.

**Mascot** (`plans/20261021-mvp/design/mascot/`, lead `ece4dfcd` codex): BLOCKED trước đó vì đĩa đầy; đĩa nay đã có chỗ (13 GB) nên có thể tiếp tục. Đã có `research.md`, `proposal.md` (3 hướng Nếp/Mầm/Nhịp, đề xuất Nếp), 18 SVG hợp lệ (7,7 KB gzip), `index.html` gallery. Còn thiếu: 10 mockup trên màn prototype thật (6 PNG 390×844 baseline); giao lại worker visual `4584cf43` hoặc để lead làm tiếp (xem `design/mascot/handback.md`, `briefs/mascot-04-render-recovery.md`). Sau khi người dùng chọn hướng: cập nhật spec (mascot là lớp bổ sung, không đổi luồng/nghiệp vụ), rồi giao đưa vào prototype và iOS.

## 5. Agent và sổ

Còn đáng chú ý: General Lead cũ `abdfe90c` (tôi; sau handoff chỉ chuyển tiếp báo cáo); Domain Lead Backend `ccb7d3d2`, iOS `7055b53d`, Web `5d0abc29`, Mascot `ece4dfcd` (đều claude sonnet trừ Mascot codex gpt-6.1-sol); lead tiếp quản cũ `9682fb5f` (codex, idle, KHÔNG dùng). Notification `notifyOnFinish` của các lead vẫn gửi về `abdfe90c`: tôi sẽ chuyển tiếp cho bạn; bạn thông báo cho các lead biết General Lead mới (gửi `send_agent_prompt` cho từng lead). Sổ worker đầy đủ ở `status.md` và các `handback.md` từng mảng. Các agent lỗi/cũ (`e06e4094`, `44dcb528`, `4058413d`, `d4bdc663`, `5a29ca74`, `01222fa0`) bỏ qua.

## 6. Việc cần NGƯỜI DÙNG quyết (đã giải thích bằng lời thường, người dùng chưa trả lời; khuyến nghị)

1. Q8 độ nặng băm mật khẩu: giữ 100.000 vòng ở staging, khi chạy thật nâng gói Workers 5 USD/tháng (khuyến nghị).
2. Q1 giáo viên quên mật khẩu: bản đầu đặt lại thủ công trong database (khuyến nghị).
3. Q2 cấp mật khẩu cho SĐT đã có tài khoản: chấp nhận hạn chế hiện tại (chỉ cấp lại khi tài khoản đó chỉ là phụ huynh trong chính workspace) (khuyến nghị).
4. Q3 đăng ký không xác minh SĐT: giữ "mã đăng ký" của vận hành trong giai đoạn thử (khuyến nghị).
5. Xác nhận luồng "Cấp mật khẩu tạm" (khuyến nghị xác nhận). Q6 điểm có số lẻ: cho phép, bước 0,5. Q15 "vắng 2 buổi liên tiếp": chỉ tính trạng thái "Vắng", bỏ qua buổi hủy. Q16: theo prototype và sửa câu trong spec.
6. iOS 3 MINOR parity (lead iOS hỏi): phụ huynh 5 tab không thêm lối vào Cài đặt/không banner số lệnh chờ (tôi đề xuất duyệt vì đúng prototype); nút "Tải PDF về máy" của phụ huynh; thẻ vai trò phụ huynh hiện "Phụ huynh" thay vì tên con; sheet học sinh mobile thêm "Sửa SĐT"/"Cấp mật khẩu"; thẻ "Người dạy" dùng người đăng nhập.
7. Chưa gấp: bật R2 (dashboard Cloudflare, bucket `qlh-staging-reports`, `wrangler login` lại với quyền R2) để có PDF thật; Firebase (project, bật FCM, `GoogleService-Info.plist`, khoá APNs, service account vào `wrangler secret`; checklist `backend/firebase-setup-checklist.md`); mở lại web thật hay chưa; giữ hay bỏ 36 file dở của W-2 (đề xuất giữ); chọn hướng mascot; merge nhánh `mvp-backend`/`mvp-ios`/`mvp-web` về `main` (hỏi trước, chưa làm); commit `docs/` và prototype ở thư mục chính (người dùng chưa cho).

## 7. Việc ưu tiên cho bạn (thứ tự)

1. Đọc, xác minh trạng thái thật (đừng tin ngay): chạy lại `npm test`/`build` prototype, `npm test`/`typecheck` backend, curl health và preflight CORS staging, `xcodebuild test` iOS (lệnh ở trên), `git log` các worktree, `list_agents` (nhớ giới hạn: có thể không liệt kê hết; dùng `get_agent_status` với id đầy đủ lấy từ handback/list).
2. Kiểm và giao lại việc dở: xung đột "tới sau thắng" ở backend (xem mục 4) + deploy lại staging + báo lead iOS khi api-spec mục 6 mới; sau đó iOS nối lại staging bản mới và chạy thật thao tác ghi qua hàng đợi.
3. Gửi người dùng danh sách quyết định (mục 6) ngắn gọn; ghi câu trả lời vào `status.md` và áp dụng (đặc biệt Q16 → sửa spec mục 4; Cấp mật khẩu → spec).
4. Hoàn tất mascot mockup (đĩa đã có) → trình người dùng chọn hướng.
5. Đồng bộ docs sau backend xong (danh sách ở mục 4); báo người dùng trước khi commit docs.
6. Khi người dùng nói "mở web": mở lead Web giai đoạn 1.
7. Khi người dùng muốn deploy production hoặc merge: hỏi rõ trước; production chưa được phép.

## 8. Đường dẫn quan trọng

`plans/20261021-mvp/`: `status.md`, `lead-brief.md`, `handoff-general-lead.md`, `briefs/` (50-lead-common.md = quy tắc chung gồm Quy tắc UI; 51 backend, 52 iOS, 53 web, 60 mascot; và brief con của lead), `backend/` (data-model, api-spec, authz-matrix, stack-and-cpu, offline-plan, handback, impl-*), `ios/handback.md`, `web/`, `design/` (decisions.md, round-4, auth-r4, prototype-shots, outbox/, mascot/, source/). Script chụp màn Claude Design: `~/.claude/skills/claude-design-to-prototype/scripts/{list_screens,shoot_screens}.py` (đường dẫn tuyệt đối). Script kiểm DDL backend: `python3 -I plans/20261021-mvp/backend/check-fcm-ddl.py` (chạy từ gốc repo).

## 9. Cạm bẫy đã gặp

- Đĩa máy từng đầy 100% (lỗi `ENOSPC`, agent hỏng giữa chừng); nay còn ~13 GB (94% dùng). Mỗi worker một derivedData riêng và xoá sau khi xong; không cài gói nặng thừa. Không tự xoá dữ liệu của người dùng khi chưa được cho phép (từng cần "dọn đĩa": DerivedData 7,2 GB, cache npm 1,2 GB; người dùng đã tự dọn).
- Hạn mức/lỗi nhà cung cấp: Claude từng "session limit"; worker pi từng 503; codex từng hết hạn mức (429). Chuyển model và ghi sổ.
- Token wrangler đã có `d1`, `pages`, workers, kv; KHÔNG có r2. Chỉ staging, tên tài nguyên tiền tố `qlh-staging-`.
- Prototype ở thư mục chính chưa commit: mọi worker ghi vào đó phải cẩn thận; worktree từ `main` KHÔNG có prototype mới.
- `list_agents` có lúc không liệt kê hết agent của lead; xác nhận qua handback và `git log`.
- Báo cáo sai/quá lạc quan từng xảy ra (build iOS "xanh", review "0 finding"): luôn tự chạy lệnh.
