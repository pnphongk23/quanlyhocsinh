# Handoff General Lead (lần 2) · MVP quản lý lớp tiếng Anh

Từ: General Lead `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1` (claude opus-5-5 medium) · Lập: 2026-10-23 ~18:50 (+07) · Repo `/Users/phamnhuphong/Git/quanlyhocsinh` · Workspace Paseo GL `wks_5d1bc443eaa9f683`.

Đọc theo thứ tự: file này → `status.md` (nhật ký đầy đủ, mục cuối là mới nhất) → `briefs/71-decisions-20261022.md`, `74-decisions-20261022-b.md`, `76-decisions-20261023.md` (quyết định người dùng, THẮNG spec cũ) → `AGENTS.md`, `docs/spec.md`, `docs/architecture.md` (đã đồng bộ 71/74/76, chưa commit) → bàn giao cũ `handoff-general-lead.md` (bối cảnh trước 22/10). Trước khi tạo/nhắn agent: đọc skill `/paseo`, `paseo-team`, gọi `list_profiles`, nạp tool deferred bằng `ToolSearch select:...`.

## 1. Cách làm việc với người dùng (bắt buộc)
- Tiếng Việt, ngắn, lời thường (không thuật ngữ; nếu buộc dùng thì giải thích). Mỗi lượt kết thúc `Status:` + `Summary:` 2 câu. Dùng "bạn"; không đoán giới tính.
- Không báo xong khi chưa tự kiểm (chạy test, curl staging, so hash bundle, xem ảnh). Báo cáo của lead/worker từng sai hoặc lạc quan.
- GL chỉ điều phối; việc nặng giao Domain Lead bằng FILE brief (`plans/20261021-mvp/briefs/`).
- Model theo ý người dùng (xem memory `agent-team-model-choice`, `worker-cost-split`): lead việc khó = Opus; worker sửa mã = `claude/claude-sonnet-5-5` (hoặc `codex/gpt-6-luna` / pi deepseek khi người dùng nói); việc KIỂM CHỨNG (đo, trình duyệt, chụp, smoke) = `codex/gpt-6-luna`; audit ảnh có thể `claude/claude-haiku-5-5`. Review tổng thể mỗi mảng 1 lần, tối đa 2 vòng.
- Notification của lead hay KHÔNG tới GL ⇒ luôn có heartbeat 15 phút kiểm `get_agent_status` (dùng id ĐẦY ĐỦ; `list_agents` limit nhỏ hay sót worker con của lead) và nhắc lead khi worker đã xong mà lead đứng yên.
- Không push/merge `main`, không production, không `git checkout/reset/stash/commit` ở thư mục chính (prototype + docs chưa commit). Không in secret/mật khẩu/SĐT. Creds demo staging: `~/.config/qlh/staging-demo.txt` (chmod 600; /tmp bị xoá khi khởi động lại). Tài khoản demo khoá 15 phút sau 5 lần sai; đăng ký 5/giờ/IP; CORS chỉ cho domain chính `qlh-staging-web.pages.dev` (URL theo mã deploy bị chặn — đúng thiết kế).
- Hạn mức Claude từng hết ~9 giờ (23/10). Chuyển việc kiểm sang luna để tiết kiệm.

## 2. Quyết định người dùng mới (22–23/10, đừng đảo)
1. Đăng nhập: băm PBKDF2 30.000 vòng (vừa gói Free); quên mật khẩu = vận hành đặt lại thủ công (OTP phase sau); giáo viên không quản lý mật khẩu ai; bỏ mã đăng ký và MỌI luồng lời mời (gỡ hẳn).
2. Phụ huynh tự đăng ký SĐT + mật khẩu tự đặt; ĐƯỢC tạo tài khoản dù SĐT chưa khai (màn "chưa có con"), tự liên kết khi giáo viên khai SĐT.
3. Điểm bước 0,5; Q15/Q16 theo prototype (mọi buổi chưa huỷ có số; cảnh báo 2 buổi gần nhất liên tiếp "Vắng").
4. PDF: không lưu máy chủ, không R2; "Tải PDF / ảnh" tạo trên máy.
5. Phụ huynh: 2 tab "Lớp học của con" (buổi → phiếu + BTVN + điểm danh; Điểm, Báo cáo tháng trong lớp) và "Nhận xét của cô"; Cài đặt qua avatar.
6. Mascot "Mít" (gà) dạng WebP (ảnh AI), không SVG. 1 sao "hơi buồn nhẹ".
7. Web làm trước (frontend + backend); iOS sau. Backend đổi hợp đồng ⇒ báo iOS (`data-api/contract-changes.md`).
8. GL đã duyệt: bỏ "khôi phục buổi" (spec: huỷ không đảo ngược); hộp xác nhận "Lưu trữ lớp"; pull 60 s khi hiển thị; `/me` chạy nền khi mở app.

## 3. Trạng thái (đã tự kiểm lúc 18:45)
| Mảng | Trạng thái | Bằng chứng / chỗ xem |
|---|---|---|
| Backend `mvp-backend` | HEAD `d2b9c63`, staging `6f2338f6` (placement `gcp:asia-east2`), 137 test; id tuỳ chọn chống trùng (H6), phụ huynh tự đăng ký, teacher_name, throttle nguyên tử | `data-api/{plan,diagnosis,contract-changes,review-overall-r1,measure-after}.md` |
| Web `mvp-web` | HEAD `f31150e`, staging https://qlh-staging-web.pages.dev phục vụ bản này; 368 test; test:click 21/0; test:save 137/0; JS ~148 KB gzip; Lighthouse mobile 90/100/100 | `web/handback.md`, `web/ui-audit/*`, `data-api/*` |
| Prototype `design/prototype` (thư mục chính, chưa commit) | 566 test; deploy https://quanlyhocsinh-proto.pages.dev (ux-v2, phụ huynh 2 tab, Mít WebP, nút lưu) | `design/ux-v2/`, `design/guardian/` |
| Design token chung | `design/tokens/` (thư mục chính) = `mvp-web/design/tokens/`; có `ios-mapping.md` | |
| iOS `mvp-ios` | HEAD `3f0ca5c` (iOS-20: id chống trùng, cursor an toàn, đổi mật khẩu); chưa nhận báo cáo cuối của lead | `ios/handback.md` |
| Docs | `docs/spec.md`, `docs/architecture.md` đã sửa theo 71/74/76 + PDF; chưa commit | |

Số đo trước → sau (4G): đổi tab buổi học 362 → 11 ms (0 request); mở app 853 → 298 ms; chọn vai cold 19,1 s → 1,9 s (1 mẫu); máy chủ `/me` khi vào LAX 859 → 78 ms; thiết bị B thấy thay đổi khi quay lại app hoặc ≤ 60 s.

## 4. Agent đang có việc
- Lead Data+API (Opus) `6d1ef147-7928-4b12-9063-7214eb1d8633` — workspace `wks_a9cc7bd377b6447a`. Đang: lượt đo cuối (worker V-2 `c462f47e-ad59-427f-a5ab-b84f394c166f`, luna) cho điểm danh + nhận xét chung 2 thiết bị và chọn/đổi vai (tài khoản GIẢ, đã cho phép đăng nhập thêm). Heartbeat của lead `85083fc7` (19:10). Brief `briefs/66-lead-data-api.md`.
- Lead Web UI + token (Opus) `a6d1bd53-d87d-4b91-a33c-b17ba2735c3a` — xong nút lưu + vá menu; idle. Lỗi Thấp còn: "Lưu" trong hộp rời màn BTVN mobile. Brief `briefs/65-lead-web-ui-audit.md`.
- Lead iOS (Sonnet) `7085080b-4664-4907-b40b-497f3105e75a` — worker iOS-20 `a1f2354b…` (luna); chờ báo test + smoke.
- Idle, không giao mới: Backend cũ `b5705550…`, Web cũ `960975fb…`, Design `8aaa69ba…`, Mascot `1d96218e…`, UX `c906ed27…`.
- Heartbeat của GL cũ `371624a0` đã được GL cũ xoá; GL mới tự tạo heartbeat 15 phút của mình.

## 5. Cần người dùng
1. Thử staging trên iPhone thật (FAB tab Học sinh, nút đáy Tạo lớp, bàn phím Nhập điểm; đồng bộ 2 máy).
2. Duyệt các màn chưa qua Claude Design: đăng ký phụ huynh, "chưa có con", "Mở bằng Safari", chữ form học sinh, hộp "Lưu trữ lớp".
3. Firebase (FCM) — người dùng sẽ gửi sau; push web/iOS chưa làm.
4. Cho phép commit docs/prototype và push/merge `mvp-backend`, `mvp-web`, `mvp-ios` vào `main` (chưa hỏi lần cuối).
5. Bước tiếp: iOS theo prototype mới (ux-v2, phụ huynh 2 tab, Mít, token chung) — GL đề xuất có, chờ người dùng.

## 6. Cạm bẫy
- Build web để deploy từ worktree tạm ở đúng commit khi cây đang có việc dở của lead khác.
- Hai lead cùng sửa `mvp-web`: Data+API giữ `src/data/**`, UI giữ phần còn lại — phải qua GL khi đổi hợp đồng repository.
- Reviewer luna đôi khi xong quá nhanh ⇒ yêu cầu bảng mục + file:dòng.
- Đĩa từng đầy; máy từng khởi động lại (mất /tmp). Không tự xoá dữ liệu người dùng.
