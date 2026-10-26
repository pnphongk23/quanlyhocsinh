# Brief 91 · Nhận xét 5 tiêu chí, câu sửa được, bỏ số buổi, báo cáo theo tháng

Ngày 2026-10-25. Cha: GL #4 `4350a256-dd3a-41d8-8827-4b118a422623`. Nguồn chuẩn: `docs/spec.md` (commit main `3dab010`) dòng 3, 51–63, 70–71, 77–78, 151, 222–226; `docs/architecture.md` mục Báo cáo và Nhận xét buổi. Spec thắng nếu brief lệch. Song song với brief 90 (xoá báo cáo), không chờ nhau.

## Quyết định người dùng (2026-10-25)
1. **5 tiêu chí = 5 sao:** Chú ý nghe giảng; Ghi chép đầy đủ; Tham gia hoạt động sôi nổi; Không mất trật tự; Hoàn thành bài tập về nhà. Mỗi tiêu chí đạt = 1 sao, sao = số tiêu chí đạt (0–5). Phiếu mới mặc định đạt cả 5 (5 sao).
2. **Câu mặc định theo số sao, sửa được trên từng phiếu:**
   - 5: "Con học rất tốt, chăm chỉ, tích cực tham gia phát biểu"
   - 4: "Con học tốt, làm bài đầy đủ nhưng hơi trầm"
   - 3: "Con học tốt, nhưng còn hơi mất tập trung, nói tự do"
   - 0–2: "Con chưa tích cực tham gia hoạt động, cần tập trung hơn"
   Chưa sửa câu thì câu đi theo số sao; đã sửa thì giữ, có nút "Dùng câu mặc định".
3. **Phụ huynh** thấy x/5 sao + câu + ghi chú, KHÔNG thấy danh sách tiêu chí.
4. **Phiếu cũ thang 3 sao** giữ nguyên (sao + câu cũ, hiện x/3), không quy đổi; báo cáo đếm riêng theo thang cũ.
5. **Bộ lọc tab Nhận xét:** Tất cả / Chưa gửi (bỏ "Chưa chọn sao"). "Gửi phiếu cả lớp" gửi mọi phiếu chưa gửi.
6. **Bỏ số buổi ở mọi nơi:** buổi hiện "T3 · 21/10"; BTVN dùng "Bài tập buổi trước"/"Bài tập hôm nay" hoặc "BTVN ngày 21/10".
7. **Báo cáo theo tháng:** "Thêm báo cáo" → chọn tháng (mặc định tháng hiện tại), dữ liệu là các buổi trong tháng, tên "Tháng 10/2026", được thêm nhiều đợt cùng tháng; đợt cũ theo khoảng buổi giữ tên cũ.

## Chia việc
- **Backend + hợp đồng** (lead backend): schema phiếu (tiêu chí, stars 0..5, câu theo phiếu, cờ thang cũ), validation, snapshot/pull, nội dung gửi PH (không có tiêu chí), đếm sao trong báo cáo theo thang, đợt báo cáo theo tháng (tạo/tính dữ liệu/tên), bỏ phụ thuộc số buổi trong API nếu có. Chốt hợp đồng trước và báo GL để web/iOS bắt đầu; ghi `contract-changes.md`; cập nhật chi tiết `docs/architecture.md` trên main nếu khác mô tả GL. Migration + deploy Worker staging xin GL (backup, export không in stdout). Xếp sau migration 0007 của brief 90.
- **Web** (lead web): sheet/hộp phiếu 5 tiêu chí + sao + câu sửa được + "Dùng câu mặc định"; danh sách tab Nhận xét; PH xem x/5; bỏ "Buổi N" mọi nơi; Thêm báo cáo chọn tháng; báo cáo/PDF đếm sao theo thang. Deploy sau Worker mới.
- **iOS** (lead iOS): như web trên app GV + PH; mascot Mít theo mức sao cần ánh xạ cho 0–5 (đề xuất trong báo cáo). Build bằng project worktree; simulator `iPhone 16` theo lượt GL.
- **QA**: cập nhật testcase nhận xét/BTVN/báo cáo theo spec mới.

## Ràng buộc chung
Token + `design/ux-v2/rules.md` cho UI; cấm env/printenv/set/ps/pgrep -fl/lsof; không in creds; không đọc `staging-demo.txt`; chỉ staging, workspace smoke giả; không push. Chỗ spec chưa rõ thì báo GL (GL hỏi người dùng), không tự đoán. Báo GL ≤150 từ ở mốc.
