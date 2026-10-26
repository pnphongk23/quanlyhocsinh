# Điều phối Mascot · giai đoạn khám phá

Parent General Lead: `abdfe90c-1375-4aee-a530-03020c1ce159` · Domain Lead: `ece4dfcd-64a6-4fdd-8429-d78f77042391` · Workspace: `wks_5d1bc443eaa9f683`.

## Cách tiếp cận
1. SVG tĩnh tối giản: ưu tiên vì nhẹ, dễ kiểm chứng cạnh prototype.
2. SVG + phản hồi chuyển động ngắn: chỉ là gợi ý, chưa tích hợp.
3. Nhiều hoạt cảnh/animation runtime: chưa chọn vì cần thêm tài sản và kiểm chứng.

Hai worker độc lập; không tạo Lead hay reviewer. Brief 60 yêu cầu một lượt tự kiểm ảnh, vì vậy không mở review riêng. Quyền ghi chỉ mascot/ và briefs/mascot-*.md; không commit trong thư mục chính có thay đổi của người dùng.

## Sổ worker
| ID | Vai / model / settings | Phạm vi | Brief |
|---|---|---|---|
| ac4107c7-5688-458d-a226-06f169444319 | Worker Cam Ninh · codex/gpt-6-luna · full-access/high | research.md | ../../briefs/mascot-01-research.md |
| 4584cf43-5a50-4785-8a97-1a7381a9da6d | Worker Từ Hoảng · codex/gpt-6.1-sol · full-access/medium | directions, 18 SVG, 10 mockup, proposal, bằng chứng | ../../briefs/mascot-02-visual.md |

`profile-deviation`: Domain Lead dùng Codex theo yêu cầu người dùng; peer mặc định Pi nhưng worker nghiên cứu dùng Codex theo brief chung, worker thị giác dùng gpt-6.1-sol theo brief riêng. Đã đọc mọi profile notes và xác nhận model/thinking/mode cùng workspace bằng tools; notifyOnFinish=true.

## Chờ và hội tụ
Đợi finish notification, không polling/sleep. Dự phòng heartbeat 30 phút; khi có kết quả chạy lại validate, xem ảnh 390×844, đối chiếu nguồn/bố cục/phạm vi và dung lượng; cập nhật handback.md rồi báo General Lead <=12 dòng. Chưa có proposal hay bằng chứng hoàn thành tại thời điểm giao việc.

## Bằng chứng ban đầu
- Đã đọc đầy đủ brief chung/riêng, spec, architecture, status, lead-brief mục 0/1; skill app-design và ba reference thích hợp, paseo/paseo-team và role/brief contracts.
- srcwalk guide đã chạy; không cài gói.
- df: còn 2,801,084 KiB tại thời điểm kiểm; vẫn áp giới hạn mascot <15 MB, visual <=10 MB.
- evidence/protected-baseline.json: SHA-256 260 file nguồn/tài liệu bảo vệ; chỉ dùng xác minh phạm vi, không ghi đè nếu có thay đổi của luồng khác.

## Mốc nghiên cứu nhận kết quả
Worker research gửi DONE_WITH_CONCERNS: 10 tham chiếu, 18 URL HTTPS, Lingokids chỉ search snippet/timeout đã ghi giới hạn. Lead đọc toàn bộ và mở trực tiếp Open Peeps, unDraw license, OpenMoji FAQ, Prodigy: đủ để kiểm các nhận định license trọng yếu, không xem landing page là bằng chứng hành vi trong app. Phát hiện thiếu UI template thực sự (ba mục ban đầu chỉ là thư viện illustration); giao cùng worker bổ sung bằng briefs/mascot-03-research-completion.md, không mở reviewer. Đã báo visual worker đọc research và giữ kiểm SVG/mockup ngay giai đoạn khám phá.

## Mốc research bổ sung
Đã đọc mục UI template: shadcn Authentication Blocks, Tabler, Flowbite; phân biệt MIT code/template với illustration và chưa import framework. Lead kiểm UTF-8: 15.643 byte; mở trực tiếp ba nguồn license repo. Research đã hoàn tất với caveat Lingokids. Disk có lỗi ENOSPC khi shell tạo heredoc; df sau đó còn134.356KiB, mascot136KiB; đã báo General Lead và visual worker, không dọn dữ liệu người dùng. Chờ visual finish notification, không polling.

## Heartbeat dự phòng lần 1
Một lần get_agent_status: visual worker4584cf43 vẫn running, không pending permissions; chưa có finish notification. du mascot144KiB; chưa nhận proposal/visual-handback/validate. Không chạy kiểm hoàn thành hoặc xem ảnh khi candidate chưa bàn giao; tiếp tục đợi notifyOnFinish, không polling/sleep.

## Visual handback lần 1 và kiểm lại
Worker báo BLOCKED: 18SVG, chưa có mockup do fixture sai và ENOSPC. Lead đọc proposal/validation/capture; chạy validate.py exit1: SVG18/18,raw16.788,gzip7.726,logical folder88.727byte,mockup0,thiếu6PNG. du160KiB,df250.792KiB; dung lượng API không phủ định lỗi tạo file. Giao cùng worker ONE bounded recovery bằng brief04; nếu ENOSPC dừng, không xóa ngoài scope. Chưa hoàn thành, chưa claim render/iPhone.

## Tiếp tục 2026-10-22
General Lead mới: `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1`; notification parent cũ abdfe90c sẽ chuyển tiếp. Người dùng yêu cầu tiếp tục, đủ10PNG390×844, kiểm mở được, tổng<15MB. df xác nhận còn12.935.840KiB; blocker ENOSPC cũ đã hết. Giao lại worker visual4584cf43 qua brief05, notifyOnFinish=true; không spawn worker mới. Chụp protected-resume-20261022.json để tách kiểm phạm vi đợt này với thay đổi luồng khác từ hôm qua. Lead sẽ tự chạy validate, decode PNG, xem contact sheet/từng ảnh, viết handback và báo General Lead mới.

## Heartbeat tiếp tục lần 1
Một lần get_agent_status: worker visual vẫn running, không pending permissions; handback trên đĩa vẫn bản ngày21 nên không coi là kết quả mới. du thư mục2.000KiB, dưới15MB. Chờ finish notification, không polling hoặc kiểm hoàn thành trên candidate đang viết.
