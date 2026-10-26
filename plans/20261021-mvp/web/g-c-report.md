# G-C — Mít WebP, UI parity và PWA

Status: DONE_WITH_CONCERNS

## Đã làm

- Chuyển Mít sang 20 ảnh WebP 1x/2x; `Mascot` dùng `srcSet`, khai báo tỷ lệ kích thước, tải lazy và bỏ qua với trình đọc màn hình. `EmptyState` dùng kích thước 96px như prototype. Không còn PNG trong `public/mascot`.
- Tổng ảnh Mít: **405.312 bytes (395,8 KB)**. Ảnh chào 1x: **12.060 bytes**; ảnh 2x được trình duyệt tải ở DPR 2: **28.266 bytes**. Ảnh nằm trong `public`, không nằm trong JS.
- Thêm màn hướng dẫn cài PWA ở lớp vỏ đầu app. Hiện trong trình duyệt nhúng hoặc Safari iPhone chưa cài; ẩn trong standalone. Nút **Dùng tạm trên trình duyệt** đóng hướng dẫn và lưu lựa chọn; đã kiểm tra route `/dang-nhap` vẫn mở và lựa chọn còn sau khi tải lại.
- Không thêm mục Cài đặt: ảnh 07 và prototype hiện tại không có mục hướng dẫn cài.
- Gỡ các vết lời mời trong web: hai ghi chú form học sinh, tên test lịch và `/otp` trong test route không-MVP. `srcwalk discover 'mời,invite,otp' --scope src`: không còn kết quả sau chỉnh sửa.
- Bảng chuỗi Design chưa có câu ghi chú form học sinh; đang dùng tạm **“Phụ huynh dùng số này để đăng ký và đăng nhập.” — cần duyệt chữ**.
- Nối sửa buổi lẻ với `PATCH /sessions/{id}`: modal đợi Promise xác nhận máy chủ, giữ nguyên dữ liệu cục bộ nếu lỗi, khóa lưu khi đang gửi và hiện thông báo lỗi nghiệp vụ nguyên văn. Ảnh 390×844: [lỗi sửa buổi lẻ](shots/gc/real-extra-session-error-mobile.png).

## Đối chiếu prototype

| Màn / nhóm | Khác biệt | Xử lý |
|---|---|---|
| Mít trong Đăng nhập, trạng thái rỗng, nhận xét theo sao, BTVN, Báo cáo | Asset cũ PNG và thiếu đủ pose; `EmptyState` nhỏ hơn prototype | Đã thay theo `design/prototype/src/shared/ui/Mascot.tsx`, `EmptyState.tsx`, `ui.module.css`; các nơi gọi giữ đúng pose prototype. |
| PH · Mở bằng Safari | Prototype web chưa có màn này; theo ảnh Claude Design `design/guardian/ref/06.png` và spec mục 6 | Đã dựng responsive. **Prototype chưa có; theo ảnh Claude Design ref/06; cần người dùng duyệt.** Ảnh ref và ảnh bản thật: [ref-06](shots/gc/ref-06.png), [390×844](shots/gc/real-pwa-guide-mobile.png), [1360×934](shots/gc/real-pwa-guide-desktop.png). |
| Lớp, Lịch, Học sinh, Chi tiết lớp (5 tab), Buổi học (3 tab), Bài kiểm tra, Điểm, Báo cáo | Các cặp W-5 khớp về cấu trúc; khác dữ liệu fixture/staging như sĩ số, buổi, điểm, tháng và trạng thái | Đối chiếu bộ ảnh W-5 ở 390×844 và 1360×934: [W-5 report](w5-report.md), [ảnh](shots/w5/). Không phát sinh sửa UI trong lượt này. |
| Tạo lớp | Bố cục, chữ, khoảng cách, ngày và giờ khớp; tên workspace/sidebar lấy từ fixture (Teacher Fixture thay cô Lan) | Chụp lại cặp 390×844 và 1360×934: [proto mobile](shots/gc/proto-class-create-mobile.png), [real mobile](shots/gc/real-class-create-mobile.png), [proto desktop](shots/gc/proto-class-create-desktop.png), [real desktop](shots/gc/real-class-create-desktop.png). Không cần sửa. |
| Tạo/sửa/lưu trữ bài kiểm tra; xem trước báo cáo | W-3 có ảnh riêng cho các trạng thái; khác số liệu fixture | Xem [W-3 report](w3-report.md) và [ảnh](shots/w3/). Không phát sinh sửa UI trong lượt này. |
| Đăng nhập, Quên mật khẩu, Chọn vai trò, Cài đặt, Đổi mật khẩu | W-4 ghi các cặp ảnh; footer và thẻ gợi ý đăng nhập khác prototype theo quyết định GL 74.1; role guardian khác dữ liệu fixture | Xem [W-4 report](w4-report.md) và [ảnh](shots/w4/). Chữ đăng ký/lỗi phụ huynh thuộc G-B, không sửa. |
| Học sinh | Ghi chú SĐT phụ huynh đổi sang câu ngắn theo quyết định 76 | Dùng câu tạm ở trên; cần Design duyệt chữ. |

Không làm màn “Mở bằng Safari” thành điều kiện đăng nhập. Bản Android vẫn có ghi chú mở bằng Chrome như ảnh ref; màn desktop hiện là responsive theo cùng nội dung, chưa có ảnh desktop Claude Design để đối chiếu.

## Kiểm chứng

- `src/features/pwa/pwaPrompt.test.ts`: **10/10 đạt**, gồm UA Zalo, Facebook, Messenger, Instagram, Line, Safari iPhone, desktop và Android.
- Playwright ở 390×844: màn hướng dẫn hiện với UA Zalo; bỏ qua mở Đăng nhập; sau reload vẫn vào Đăng nhập. Safari iPhone chưa cài hiện hướng dẫn; `navigator.standalone=true` không hiện.
- Ảnh bản thật kiểm tra đúng 390×844 và 1360×934.
- `npm test -- src/features/pwa/pwaPrompt.test.ts src/features/schedule/scheduleModel.test.ts src/test/routes.test.tsx`: **61/61 đạt**. `srcwalk discover 'mời,invite,otp' --scope src`: không còn kết quả.
- `npm run typecheck`: đạt, exit 0 (cũng chạy trong build).
- `npm test`: **205 đạt, 3 lỗi, 1 bỏ qua**. Ba lỗi còn lại ở `src/roles/guardian/guardianRender.test.tsx`, `src/roles/guardian/guardianRouting.test.tsx` và `src/features/auth/account.test.tsx`, ngoài phần G-C.
- `npm run build` và `npm run typecheck`: đạt, gồm TypeScript, Vite và `check-bundle`. JS entry gzip **145,851 bytes**, CSS entry gzip **2,799 bytes**; lượt đầu staff **158,246 bytes**, lượt đầu guardian **165,436 bytes** JS gzip. Mascot tải tách khỏi JS; Vite còn cảnh báo import tĩnh/động `src/data/sync.ts`.
- Sửa buổi lẻ: `src/features/class-space/AddSessionModal.test.tsx` **5/5 đạt**, kiểm tra kết quả giả của máy chủ, lỗi nghiệp vụ nguyên văn, giữ modal mở và lỗi ngoại tuyến; `src/test/guardian-data.test.ts` chạy cùng đạt **8/8** (13/13 tổng).
- Ảnh màn lỗi sửa buổi lẻ chụp bằng Playwright ở **390×844** với phản hồi 409 giả; nội dung thông báo khớp phản hồi máy chủ.

## Còn lại

- Duyệt câu ghi chú form học sinh và ảnh Claude Design mới cho desktop nếu desktop PWA cần đối chiếu riêng.
- Làm xanh ba test auth/guardian đang lỗi trước khi xem xét tích hợp chung. Typecheck và build xanh; lỗi test toàn repo không nằm ở file G-C.
