# QA: testcase nghiệp vụ và Maestro flow

Nguồn chuẩn: `docs/spec.md` (chỉ phạm vi "Bản đầu", mục 8) và `docs/architecture.md`. Testcase lệch spec thì sửa testcase. Spec chưa rõ: ghi vào [open-questions.md](open-questions.md), không đoán.

## Cấu trúc
- `testcases/<nhóm>.md`: testcase Markdown. Mỗi file một nhóm, cùng định dạng.
- `maestro/ios/`, `maestro/web/`, `maestro/common/`: flow tự động và subflow dùng chung.
- `traceability.md`: TC ↔ dòng spec ↔ flow iOS ↔ flow web ↔ trạng thái. Sinh bằng `python3 -I qa/tools/gen-traceability.py`.
- `open-questions.md`, `bugs.md` (lỗi app tìm được khi chạy flow).
- Kết quả chạy: `plans/20261021-mvp/qa/runs/<ngày>/`.

## Quy ước ID
`TC-<NHÓM>-<số 3 chữ số>`. Nhóm: AUTH (đăng nhập, tài khoản), CLS (lớp, lịch), STU (học sinh), ATT (buổi học, điểm danh), CMT (nhận xét, phiếu sao), HW (BTVN), TST (bài kiểm tra, điểm), RPT (báo cáo), GRD (phụ huynh), OFF (offline, đồng bộ, thông báo), PRM (quyền).
Ưu tiên: P0 = đường chính, hỏng thì app không dùng được; P1 = nghiệp vụ quan trọng và ca lỗi; P2 = biên, hiếm, hoặc khó tự động.

## Định dạng một testcase
`ID · Tiêu đề`, Vai, Nền tảng (Web / iOS / Cả hai), Ưu tiên, Nguồn spec (`docs/spec.md:dòng`), Tiền điều kiện + dữ liệu, Các bước (đánh số), Kết quả mong đợi (theo câu chữ spec), Flow tự động (đường dẫn, hoặc "thủ công: lý do").

## Dữ liệu và tên fixture
- Chỉ chạy trên staging (`https://qlh-staging-web.pages.dev/`), trong workspace smoke giả; không ghi vào dữ liệu demo.
- Tên dữ liệu bắt đầu `QA-` (ví dụ `QA-Lớp A`, `QA-HS 1`, `QA-KT1`). Tài khoản: giáo viên smoke (Admin đầu tiên); phụ huynh PH-A (1 con HS-1), PH-B (2 con HS-2, HS-6), PH-0 (chưa liên kết). SĐT là số giả, không ghi vào repo hay log.
- Subflow `maestro/common/` tạo dữ liệu qua giao diện; ca cần dữ liệu có sẵn dùng subflow chuẩn bị tương ứng.

## Biến môi trường (không in, không ghi vào file trong repo)
Đọc từ `~/.config/qlh/staging-smoke.txt` vào biến môi trường của tiến trình rồi truyền `maestro -e KEY=VALUE`. Không dùng `env`, `printenv`, `set`.
- `STAGING_PHONE` (9 chữ số nội địa, bỏ 84/+84), `STAGING_PASSWORD`: giáo viên smoke.
- Quy ước gửi đăng nhập: UI web/iOS dùng 9 chữ số nội địa; HTTP API phải chuẩn hoá thành `+84` + 9 chữ số nội địa (ví dụ dữ liệu fixture có thể giữ dạng được API chấp nhận). Không in số thật.
- Khoá 15 phút sau 5 lần sai: tối đa 2 lần submit đăng nhập mỗi thiết bị mỗi lượt.

## Chạy
- iOS: simulator `iPhone 16` (duy nhất của cả mission; không tạo simulator mới; chờ GL báo tới lượt QA), app `com.study.teacherthu`; hướng dẫn trong `maestro/ios/README.md`.
- Web: Maestro 2.2.0 (`~/.maestro/bin/maestro`) chạy web qua Chrome; giới hạn ghi ở `maestro/web/README.md`.
- Kết quả: `maestro test --format junit --output <thư mục>`.

## Workspace QA

- `smoke-qa-prm` (tạo cho lượt QA web ngày 2026-10-25).

## Giới hạn Maestro web (Maestro 2.2.0)
Mở URL và kiểm chữ được; thao tác chọn/nhập treo, `takeScreenshot` chỉ ra PNG 1×1. Flow web viết bằng Playwright/Node (theo brief GL); chi tiết ở `maestro/web/README.md`. Flow iOS dùng Maestro.
