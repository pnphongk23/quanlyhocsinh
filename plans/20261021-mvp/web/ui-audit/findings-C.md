# Findings team C · Phụ huynh + tài khoản + PWA (audit trước khi sửa)

Ngày: 2026-10-23 · Nguồn ảnh: `plans/20261021-mvp/web/shots/ui-audit/before/C/<viewport>/` (bộ chụp 11:20:03–11:20:05, theo `inventory.md`) · Đối chiếu: `design/ux-v2/guardian-ia.md`, `changes.md` (mục 3), `rules.md`, `design/tokens/tokens.css`, `briefs/71`, `74`, `76`.

Ghi chú: ảnh dùng SĐT giả; báo cáo không chép số. Banner "Lỗi lưu" không xuất hiện ở ảnh C.

## Bảng phát hiện

| ID | Màn (route) | Viewport | Ảnh | Vị trí | Vấn đề | Mức | Đề xuất | Token liên quan |
|---|---|---|---|---|---|---|---|---|
| C-01 | `/cai-dat` (chạm avatar) | 390x844, 375x667, 430x932 | `390x844/72-settings-main.png`; `375x667/89-settings-main.png`; `430x932/106-settings-main.png` | Đầu trang | Không có nút quay lại, không có chip con/avatar của khung phụ huynh. Tiêu đề "Cài đặt" cách mép trên khoảng 10–12px, không có hàng header như các màn con. Lệch `guardian-ia.md` mục Khung ("thêm nút quay lại khung phụ huynh") | Cao | Thêm nút quay lại về khung và hàng header như màn con (nút 44px, cùng `--page-top`). Kiểm lại safe-area trên iPhone | `--page-x`, `--page-top`, `--tap` |
| C-02 | `/ph` và các màn con | 390x844 | `390x844/58-guardian-home-main.png`; `390x844/62-guardian-session-main.png` | Cặp "Điểm" / "Báo cáo tháng"; danh sách buổi | Khoảng cách giữa thẻ khoảng 8px (đo 16px trên ảnh 2x). Token `--card-gap` mobile là 12px | Vừa | Đặt gap thẻ theo `--card-gap` | `--card-gap` |
| C-03 | `/ph`, `/ph/nhan-xet`, `/ph/buoi/:id`, `/cai-dat` (desktop) | 1440x900 | `1440x900/109-guardian-home-main.png`; `1440x900/123-settings-main.png` | Desktop, cột trái và phải | Khoảng cách giữa thẻ 8px (token desktop 16px). Padding trong thẻ không đồng nhất: 16px (danh sách buổi, thẻ số), 20px (thẻ "Điểm"), 24px (thẻ "Hồ sơ") | Vừa | Thống nhất theo `--card-gap` và `--card-pad` của desktop | `--card-gap`, `--card-pad` |
| C-04 | `/ph/diem`, `/ph/buoi/:id`, `/ph/bao-cao` (so với `/ph`) | 390x844 | `390x844/62-guardian-session-main.png`; `390x844/64-guardian-scores-main.png`; `390x844/66-guardian-reports-main.png`; so với `390x844/58-guardian-home-main.png` | Hàng header đầu trang | Nút quay lại cao hơn chip/avatar của trang chủ 4px (nút cách mép trên 12px, chip 8px). Hàng header nhảy khi chuyển màn | Vừa | Cùng chiều cao và cùng `top` cho hàng header. Dùng chung một component nếu có thể | `--page-top`, `--tap` |
| C-05 | `/pwa` | 390x844, 375x667, 430x932, 1440x900 | `390x844/74-pwa-guide-main.png`; `375x667/91-pwa-guide-main.png`; `430x932/108-pwa-guide-main.png`; `1440x900/125-pwa-guide-main.png` | Toàn màn | Hiện "Không tìm thấy màn hình" và link "Về trang đầu" (gạch chân mặc định). Không có khung app, tab dưới hay đầu trang. Đây không phải màn hướng dẫn cài PWA (spec mục 6). Inventory ghi "unavailable" nhưng file vẫn có nội dung này | Vừa | Nếu bản đầu chưa có màn hướng dẫn thì không dẫn người dùng tới `/pwa`. Nếu có thì làm theo design. Trang không tìm thấy nên dùng khung và token | `--color-primary`, `--color-bg`, `--page-x` |
| C-06 | `/chon-vai-tro` | 390x844, 375x667, 430x932, 1440x900 | `390x844/71-role-picker-main.png`; `375x667/88-role-picker-main.png`; `430x932/105-role-picker-main.png`; `1440x900/122-role-picker-main.png` | Tiêu đề phụ | Chỉ có một vai trò (Phụ huynh) nhưng câu nói "có hơn một vai trò. Chọn một để vào". Spec mục 4 chỉ hiện màn chọn khi có nhiều hơn một role (xem mục "Không chắc") | Vừa | Kiểm điều kiện hiện màn chọn vai trò. Nếu chỉ có 1 vai trò thì đổi câu hoặc vào thẳng | — (copy) |
| C-07 | `/cai-dat/doi-mat-khau` | 390x844, 375x667, 430x932 | `390x844/73-change-password-main.png`; `375x667/90-change-password-main.png`; `430x932/107-change-password-main.png` | Dòng "Tối thiểu 8 ký tự" | Gợi ý đứng cạnh một chấm xám gần bằng nền (`#f0f2f5` trên `#f6f7f9`). Chấm không đổi trạng thái khi đạt yêu cầu, người dùng không biết đã đủ điều kiện | Vừa | Đổi thành dấu tick hoặc màu theo trạng thái, chữ dùng màu muted đủ tương phản | `--color-muted`, `--color-success`, `--color-neutral-soft` |
| C-08 | `/ph/diem` (chuyển tháng) | 390x844, 375x667, 430x932 | `390x844/64-guardian-scores-main.png`; `375x667/81-guardian-scores-main.png`; `430x932/98-guardian-scores-main.png` | Thanh "< Tháng 10 >" | Hai mũi tên hiển thị nhỏ (khoảng 12px) và mờ. Đây là điều khiển chính của màn điểm. Vùng bấm có vẻ dưới 44px. Chưa đo DOM nên chưa chắc | Vừa | Đo vùng bấm trên DOM. Nếu dưới 44px thì bọc mũi tên trong vùng 44×44, tăng độ tương phản khi bật | `--tap`, `--color-muted` |
| C-09 | `/ph` (số nhanh) | 375x667 | `375x667/75-guardian-home-main.png` | Hai thẻ số nhanh | Nhãn xuống dòng mồ côi: "Chuyên cần tháng / 10", "Bài kiểm tra mới / nhất" | Thấp | Rút nhãn ngắn hơn hoặc cho nhãn xuống dòng đều | `--text-sm`, `--card-pad` |
| C-10 | `/ph/nhan-xet`, `/ph/buoi/:id` | 390x844, 375x667, 430x932, 1440x900 | `390x844/60-guardian-comments-main.png`; `390x844/62-guardian-session-main.png` | Câu mẫu 1 sao | Hiển thị "sao 🌟 . Chưa" có khoảng trắng trước dấu chấm. Spec mục 4 là "🌟. Chưa". Có thể do render emoji, cần kiểm chuỗi trong mã | Thấp | Kiểm chuỗi câu mẫu, giữ đúng nguyên văn spec | — |
| C-11 | `/cai-dat` (desktop) | 1440x900 | `1440x900/123-settings-main.png` | Breadcrumb | Breadcrumb "Cài đặt / Tài khoản" nhưng tiêu đề là "Tài khoản của tôi" | Thấp | Thống nhất tên breadcrumb và tiêu đề | — |
| C-12 | `/quen-mat-khau` (desktop) | 1440x900 | `1440x900/121-forgot-password-main.png` | Đầu và đáy thẻ | Hai lối quay lại cùng đích: link "Quay lại đăng nhập" phía trên và nút cùng tên ở đáy | Thấp | Giữ một. Nút chính ở đáy, link phụ ở trên (theo `rules.md` mục 2) | `--button-h-md` |
| C-13 | `/cai-dat/doi-mat-khau` | 390x844, 1440x900 | `390x844/73-change-password-main.png`; `1440x900/123-settings-main.png` | Nút "Lưu mật khẩu mới" (disabled) | Chữ trắng trên nền xám nhạt, gần như không đọc được. Disabled được phép mờ nhưng vẫn cần đọc được | Thấp | Giữ trạng thái disabled nhưng tăng tương phản nền và chữ | `--color-muted`, `--color-neutral-soft` |
| C-14 | `/ph/diem`, `/ph/bao-cao` (desktop) | 1440x900 | `1440x900/115-guardian-scores-main.png`; `1440x900/117-guardian-reports-main.png` | Thẻ nội dung | Thẻ một dòng kéo đủ 896px, phần lớn trống bên phải | Thấp | Giới hạn chiều rộng thẻ hoặc dùng bố cục theo `rules.md` mục 1 | `--content-max` |

Tổng: Cao 1 · Vừa 7 · Thấp 6.

## Đã kiểm, đạt

- Lề ngang đúng token: mobile 20px (`--page-x`), desktop nội dung 896px căn giữa trong vùng 960px, lề 32px.
- Mobile: tab dưới đúng 2 mục ("Lớp học của con", "Nhận xét của cô"). Chip con có ▾ khi có 2 con. Không có FAB trên màn phụ huynh.
- Desktop: thanh trên đủ chip, 2 tab, avatar. Nội dung không vượt 960px.
- Vùng bấm đạt 44px ở nút quay lại, chip con, avatar (đo trên ảnh 2x).
- Màn "Báo cáo" có trạng thái rỗng đúng nội dung ("Cô chưa phát hành báo cáo tháng này").
- Không thấy chuỗi "Vắng thi", "trung bình", "mã đăng ký", "lời mời" hay "mật khẩu tạm" trên các ảnh đã đọc (quyết định 76).
- Quên mật khẩu hiển thị đúng quy tắc người vận hành đặt lại thủ công (quyết định 71).

## Chuyển team khác

- **Team T (shell, component chung, `src/app`, `src/shared`):**
  - C-05: trang không tìm thấy không có khung.
  - C-02, C-03: nếu thẻ dùng component chung thì khoảng cách và padding nằm ở đó.
  - C-04: nếu hàng header dùng chung.
  - C-07, C-08, C-13: nếu ô gợi ý, nút chuyển tháng hoặc nút disabled dùng component chung.
- **Team T (script chụp `scripts/ui-audit-capture.mjs`):**
  - Ảnh 375 home "main" chụp toàn trang nên tab dưới nằm giữa ảnh (`375x667/75-guardian-home-main.png`). Đây là lỗi chụp, không phải lỗi UI.
  - Các route đăng nhập và đăng ký chụp ra trang đã đăng nhập (xem mục "Không chắc").
  - Thư mục `before/C/` có file trùng số từ lần chụp 11:19 (ví dụ `390x844/58-guardian-reports-main.png`, `390x844/60-login-main.png`), không khớp `inventory.md`. Đây là file cũ. Ảnh đúng là các file 11:20. Tôi không xoá file nào.

## Không chắc

1. **Đăng nhập `/dang-nhap` và đăng ký `/dang-ky`: chưa có ảnh đúng.** Ảnh 390 `68-login-main` và 375 `85-login-main`, 430 `102-login-main`, 1440 `119-login-main` đều là trang chủ phụ huynh. Ảnh register `69`, `86`, `103`, `120` đều là "Chọn vai trò". Phiên đã đăng nhập nên bị chuyển hướng. Không đánh giá được màn đăng nhập và đăng ký (quyết định 74, 76: phụ huynh tự đăng ký).
2. **Chưa có ảnh:** sheet "Chọn con" (chip ▾), trạng thái không có con được liên kết (`guardianEmpty`), trạng thái lỗi hoặc mất mạng.
3. **Safe-area iPhone:** ảnh chụp bằng trình duyệt desktop, không có notch hay tab safe-area. C-01 cần xác nhận trên iPhone thật.
4. **Tràn chữ với tên dài tiếng Việt:** fixture chỉ có tên ngắn ("Phụ huynh Demo", "Lớp 6A"), chưa kiểm được.
5. **Vùng bấm thật (C-08, icon mắt ở ô mật khẩu):** chỉ ước lượng từ ảnh, cần đo DOM.
6. **Cài đặt thiếu mục:** spec mục 5.2 có "Việt/Anh" và "thông báo". Ảnh không có. Việt/Anh là "Làm sau" (spec mục 8). Chưa rõ "thông báo" có trong bản đầu hay không, nên không kết luận.
7. **Vai trò chỉ có 1 role nhưng vẫn hiện màn chọn (C-06):** có thể do fixture có hai membership mà một cái không hiển thị. Cần xác nhận dữ liệu.
8. **/pwa:** inventory ghi "unavailable" nhưng file hiển thị "Không tìm thấy màn hình". Không rõ route có được đưa vào bản này hay không.
9. **Trạng thái "Mới" và "Sắp học":** không xác minh được từ ảnh một buổi. Mascot "chỉ mục mới nhất" không kiểm được vì ảnh chỉ có một mục.
10. **Ảnh chưa đọc riêng (15 ảnh):** `375x667/76, 78, 80, 82, 84` (cuộn đáy), `430x932/92` (trang chủ main), `430x932/93, 95, 97, 99, 101` (cuộn đáy), `1440x900/112, 114, 116, 118` (cuộn đáy). Các ảnh cuộn đáy cùng route với ảnh main đã đọc, nội dung ngắn. Chưa đọc đủ theo brief. Nên đọc trước khi chốt.

## Phạm vi đã đọc

- 390x844: 17 ảnh (58–74), gồm cả 68 và 69 (nội dung sai).
- 375x667: 12 ảnh (75, 77, 79, 81, 83, 85, 86, 87, 88, 89, 90, 91).
- 430x932: 11 ảnh (94, 96, 98, 100, 102, 103, 104, 105, 106, 107, 108).
- 1440x900: 13 ảnh (109, 111, 113, 115, 117, 119, 120, 121, 122, 123, 124, 125) và 110 (cuộn đáy trang chủ, nội dung giống 109).

Status: DONE_WITH_CONCERNS
Summary: 14 phát hiện: Cao 1, Vừa 7, Thấp 6. Đã đọc ảnh các màn chính ở 4 viewport. Chưa đọc 15 ảnh cuộn đáy và 430 trang chủ main. Màn đăng nhập và đăng ký chưa có ảnh đúng.
Concerns/Blockers: ảnh login và register bị chuyển hướng sang trang đã đăng nhập; script chụp và thư mục `before/C/` có file trùng số từ lần chụp cũ (cần T xử lý). Không sửa mã, không commit.
