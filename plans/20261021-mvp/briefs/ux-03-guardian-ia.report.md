# ux-03 · Phụ huynh 2 tab: báo cáo

Status: DONE_WITH_CONCERNS (xem "Việc còn lại / cần lead quyết").

## Thay đổi theo file (`design/prototype/src`)

**Mới**
- `roles/guardian/GuardianClassPage.tsx`: tab 1 `/ph`. Đầu lớp (tên lớp, lịch, giáo viên), 2 số nhanh (chuyên cần tháng, bài kiểm tra mới nhất), 2 hàng lối vào Điểm / Báo cáo tháng, danh sách buổi nhóm theo tháng (nhãn điểm danh, sao, "Mới"). Desktop: 2 cột `minmax(0,1fr) 380px`, cột phải (số nhanh + 2 hàng) dính.
- `roles/guardian/GuardianSessionPage.tsx`: `/ph/buoi/:sessionId`, gộp GuardianTicketPage + GuardianHomeworkPage: phiếu, điểm danh của con, kết quả BTVN buổi trước, BTVN buổi này. Buổi huỷ: banner "Đã huỷ" ở đầu, không có phiếu/điểm danh. Desktop 2 cột.
- `roles/guardian/guardianSeen.ts`: nhớ buổi đã mở (localStorage `guardian-seen-sessions-v1`, chỉ trạng thái hiển thị, không đụng `src/data`) để bật/tắt chấm "Mới".

**Viết lại**
- `GuardianShell.tsx` + `guardianShell.module.css`: đầu trang chip con (▾ + sheet "Chọn con" khi ≥ 2 con) và avatar → `/cai-dat`; nav 2 tab. Mobile: tab dưới; desktop ≥ 1024px: thanh trên (chip · 2 tab · avatar), nội dung ≤ 960px. Chỉ báo tab trượt dùng `useSlideIndicator`; Outlet bọc `PageTransition` (detail cho `/ph/buoi/*`); `motionClass.pressable` cho hàng/tab. Màn con (Buổi học, Điểm, Báo cáo) giữ tab nơi đi vào sáng qua `location.state.from` (Nhận xét của cô → Buổi học/Báo cáo, tab 2 vẫn sáng; reload giữ vì là history state). Mobile màn con: ẩn chip/avatar, còn tab dưới.
- `GuardianCommentsPage.tsx`: tab 2 `/ph/nhan-xet`, dòng thời gian mới nhất trên cùng, nhóm "Tháng 10/2026", gồm phiếu đã gửi + "Lời cô" (báo cáo đã phát hành có nhận xét chung, đặt theo ngày phát hành, bấm → `/ph/bao-cao`). Mít chỉ ở phiếu mới nhất.

**Sửa nhỏ**
- `GuardianScoresPage.tsx`, `GuardianReportPage.tsx`: thêm nút quay lại (`useBackTarget`: về `/ph` hoặc `/ph/nhan-xet` tuỳ nơi đi vào).
- `guardianRead.ts`: thêm `childClassInfo`, `childSessionFeed`, `childSessionById`, `childAttendanceOf`, `childTeacherWords` (chỉ đọc store qua `childOf`/quyền hiện có).
- `guardianFormat.ts` (`monthYearLabel`, `scheduleText`), `guardianUi.tsx` (bỏ `ChildChips`; thêm `useBackTarget`, `FROM_COMMENTS`), `GuardianIcon.tsx` (thêm `user`, `chevron-down`; bỏ icon tab cũ), `guardian.module.css` (bỏ chip, thêm lớp tab 1/2/Buổi học).
- `app/routes.tsx` (chỉ khối `/ph`, lazy import guardian, tiêu đề trang): route mới `/ph`, `/ph/nhan-xet`, `/ph/buoi/:id`, `/ph/diem`, `/ph/bao-cao`; redirect `/ph/diem-danh`→`/ph`, `/ph/diem-so`→`/ph/diem`, `/ph/btvn`→`/ph`, `/ph/nhan-xet/:id` và `/ph/btvn/:id`→`/ph/buoi/:id`.

**Xoá (đã gộp nội dung)**: `GuardianOverviewPage.tsx`, `GuardianAttendancePage.tsx`, `GuardianTicketPage.tsx`, `GuardianHomeworkPage.tsx`.

**Test sửa có chủ đích** (khẳng định hành vi 5 tab/màn cũ): `guardianRender.test.tsx` (Tổng quan→Lớp học của con, Nhận xét→dòng thời gian, Ticket/Homework→Buổi học, Điểm danh→nhãn trong Buổi học, thêm test chip/sheet, Lời cô, buổi huỷ), `guardianRouting.test.tsx` (redirect đường dẫn cũ).

## Sửa bổ sung (lead)
- Màn Buổi học bỏ dải vàng "Buổi bù · 16/10 · Đã huỷ" trong khối "BTVN mới": xoá `cancelledFlags` (`GuardianHomeworkSections.tsx`), lớp `.hwFlag`, test tương ứng. Dòng phụ "Cô chấm ở buổi N · ngày" vốn đã lấy buổi chấm chưa huỷ (`gradingSessionPlan`), không cần đổi. Buổi huỷ vẫn có nhãn "Đã huỷ" ở danh sách và đầu màn của chính nó. Chụp lại `desktop-buoi-hoc.png`, `mobile-buoi-hoc.png`.
- Cho web/iOS: không hiện buổi huỷ nằm giữa buổi giao và buổi chấm trong BTVN.

## Kiểm
- `npx tsc --noEmit`: sạch.
- `npm test`: 56 file, 546 test xanh (baseline 540, thêm 6; chạy lại sau sửa bổ sung).
- `npm run build`: xanh.
- Dev server cổng 5194 đã tắt. Không có lỗi console trong lượt chụp.

## Ảnh
`design/prototype-shots/ux-v2/after/guardian/` (mobile 390×844 + desktop 1440×900, mỗi loại 9 ảnh): `lop-hoc-cua-con`, `buoi-hoc`, `buoi-hoc-tu-nhan-xet`, `buoi-huy`, `diem`, `bao-cao`, `nhan-xet-cua-co`, `chon-con` (sheet), `chua-co-con`. Ảnh mobile dài chụp với viewport cao bằng trang nên tab dưới nằm đúng đáy.

## Việc còn lại / cần lead quyết
1. **Buổi sắp tới có BTVN/phiếu vẫn vào danh sách** (nhãn "Sắp học"). Lý do: IA mới bỏ tab BTVN, mà đề BTVN thấy ngay khi cô lưu (spec mục 4), seed có "Buổi 10 · 25/10" planned có BTVN. Nếu muốn chỉ liệt kê buổi đã diễn ra thì phụ huynh sẽ không thấy đề giao trước.
2. Chấm "Mới" = phiếu đã gửi mà máy này chưa mở buổi đó. Lần đầu mở app, mọi phiếu đều "Mới". Nếu cần "mới" theo mốc thời gian thì cần thêm dữ liệu (ngoài phạm vi).
3. `/cai-dat` không sửa (ux-02). Trong khung phụ huynh nó vẫn có thanh tab 2 mục để quay về, nên chưa cần nút quay lại; nếu muốn nút riêng thì ux-02 thêm (trỏ `/ph`).
4. Lỡ chạy `git rm --cached` trên `GuardianOverviewPage.tsx` (stage việc xoá). Không commit; lead tự quyết khi commit.
5. Màn Điểm số/Báo cáo vẫn dùng thẻ trang cũ (chưa tối ưu 2 cột desktop); ngoài phạm vi brief.

## Cho web/iOS
- Khung: 2 tab "Lớp học của con" / "Nhận xét của cô". Đầu trang: chip con (avatar chữ + tên, ▾ khi ≥ 2 con, bấm mở sheet "Chọn con": tên + lớp, đang chọn viền primary) và avatar tài khoản (icon người) → Cài đặt. Màn con trên mobile ẩn chip/avatar.
- Desktop ≥ 1024px: thanh trên chip · tab · avatar, nội dung ≤ 960px, padding 32px; tab 1 hai cột (danh sách | cột phải 380px dính); Buổi học hai cột (phiếu + điểm danh | BTVN).
- Tab của màn con theo nơi đi vào (state `from`), nút quay lại về đúng tab.
- Danh sách buổi: mới nhất trên cùng, nhóm "Tháng 10/2026"; nhãn điểm danh (Có mặt/Muộn/Có phép/Vắng; "Chưa điểm danh"), sao, "Mới"; buổi huỷ "Đã huỷ" (không số buổi, tên "Buổi bù"/"Buổi học"); buổi sắp tới có BTVN "Sắp học".
- Nhãn bị ẩn theo quyền: điểm danh (nhóm Buổi học và điểm danh), sao/Lời cô/Báo cáo (nhóm Nhận xét và báo cáo), Điểm (nhóm Điểm).
- Mít chỉ ở phiếu mới nhất của tab 2. Không có trung bình ở bất cứ đâu.
- Redirect đường dẫn cũ như bảng trong báo cáo (web: giữ cùng bảng).
- Chuỗi mới: "Lớp học của con", "Nhận xét của cô", "Chọn con", "Tài khoản và cài đặt", "Chuyên cần tháng {n}", "Bài kiểm tra mới nhất", "Điểm" + "Điểm từng bài", "Báo cáo tháng" + "Tháng {n} đã phát hành" / "Cô chưa phát hành báo cáo", "Giáo viên {tên}", lịch "Thứ Hai, Thứ Tư · 18:00", "Danh sách buổi học", "Tháng {n}/{năm}", "Sắp học", "Chưa có buổi học nào" + "Buổi học hiện ở đây sau khi lớp học buổi đầu tiên.", "Chưa có nhận xét của cô" + "Cô gửi phiếu sau buổi học, nhận xét hiện ở đây khi cô đã gửi.", "Lời cô · Báo cáo tháng {n}", "Mở buổi học buổi {n}", "Mở báo cáo tháng {n}", "Buổi học", "Không tìm thấy buổi học này" + "Buổi học không thuộc lớp của con.", "Buổi này đã huỷ, lớp không học.", "Điểm danh", "Đến muộn {giờ}", "Ghi chú: …". Chuỗi cũ còn dùng: "Nhận xét của {cô}", "Cô chưa gửi phiếu buổi này", "Kết quả BTVN buổi {n}", "BTVN mới", "Buổi này không giao bài tập về nhà.".
- Chuỗi bỏ: "Tổng quan", "Điểm danh" (tab), "Điểm số" (tab), "Nhận xét" (tab), "Báo cáo" (tab), "Điều cô muốn chia sẻ", "Nhận xét mới nhất", "Điểm gần đây", "Xem tất cả", "Bài tập về nhà" (màn riêng), "Mới nhất"/"Các buổi trước" (BTVN).
