# Review backend spec MVP — tạm dừng

Theo yêu cầu controller, review D1 dừng vì người dùng đang cân nhắc chuyển backend sang Firebase. Phạm vi dưới đây chỉ ghi nhận phần đã đọc trước khi nhận chỉ đạo dừng; không phải review hoàn tất.

## Đã kiểm

- Đọc brief review, `AGENTS.md`, các phần liên quan trong `docs/spec.md` và `docs/architecture.md`, cùng `lead-brief.md` mục 1 và 2.B.
- Đã đọc nội dung các tài liệu backend: `data-model.md`, `api-spec.md`, `authz-matrix.md`, `stack-and-cpu.md`, `offline-plan.md`, `report-b1.md`.
- Đã đối chiếu phạm vi MVP; quy tắc điểm danh, điểm, archived, phiếu sao, BTVN, báo cáo tháng và không có điểm trung bình/vắng thi; luồng phụ huynh và giới hạn nội dung; một số quan hệ schema/API, đồng bộ, chỉ mục và các quyết định Q1–Q14.
- Stack CPU: tài liệu nêu đo PBKDF2-SHA256 100.000 vòng trung vị khoảng 29 ms, cổng đo đầy đủ chưa chạy; tác giả thừa nhận các phần chưa kiểm chứng.
- Tài liệu nêu quy tắc log không ghi SĐT, mật khẩu, token hay nội dung nhận xét; ví dụ API dùng dữ liệu giả.

## Findings đã ghi nhận trước khi dừng

- **B-01 — BLOCKER — `api-spec.md` §4/Q2:** điều kiện `must_change_password = 1` đứng riêng có thể cho phép cấp lại mật khẩu tài khoản còn membership nhân sự; cần giới hạn điều kiện theo role/workspace.
- **B-02 — BLOCKER — `api-spec.md` §6.1:** brief yêu cầu lô đồng bộ atomic nhưng API vừa gom các lệnh áp dụng vào một D1 batch vừa cho lệnh độc lập bị từ chối không chặn lệnh khác; cần chốt ranh giới atomic.
- **B-03 — BLOCKER — `data-model.md` §2.8:** cron yêu cầu xóa `change_log` cũ hơn 120 ngày nhưng DDL không có thời gian tạo để xác định tuổi dòng; cần bổ sung cơ chế retention xác định được.
- **B-04 — MAJOR — `data-model.md` §2.2–2.5:** các FK được đọc bảo đảm cùng workspace nhưng chưa thể hiện kiểm tra bắt buộc cùng lớp cho các quan hệ buổi/học sinh, bài kiểm tra/học sinh và phần BTVN/học sinh.
- **B-05 — MINOR — `api-spec.md` §5.3 và `authz-matrix.md` §2.2:** ma trận cho phụ huynh xem lịch của con nhưng endpoint `/calendar` chưa nêu rõ ngoại lệ và phạm vi phụ huynh.

## Chưa kiểm / chưa hoàn tất

- Chưa hoàn thành toàn bộ checklist theo thứ tự ưu tiên; chưa rà soát lại từng endpoint với từng ô của ma trận và từng ví dụ request/response với schema.
- Chưa hoàn tất rà soát toàn diện các ràng buộc FK, trigger, index, hành vi workspace/scope và các trường hợp đồng bộ; B-04 là ghi nhận ban đầu, chưa phải kết luận bao quát về toàn DDL.
- Chưa lập danh sách cuối cùng mọi nội dung cần đồng bộ vào `docs/architecture.md`; phần Q9 và một số điểm xác thực/phiên, lược đồ, sync còn chờ đối chiếu hoàn tất.
- Không kiểm tra mã, không chạy test/build, không triển khai staging; các tài liệu đều mô tả spec, chưa có mã backend để kiểm chứng hành vi.
- Không kết luận `APPROVED` hay `CHANGES_REQUESTED`; mọi kết luận review cuối cùng đang để ngỏ do chuyển hướng backend có thể làm các tài liệu D1 không còn là mục tiêu.

**REVIEW TẠM DỪNG, chưa hoàn tất, kết luận: chưa có**

Status: DONE_WITH_CONCERNS
Summary: Đã lưu phần đã kiểm và 5 finding ban đầu vào báo cáo; review bị dừng theo chỉ đạo controller khi người dùng cân nhắc Firebase. Các mục còn lại chưa được kiểm, chưa có kết luận cuối cùng và không sửa file nào khác.
