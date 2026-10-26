# U-1 · UX v2 foundation

Status: DONE_WITH_CONCERNS

## Đã làm

- Thêm motion tokens, reduced-motion tokens, `PageTransition`, `Collapse`, `useSlideIndicator` và `motionClass` theo prototype.
- Dùng `useAnimatedDialog` cho Modal/Sheet; cập nhật chuyển động dialog/sheet, thumb Segmented, phản hồi nhấn, nút `block`, chiều rộng nút desktop và căn dọc PageHeader.
- Bọc route giáo viên bằng `PageTransition`; thiết lập content desktop tối đa 1200px và hover/transition cho sidebar.
- Đưa `formatScore` thành hàm chuẩn ở `src/data/scoreFormat.ts`; `shared/format` chỉ re-export. Thêm test cho 10, 0, 0,5, 7,5, 14,5, null và parse dấu phẩy/dấu chấm.

## Kiểm chứng

| Lệnh / đối chiếu | Kết quả |
|---|---|
| `npm run typecheck` | Đạt |
| `npm test` | 29 file đạt, 1 file bỏ qua; 231 test đạt, 1 bỏ qua |
| `npm run build` | Đạt; JS khởi động 146,433 byte gzip; route đầu giáo viên 159,148 byte, phụ huynh 166,077 byte |
| Đóng dialog | `data-closing` hiện trong lúc chạy animation; dialog đóng sau animation |
| Reduced motion | Dialog mở bình thường và đóng ngay sau thao tác đóng |

Ảnh so sánh lớp học: `shots/u1/proto-mobile-sessions.png`, `real-mobile-sessions.png`, `proto-desktop-sessions.png`, `real-desktop-sessions.png`. Bản mobile khớp gần như hoàn toàn; bản desktop giữ cùng cấu trúc, ảnh prototype rộng 1440px còn ảnh web rộng 1360px nên vùng bảng co theo phần nội dung còn lại. Ảnh dialog chuẩn và web trên mobile nằm trong cùng thư mục.

## Còn lại cho U-2/U-3

Không sửa các file ngoài phạm vi U-1. Rà `src` còn các cách định dạng cũ cần chuyển sang `formatScore`:

- `src/features/reports/ReportPreview.tsx:8` — `formatScoreDot` dùng `toFixed(1)`.
- `src/features/reports/latestTest.ts:53` — nhánh định dạng dùng `toFixed(2)`.
- `src/roles/guardian/GuardianReportPage.tsx:184` — hiển thị điểm bằng `toFixed(1)`.
- `src/roles/guardian/guardianFormat.ts:53` — `scoreText` dùng `toFixed(1)`.

`src/data/scoreFormat.ts` còn `toFixed(2)` để làm tròn trước khi bỏ số 0 cuối; đây là hàm định dạng chuẩn mới, không phải cách hiển thị `.0` cũ.

## Sửa theo W-7

Date: 2026-10-23 · Commits: `92b4b08` and `f445b8a`.

- Tái hiện trên staging trước bản vá cuối bằng Chrome 155.0.8059.86: Edit Modal Đóng/Esc/nền bỏ khỏi `dialog[open]` sau 13/4/2ms, không có `data-closing` hay `animationend`; Sheet Đóng/Esc/nền mất 229/217/211ms với `sheetOut` 200ms. Nguyên nhân Modal là callback cha tháo component có điều kiện trước khi hook kịp chạy; hook cũ cũng nhận nhầm mọi `animationend` trên dialog, gồm event nền.
- `useAnimatedDialog` chỉ hoàn tất ở `animationend` khớp tên animation thoát trên chính dialog; reduced-motion/không animation đóng ngay, giữ fallback 400ms và huỷ lần đóng nếu mở lại. Modal/Sheet trì hoãn callback đóng, kể cả callback `onClose` được truyền xuống nút lồng trong children/footer, để component cha không unmount dialog trước animation.
- Unit test thêm event giả cho `dialogOut`/`sheetOut`, loại event nền/entrance, mở lại giữa chừng, reduced-motion, không animation, fallback 400ms và Modal conditional-unmount khi bấm Huỷ. Harness/script Chrome chạy tay: `src/shared/ui/dialogMotionProbe.html`, `dialogMotionProbe.tsx`, `measureDialogMotion.mjs`.
- Chrome 155.0.8059.86, staging sau deploy `https://ad53f61a.qlh-staging-web.pages.dev`, 1440×900 Modal và 390×844 Sheet. Đo từ thao tác tới lúc `dialog[open]` biến mất: Modal Đóng/Huỷ/Esc/nền = 245/213/240/226ms; Sheet Đóng/Esc/nền = 244/204/204ms. Cả 7 lượt nhận đúng event `_dialogOut`/`_sheetOut` 200ms trước khi gỡ `open`; Sheet thật không có nút Huỷ riêng, nên lượt Huỷ Sheet được đo trong harness local.
- Chrome local Vite trên cùng Chrome: Modal Đóng/Huỷ/Esc/nền = 259/225/234/226ms; Sheet = 230/235/224/220ms. Mở lại giữa animation giữ cả hai dialog mở; reduced-motion bỏ `open` sau 22ms/7ms.
- Rà mọi button/link hiển thị trong shared UI harness: mobile nhỏ nhất 44×44px; desktop nhỏ nhất 44×44px, vượt ngưỡng 36px. Không cần mở rộng vùng bấm.
- `npm run typecheck`, `npm test` (32 file đạt, 1 bỏ qua; 259 test đạt, 1 bỏ qua), build staging và `git diff --check` đạt. Initial JS gzip 146,619 byte. Demo teacher đăng nhập được; sau đo, bấm Đăng xuất thành công và Chrome quay lại `/dang-nhap`. Không ghi số điện thoại, mật khẩu hoặc token.
- Deploy branch `main` thành công theo lệnh yêu cầu; preview `https://ad53f61a.qlh-staging-web.pages.dev`, alias `https://qlh-staging-web.pages.dev`. Số W-7 39/57ms được xác nhận là lỗi, không còn coi là đo hợp lệ sau sửa.

## Sửa theo GL

Date: 2026-10-23 · Commit: `a11a28d`.

- Khi chưa chọn lớp, bốn mục Điểm danh/Điểm số/Học sinh/Báo cáo là `span[aria-disabled="true"]`, mờ và `not-allowed`; chúng không điều hướng, không active và không nhận hover nền. Mục Lớp là mục duy nhất active. Khi có lớp, các mục vẫn là `NavLink` và chỉ route khớp active; Điểm số vẫn giữ match `/bao-cao-diem`.
- Mobile không có bốn mục phụ trong tabbar (chỉ Lớp/Lịch/Cài đặt); kiểm tra tabbar vẫn có đúng một mục active khi chưa chọn lớp. Prototype `design/prototype/src/app/TeacherShell.tsx`/`shell.module.css` không có trạng thái khóa hay tooltip tương ứng, nên dùng kiểu khóa tối thiểu trong vỏ hiện tại, không thêm tooltip.
- Test tích hợp xác nhận 1 mục active + 4 mục khóa khi chưa chọn lớp, click mục khóa không đổi route, và route Điểm số active đúng khi đã chọn lớp. `npm run typecheck`, `npm test` (33 file đạt, 1 bỏ qua; 267 test đạt, 1 bỏ qua) và `npm run build` đều đạt.
- Đã build/deploy staging bằng lệnh yêu cầu; preview `https://bb9bc5f2.qlh-staging-web.pages.dev`. Script `scripts/e2e-staging-ui.mjs` dùng lại hồ sơ teacher/guardian đã đăng nhập (0 lần gửi form), không có lỗi runtime; teacher scores/offline/print đều PASS. Ảnh staging sau sửa: [`teacher-desktop-lop-all-classes.png`](shots/w8/teacher-desktop-lop-all-classes.png) và [`teacher-mobile-lop-all-classes.png`](shots/w8/teacher-mobile-lop-all-classes.png). Ảnh desktop xác nhận chỉ Lớp có nền xanh; các mục phụ muted và không tô nền.
