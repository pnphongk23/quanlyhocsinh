# Kiến trúc và stack

Cập nhật: 2026-10-18 (thêm workspace, role tuỳ chỉnh, bài giảng; trước đó 2026-10-17 chuyển backend từ Supabase sang Cloudflare) · Nguồn nghiệp vụ: [spec.md](spec.md). Tài liệu này chỉ nói cách xây; nghiệp vụ và phạm vi theo spec.

Dựa trên hai lượt review độc lập (hai model khác nhau) cho cùng một brief; phần backend sau đó đổi từ Supabase sang Cloudflare vì muốn chạy miễn phí và không giới hạn số dự án. Chỗ hai review khác nhau đã được chọn ở mục 2.

## 1. Mục tiêu và ràng buộc

- PWA ưu tiên iPhone, thêm bản web desktop cho giáo viên, chung một codebase.
- Mạng ở lớp học chập chờn: gọn nhẹ, thao tác tại lớp dùng được khi mất mạng.
- Đội nhỏ: ít thành phần phải vận hành, chạy trên gói miễn phí càng lâu càng tốt (khi cần thì nâng gói Workers 5 USD/tháng, không đổi kiến trúc).
- Phân quyền kiểm tra ở máy chủ, không tin máy khách.
- Nhiều nhân sự dùng chung một workspace; quyền theo role tuỳ chỉnh và phạm vi lớp được gán (spec mục 4).

## 2. Stack

| Lớp | Chọn | Loại bỏ |
|---|---|---|
| Frontend | Vite + React + TypeScript, React Router, CSS Modules | Next.js (không cần SSR sau đăng nhập), thư viện UI nặng |
| Dữ liệu trên máy | Dexie (IndexedDB) + `useLiveQuery`, một nguồn dữ liệu cục bộ duy nhất | Redux, TanStack Query (thêm một lớp cache thừa), CRDT (quá phức tạp) |
| Đồng bộ | Hàng đợi ghi (outbox) tự viết, gửi qua RPC idempotent | Background Sync API (Safari không hỗ trợ) |
| Backend | Cloudflare Worker dùng Hono, một điểm vào đồng bộ (nhận lệnh trong hàng đợi, trả thay đổi); cron trigger sinh buổi học | Supabase (giới hạn số dự án free), Firebase, VPS/Dokploy (phải vận hành, chưa có VPS), Railway (tốn phí, giữ làm dự phòng) |
| Cơ sở dữ liệu | D1 (SQLite), trigger SQLite ghi lịch sử, nhóm thay đổi bằng `batch` (atomic) | Postgres (không cần ở quy mô này; tầng repository giữ chỗ để chuyển sau) |
| Đăng nhập | Tự làm trong Worker: OTP lưu dạng băm, hạn ngắn, giới hạn số lần gửi và thử; SMS qua API nhà cung cấp Việt Nam (đề xuất eSMS); phiên đăng nhập dài bằng cookie hoặc token ký | Dịch vụ auth bên thứ ba |
| PDF | Sinh **trên máy giáo viên** khi phát hành (thư viện tải lười, nhúng font tiếng Việt), tải lên R2 riêng tư; bản chụp của phiên bản đã phát hành giữ nguyên | Sinh trên Worker free (10 ms CPU, có thể vượt), Chromium |
| Lưu file | R2 riêng tư (PDF báo cáo, tệp bài giảng); tải về bằng link ký ngắn hạn do Worker cấp sau khi kiểm quyền | Link công khai |
| Push | Web Push chuẩn (VAPID) gửi từ Worker, đăng ký lưu trong D1, kèm inbox trong DB | OneSignal/FCM SDK |
| Hosting | Cloudflare Pages (tĩnh, không giới hạn) | VPS |
| Lỗi | Sentry tải lười + log máy chủ, lọc SĐT và nội dung nhận xét | ELK tự host |

Chỗ hai review khác nhau và đã chọn: dùng chỉ Dexie (không TanStack Query), ngân sách JS 200 KB gzip. PDF ban đầu chọn sinh ở máy chủ, nay đổi sang máy giáo viên vì giới hạn CPU của Worker free.

## 3. Cấu trúc thư mục

```
quanlyhocsinh/
├─ AGENTS.md, CLAUDE.md        quy tắc làm việc cho agent
├─ docs/
│  ├─ spec.md                  nghiệp vụ, phạm vi (nguồn chuẩn)
│  └─ architecture.md          tài liệu này
├─ design/                     bản thiết kế tham chiếu, có thể lệch spec
├─ src/
│  ├─ app/                     router, provider, shell, thanh tab, service worker
│  ├─ data/                    chỉ nơi này chạm Dexie và mạng
│  │  ├─ db.ts                 schema Dexie, migration
│  │  ├─ outbox.ts             hàng đợi ghi, retry, backoff
│  │  ├─ sync.ts               kéo dữ liệu về, đẩy hàng đợi lên, xử lý xung đột
│  │  └─ repositories/         một file mỗi thực thể (lớp, học sinh, điểm danh, điểm...)
│  ├─ features/                mỗi nhóm tính năng một thư mục
│  │  ├─ auth/  classes/  students/  invites/
│  │  ├─ attendance/  scores/  comments/  reports/  settings/
│  │  ├─ lectures/  staff/     bài giảng; nhân sự, role, ma trận quyền
│  │  └─ (mỗi thư mục: components/, hooks/, tests/)
│  ├─ roles/                   chia theo loại phạm vi, không theo tên role
│  │  ├─ staff/                route và layout nhân sự (giáo viên, trợ giảng, Admin; mobile + desktop)
│  │  └─ guardian/             route và layout phụ huynh
│  ├─ shared/                  ui, hooks, tiện ích, định dạng ngày và số
│  └─ i18n/                    chuỗi tiếng Việt (chừa chỗ cho tiếng Anh, làm sau)
├─ worker/
│  ├─ src/
│  │  ├─ index.ts              Hono app, điểm vào
│  │  ├─ routes/               auth (OTP), sync, invites, reports, push, lectures, files, staff
│  │  ├─ db/                   tầng truy cập D1 duy nhất, bắt buộc lọc theo vai trò
│  │  └─ cron.ts               sinh buổi học theo lịch lặp
│  ├─ migrations/              schema D1, trigger lịch sử, chỉ mục
│  ├─ tests/                   test phân quyền theo từng vai trò, test đồng bộ
│  └─ wrangler.jsonc           binding D1, R2, cron
└─ public/                     manifest, icon, font
```

Quy ước:
- UI không gọi Dexie hay mạng trực tiếp; đi qua `data/repositories`.
- `roles/staff` và `roles/guardian` tách chunk để phụ huynh không tải mã của nhân sự. Menu và nút trong `staff` ẩn theo quyền của role; việc ẩn chỉ để dễ dùng, máy chủ mới là nơi chặn.
- Bảng điểm và báo cáo bản desktop là chunk riêng, tải lười.
- Sentry, thư viện tạo PDF và các thư viện nặng đều tải lười.
- Worker không truy vấn D1 ngoài `worker/src/db`; mọi hàm ở đó nhận danh tính đã xác thực và tự áp điều kiện `workspace_id`, quyền của role và phạm vi (lớp được gán hoặc quan hệ phụ huynh–học sinh).

## 4. Dữ liệu và phân quyền

- Mọi bảng dữ liệu có `workspace_id` (thay cho `teacher_id` cũ). Khoá ngoại phải cùng một workspace. Quan hệ phụ huynh và học sinh nằm ở `guardian_student`.
- Danh tính và quyền: `users` (đăng nhập bằng SĐT), `memberships` (user, workspace, role, trạng thái hoạt động; một user có thể có nhiều membership trong cùng workspace, mỗi membership một role), `roles` (workspace, tên, `scope_kind`, cờ hệ thống), `role_permissions` (role, nhóm quyền, mức `none|read|write`), `member_classes` (membership, lớp được gán, dùng cho role nhân sự).
- `scope_kind`: `workspace` (Admin, thấy mọi lớp), `assigned_classes` (nhân sự), `linked_students` (phụ huynh, theo `guardian_student`). Sáu nhóm quyền tuỳ chỉnh cố định trong mã: classes, students, sessions_attendance, scores, lectures, comments_reports. Quản trị (mời nhân sự, tạo/sửa role, gán lớp, đổi role, vô hiệu hoá tài khoản) không nằm trong ma trận: tầng `db` chỉ cho role hệ thống Admin làm. `scope_kind` đặt lúc tạo role theo loại (nhân sự hoặc phụ huynh) và không đổi sau đó; tầng `db` chặn gán role `linked_students` cho người không có `guardian_student`, và chặn role nhân sự có `scope_kind=workspace`. Ma trận của từng role nằm trong D1.
- Role Admin là role hệ thống, không sửa; mọi thao tác kiểm tra đảm bảo còn ít nhất một Admin hoạt động. Role `linked_students` bị chặn ở mức `read` và chỉ nhóm được phép bật (scores, sessions_attendance, comments_reports, lectures) ở tầng `db`, kể cả khi dữ liệu bị sửa trực tiếp.
- D1 không có RLS, nên phân quyền nằm ở tầng `worker/src/db`, qua một hàm kiểm quyền chung nhận danh tính đã xác thực, nhóm quyền, mức cần và tài nguyên (lớp hoặc học sinh). Nhân sự chỉ thấy lớp được gán (Admin thấy tất cả). Phụ huynh chỉ đọc con được cấp quyền, và chỉ thấy nhận xét, kết quả chấm BTVN và báo cáo đã gửi hoặc phát hành (đề BTVN thấy ngay). Không có đường truy cập dữ liệu nào đi vòng qua tầng này.
- Bài giảng: `lectures` (thư viện của workspace, có `created_by` và cờ lưu trữ), `lecture_sections` (bài giảng, thứ tự, tên, mô tả), `section_files` (phần, khoá R2, tên, kích thước, loại), `session_lectures` (buổi, bài giảng, thứ tự; nhiều-nhiều). Sửa bài giảng chỉ sửa một nơi nên mọi buổi thấy ngay. Quyền xem bài giảng: người tạo (`created_by`) luôn thấy cả nội dung và tệp khi membership đang hoạt động và role còn nhóm lectures mức đọc trở lên; người khác thấy khi role có nhóm lectures và có quyền xem một buổi đang dùng bài giảng đó; Admin thấy tất cả. Tệp tải lên R2 qua Worker (hoặc URL ký tải lên) sau khi kiểm quyền; kiểm loại và dung lượng ở Worker.
- Điểm: `tests` có `max` (điểm tối đa theo từng bài kiểm tra, số nguyên 1..1000, mặc định 15) và `archived` (cờ lưu trữ, thay cho xoá cứng khi bài đã có điểm). `scores` chỉ lưu giá trị điểm, phải trong khoảng 0..`tests.max`; không có cột vắng thi. Không có dòng (hoặc giá trị rỗng) là "Chưa có điểm". Xoá bài kiểm tra: chưa có điểm nào thì xoá hẳn; đã có điểm (kể cả 0) thì đặt `archived`. Bài `archived` bị bỏ khỏi bảng điểm, nhập điểm, báo cáo và app phụ huynh, không tính vào đâu, chưa có màn khôi phục. Sửa điểm tối đa không được hạ dưới điểm cao nhất đã nhập của bài, kiểm ở tầng `db`.
- Nhận xét buổi: `session_comments` (buổi, học sinh, `stars` 1..3, `note` tự do, trạng thái nháp/đã gửi, thời gian gửi, thời gian sửa). Sửa sau khi gửi giữ trạng thái đã gửi và phụ huynh đọc bản mới ngay; không có bản nháp song song. Câu mẫu của ba mức cố định trong mã (spec mục 4), không lưu theo từng nhận xét, nên máy khách chỉ hiện câu theo `stars`.
- BTVN: `homework_sections` (buổi giao, loại `vocabulary|reading|speaking|exercise`, duy nhất theo buổi và loại, tiêu đề, mô tả), `homework_grades` (phần, học sinh, mức `excellent|done|not_done`). Kết quả chấm gửi theo phiếu buổi học: gửi `session_comments` của buổi N+1 thì phụ huynh thấy kết quả chấm BTVN buổi N của em đó, trong cùng một `batch`. Buổi chấm là buổi kế tiếp chưa hủy của lớp, suy ra khi đọc, không lưu. Phụ huynh đọc được `homework_sections` ngay; `homework_grades` chỉ khi phiếu buổi chấm đã gửi (chấm hoặc sửa sau khi gửi thì phụ huynh thấy ngay). Xoá `homework_sections` bị chặn ở tầng `db` khi phần đã có `homework_grades`. Cả hai thuộc nhóm quyền comments_reports.
- Phiên đăng nhập mang `membership_id` đang hoạt động; mọi yêu cầu và lệnh trong hàng đợi gắn theo đó, máy chủ kiểm membership thuộc về user và còn hoạt động. Đổi vai trò là đổi membership đang dùng; cache Dexie tách theo (user, workspace, membership). Lệnh chờ giữ nguyên membership lúc tạo.
- Lịch sử ghi người thực hiện bằng `user_id` của người đang đăng nhập, ghi qua trigger như trước.
- Lịch sử sửa điểm danh và điểm (trước, sau, người sửa, thời gian) ghi bằng trigger SQLite trong D1, cùng lô `batch` với thay đổi, không ghi từ máy khách.
- Lời mời: bảng `invites` lưu token đã băm, `expires_at` 7 ngày, `used_at`. Dùng một lần, nguyên tử, sau khi OTP khớp SĐT đã khai. Gửi lại thì huỷ link cũ. Đổi SĐT thì gỡ quyền cũ. Tên con chỉ trả về sau OTP đúng. Lời mời nhân sự dùng cùng bảng, thêm `role_id` và danh sách lớp được gán; chấp nhận thì tạo `memberships` và `member_classes` trong một `batch`.
- Hồ sơ nghỉ học và chuyển lớp: giữ lịch sử, đánh dấu ngày vào và ngày rời lớp (spec mục 3).

## 5. Offline-first

- **Lưu trên máy** (theo tài khoản): lớp, học sinh, buổi sắp tới và vài tháng gần nhất, bài kiểm tra, điểm danh, điểm, nhận xét nháp, BTVN và kết quả chấm. Phụ huynh có bản cache chỉ đọc kèm thời gian cập nhật.
- **Ghi:** thay đổi và dòng hàng đợi cùng một transaction IndexedDB. Trạng thái nội bộ (chưa lưu, đã lưu trên máy, đã đồng bộ, lỗi) vẫn theo dõi nhưng giao diện chỉ hiện lỗi (đã chốt 2026-10-18).
- **Lệnh trong hàng đợi:** UUID, khoá bản ghi, `base_version`, nội dung. Gửi tuần tự, retry có backoff. Máy chủ kiểm quyền, bỏ qua UUID trùng (bảng các lệnh đã áp dụng), cập nhật và ghi lịch sử trong cùng một `batch` D1. Chỉ xoá lệnh khi máy chủ xác nhận.
- **Khi nào đồng bộ:** lúc mở app, khi có mạng trở lại, khi app lấy lại focus, định kỳ lúc đang mở. iOS không đồng bộ được khi app đã đóng.
- **Xung đột:** hai thiết bị sửa cùng một ô điểm danh hoặc điểm. Thiết bị tới trước lên phiên bản mới. Thiết bị tới sau nhận xung đột, hai giá trị đều được giữ, giáo viên chọn. Không ghi đè theo giờ của thiết bị.
- **Offline được:** điểm danh, nhập điểm, tạo bài kiểm tra, soạn nhận xét, giao và chấm BTVN.
- **Cần mạng:** OTP, mời và duyệt phụ huynh và nhân sự, sửa SĐT, gửi nhận xét, phát hành báo cáo, lưu trữ lớp, tải tệp bài giảng lên hoặc xem. "Gửi nhận xét" có thể xếp hàng nhưng phải hiện rõ "sẽ gửi khi có mạng". Tạo bài giảng mới và gắn vào buổi dùng hàng đợi như các thao tác khác; sửa bài giảng đã có cần mạng.
- **Quyền khi offline:** quyền được cache trên máy chỉ để ẩn hoặc khoá nút. Khi đồng bộ hoặc mở app, máy chủ kiểm lại; nếu membership bị thu hồi thì ẩn cache của membership đó, lệnh bị từ chối được giữ lại và hiện lỗi, không tự xoá.
- **Ngoại lệ duy nhất cho quy tắc chỉ hiện lỗi:** sau khi bấm Gửi nhận xét lúc mất mạng, hiện một thông báo ngắn "sẽ gửi khi có mạng".
- **Bảo vệ dữ liệu:** chặn đăng xuất khi còn lệnh chờ (giải thích lý do khi chặn). Gọi `navigator.storage.persist()` khi hỗ trợ và bắt lỗi quota. Không hiện thường trực số thay đổi chưa đồng bộ; chỉ hiện khi lỗi.
- **Service worker:** chỉ cache phần khung app và font (precache). Dữ liệu API đi qua Dexie, không qua cache của service worker. Không tự reload khi người dùng đang nhập.

## 6. Hiệu năng

- Mục tiêu (chưa đo): JS ban đầu không quá 200 KB gzip, JS + CSS không quá 250 KB. Đo bằng `size-limit` trong CI và Lighthouse với mạng chậm, rồi siết lại nếu dư.
- Chia code theo vai trò và theo route. Font hệ thống, icon SVG.
- Bản web desktop dùng chung codebase và nghiệp vụ, chỉ khác layout và route. Làm sau mobile.

## 7. Rủi ro chính

| Rủi ro | Giảm thiểu |
|---|---|
| iOS PWA: không có Background Sync; push chỉ sau khi cài (iOS 16.4+); dữ liệu của tab Safari và của app đã cài tách riêng nên cài xong phải đăng nhập lại; Zalo mở link không cài được | Màn hướng dẫn "Mở bằng Safari", đồng bộ khi mở app, inbox trong app |
| Safari có thể thu hồi lưu trữ khi thiếu dung lượng | Xin persist, bắt lỗi quota, hiện lệnh chờ, đồng bộ sớm |
| OTP SMS ở Việt Nam: Brandname, mẫu tin, tin đến trễ, chi phí | Thử nhiều nhà mạng, chuẩn hoá +84, giới hạn số lần gửi và thử mã, đặt nhà cung cấp SMS sau một giao diện riêng để đổi được, phiên đăng nhập dài |
| Mất hoặc sai dữ liệu khi đồng bộ | Hàng đợi idempotent, chỉ xoá khi có xác nhận, test mất mạng giữa chừng và hai thiết bị, test migration IndexedDB |
| Lộ dữ liệu hoặc gán nhầm con do phân quyền tự viết sai (không có RLS) | Một tầng truy cập D1 duy nhất, test tự động theo từng vai trò (giáo viên khác, phụ huynh khác, chưa đăng nhập), logic mời trong Worker |
| Chạm hạn mức free của Cloudflare (100.000 request, 100.000 hàng ghi mỗi ngày; D1 chặn truy vấn khi vượt) | Gộp nhiều thay đổi vào một request đồng bộ, đặt chỉ mục để tránh quét bảng, theo dõi dùng thử, nâng gói Workers 5 USD/tháng khi cần |
| Worker free chỉ có 10 ms CPU mỗi request | Việc nặng (PDF) làm ở máy khách; Worker chỉ xác thực, kiểm quyền, đọc ghi D1 |
| Role tuỳ chỉnh cấu hình sai làm lộ dữ liệu, hoặc Admin tự khoá mình | Role Admin cố định, luôn còn một Admin hoạt động, phụ huynh bị chặn ở mức đọc và nhóm cho phép ngay tại tầng `db`, test phân quyền theo từng role và từng phạm vi |
| Tệp bài giảng lớn hoặc độc hại, tốn dung lượng R2 | Giới hạn loại và dung lượng ở Worker, link ký ngắn hạn, chỉ cấp sau khi kiểm quyền |

Khi đổi SĐT hoặc đổi role, quyền phía máy chủ gỡ ngay nhưng cache offline đã tải trên máy chưa thu hồi tức thì được.

## 8. Lộ trình

1. **Nền tảng:** schema D1 (đã có workspace, role, ma trận quyền, gán lớp, role mặc định cài sẵn), tầng truy cập và test phân quyền theo từng role; mời + OTP (thử với nhà cung cấp SMS thật); điểm danh và nhập điểm với hàng đợi ghi và xung đột ngay từ đầu.
2. **Hoàn thiện mobile theo spec mục 8:** nhận xét, báo cáo tháng + PDF, push, màn hướng dẫn cài PWA; chạy thử với 1–2 giáo viên trên iPhone thật, mạng yếu.
3. **Mở rộng:** bài giảng (R2), màn quản lý nhân sự và role, web desktop (bảng điểm, báo cáo), lịch sử, kênh Zalo/SMS, rồi giao diện tiếng Anh.

## 9. Chưa kiểm chứng

- Kích thước thực của các thư viện, nên mọi con số ở mục 6 là mục tiêu.
- Giới hạn Cloudflare ghi ở mục 7 lấy từ tài liệu Cloudflare ngày 2026-10-17; số database D1 tối đa mỗi tài khoản và việc gọi API eSMS từ Worker chưa kiểm chứng. Mức dùng thực tế so với hạn mức free chưa đo.
- Phí và hồ sơ Brandname; thủ tục Zalo ZNS.
- Giới hạn loại và dung lượng tệp bài giảng, chi phí R2 thực tế khi có nhiều tệp.
- Hành vi lưu trữ và push trên iPhone thật, kể cả khi thiếu dung lượng.
- Repo chưa có mã, nên chưa thử OTP, PDF hay đồng bộ.
