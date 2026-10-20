# Slide template research: bài giảng UX & UI Foundation (45')

Đối tượng: dev, PM, junior designer (VN). Outline: `plans/reports/ui-ux-foundation-learning-outline.md` (~28-32 slide).

## 1. Độ tin cậy nguồn

| Nguồn | Trạng thái | Dùng cho |
| --- | --- | --- |
| https://www.assertion-evidence.com/tutorial-642629.html (Alley) | MỞ ĐƯỢC, đã đọc | Headline = câu hoàn chỉnh, bằng chứng thị giác thay bullet, chi tiết phụ để notes |
| https://www.duarte.com/resources/guides-tools/the-glance-test/ | MỞ ĐƯỢC, đã đọc | Glance test 3 giây, 1 ý/slide, tương phản + khoảng trắng |
| https://lawsofux.com/hicks-law/ | MỞ ĐƯỢC, đã đọc | Cấu trúc 1 luật: định nghĩa 1 câu, takeaways, ví dụ thật (Google, Apple TV, Slack) |
| Số liệu cỡ chữ AE (28pt headline, 8-14 từ, body 18-24pt, list 2-4 mục, <=20 từ/phút) | CHỈ qua tóm tắt web search của http://www.writing.engr.psu.edu/AE_checklist.pdf (PDF không đọc được) | Tham khảo, chưa kiểm chứng trực tiếp |
| Presentation Zen (signal-to-noise, empty space, contrast/repetition/alignment/proximity) | CHỈ qua search (tru.ca PDF, ariadne.ac.uk review), không mở được | Tham khảo, độ tin cậy trung bình |
| NN/g, Refactoring UI, Apple/Material talks | KHÔNG xác minh được (URL đoán 404 / không mở) | Mục 3 là suy luận, ghi rõ |

Đồng thuận giữa 3 nguồn đã mở + search: (1) mỗi slide một thông điệp, (2) headline là câu khẳng định, (3) thay bullet bằng hình/ví dụ, (4) chi tiết phụ vào speaker notes. Đây là phần chắc nhất.

## 2. Nguyên tắc cốt lõi (áp dụng cứng)

1. **Headline là câu khẳng định** (assertion), không phải chủ đề. Sai: "Khoảng cách". Đúng: "Nhóm bằng khoảng trắng, không bằng đường kẻ".
2. **Evidence = hình/mockup**, không bullet. Bullet chỉ ở slide checklist/agenda.
3. **Glance test 3 giây**: nhìn 3s, quay đi, còn nhớ ý chính thì đạt. Fail thì tách slide hoặc cắt.
4. **Rule + example**: mỗi luật = 1 câu luật + 1 ví dụ trước/sau. Khớp A3, B1-B6 của outline.
5. **Chi tiết phụ vào notes**: số liệu, nguồn, "Miller 7±2 hay bị dùng sai" nằm ở notes, không lên slide.
6. Signal-to-noise: bỏ logo, viền, icon trang trí. Mọi phần tử phải phục vụ ý.

## 3. Phong cách dạy design hiệu quả (suy luận từ Laws of UX đã đọc + thực hành chung)

- **Mini-mockup dựng bằng HTML/CSS thật thay screenshot**: sắc nét ở mọi cỡ chiếu, đổi được trạng thái ngay trên slide, đúng tinh thần "không chép pixel". Với deck này: bắt buộc cho mọi cặp trước/sau.
- **Callout đánh số** (1,2,3) trên mockup, chú thích ngắn <=6 từ, đặt ngoài mockup, nối bằng đường mảnh. Tối đa 3 callout/slide.
- **Thẻ nguyên tắc đánh số** (kiểu Laws of UX): tên luật + 1 câu định nghĩa + 1 ví dụ. Laws of UX cũng chia "định nghĩa -> takeaways -> ví dụ thật"; dùng đúng thứ tự đó trong 1 slide luật.
- **Trước/sau cùng một nội dung**: đổi đúng 1 biến (khoảng trắng, hoặc size, hoặc màu). Đổi nhiều biến thì khán giả không biết cái gì tạo khác biệt.
- Nhãn "Sai/Đúng" bằng **icon + chữ + viền**, không chỉ màu đỏ/xanh (chính bài đang dạy rule này).

## 4. Hệ thống thị giác (khuyến nghị)

| Hạng mục | Giá trị |
| --- | --- |
| Tỷ lệ | 16:9, canvas thiết kế 1920x1080 |
| Lề an toàn | 96px mỗi cạnh; grid 12 cột, gutter 24px; bội số 8px |
| Headline | 56-64px (~28-32pt quy đổi), bold sans, tối đa 2 dòng, 8-14 từ |
| Body tối thiểu | 32px (khoảng 16-18pt trên canvas 1080p chiếu phòng họp). Không có chữ dưới 28px trừ nguồn/footnote (24px) |
| Chữ trong mockup | Giữ đúng cỡ thật của app (vd 17pt iOS) nhưng phóng mockup 2x để đọc được từ cuối phòng |
| Từ/slide | Mục tiêu <=25 từ ngoài mockup; cứng <=40. Checklist C là ngoại lệ (8 dòng) |
| Màu | 1 accent + 1 họ neutral (nền sáng, chữ gần đen) + 2 màu ngữ nghĩa (đỏ=sai, xanh=đúng) chỉ dùng ở trước/sau. Tổng <=4 màu |
| Tương phản | Chữ >=4.5:1, chữ lớn >=3:1; kiểm bằng công cụ trước khi in. Máy chiếu làm màu nhạt mất nét, nên dư tối thiểu 7:1 cho body |
| Font | 1 họ sans có đủ dấu tiếng Việt (vd Inter hoặc Be Vietnam Pro), 2 weight (Regular, Bold). Kiểm tra dấu chồng ở size lớn |
| Nhất quán | Headline luôn cùng vị trí trái-trên; số slide + thanh tiến độ phần (0/A/B/C) góc dưới, nhỏ |

Lưu ý: các cỡ px là quy đổi của tôi từ khuyến nghị pt của Alley (chưa kiểm chứng trực tiếp) sang canvas 1080p. Thử chiếu thật 1 slide ở phòng họp rồi chỉnh.

## 5. Bộ 8 layout tái sử dụng

**L1. Title / Opener**
- Mục đích: slide 1, mở bài, câu hỏi gây tò mò.
- Wireframe: nền neutral, headline cỡ lớn trái-giữa, 1 dòng phụ nhỏ (tên, ngày), không ảnh.
- Dùng: slide 1; mở bài mục 0 ("UI tốt là UI không phải nghĩ").

**L2. Agenda có thời gian + Section divider**
- Mục đích: định hướng, nhịp 45'.
- Wireframe: danh sách dọc 4 dòng (0 Mở đầu 3', A UX 17', B UI 20', C Tổng kết 5'); mục hiện tại đậm, còn lại mờ 40%. Divider = cùng bố cục, chỉ còn 1 mục + thông điệp chính của phần.
- Dùng: đầu bài, đầu A, B, C. Chi phí: 4 slide, ~20 giây mỗi slide.

**L3. Assertion + một hình lớn (Evidence)**
- Mục đích: mặc định cho hầu hết ý. Chuẩn Alley.
- Wireframe: headline 2 dòng trên cùng; dưới là 1 hình/mockup/sơ đồ chiếm ~70% diện tích; không bullet.
- Dùng: A1 (màn hình gạch bỏ thứ thừa), A2 (flow điểm danh 5-6 bước, đánh dấu chỗ lạc), A4 (danh sách 4 trạng thái nếu gộp 1 hình).

**L4. Trước/Sau (Do/Don't) song song**
- Mục đích: chứng minh một rule bằng đối chiếu một biến.
- Wireframe: headline = rule; 2 cột bằng nhau, nhãn "Trước"/"Sau" có icon; mockup cùng nội dung; dưới mỗi cột 1 số đo ngắn (vd "tương phản 2.1:1" / "7.4:1"); 1-2 callout đánh số.
- Dùng: B1 (đường kẻ vs khoảng trắng), B2 (5 size vs 3 size), B3 (xám nhạt vs sửa), B4 (icon sát vs đủ vùng chạm), B5 (3 cặp nút/lỗi/empty, mỗi cặp 1 slide hoặc 1 slide 3 hàng), B6 (card lồng card vs phẳng). Đây là layout dùng nhiều nhất (~8 slide).

**L5. Thẻ luật (Rule card)**
- Mục đích: dạy một luật tâm lý/heuristic.
- Wireframe: trái 40%: số thứ tự lớn + tên luật + định nghĩa 1 câu (<=15 từ); phải 60%: ví dụ trước/sau thu nhỏ hoặc 1 mockup. Chi tiết nguồn (Hick 1952...) vào notes.
- Dùng: A3 (Jakob, Hick, Fitts, Gestalt, Recognition, 3 Nielsen). Gộp luật ngắn thành 1 slide 3 thẻ nếu thiếu giờ.

**L6. Ma trận / lưới trạng thái**
- Mục đích: thể hiện "đủ mọi trạng thái", so sánh nhiều biến thể.
- Wireframe: headline; lưới 2x2 hoặc 4x1 mockup cùng một màn hình, mỗi ô có nhãn tên trạng thái (loading/empty/error/offline) bên dưới.
- Dùng: A4; B4 nếu minh họa default/pressed/focus/disabled.

**L7. Bảng đo / thang (Spec scale)**
- Mục đích: số liệu cần nhìn một lần: type scale, spacing 4/8, tương phản, vùng chạm 44/48/24.
- Wireframe: headline; 1 bảng 3-5 hàng có mẫu trực quan ở mỗi hàng (ô màu, thanh khoảng cách, hộp vùng chạm đúng tỷ lệ); số in đậm.
- Dùng: B2, B3, B4. Nên là bản thay thế L4 khi không có "trước/sau".

**L8. Recap / Checklist + Tài nguyên**
- Mục đích: chốt, mang về.
- Wireframe: trái: checklist 8 dòng có checkbox (chia 2 nhóm UX 3 dòng / UI 5 dòng); phải: khung tự chấm 5 trục (0-2) và 3 thói quen. Tài nguyên sang slide riêng, QR + URL chữ lớn.
- Dùng: C (2-3 slide). Câu chốt cả bài đặt ở slide riêng cuối, dùng lại L1.

Phân bổ gợi ý: L1 x2, L2 x4, L3 x5, L4 x9, L5 x4, L6 x2, L7 x3, L8 x3 = 32 slide.

## 6. Nhịp thời gian và thứ tự dựng slide

- ~1.2-1.5 phút/slide. Slide L4 dạy 1 rule trong ~90s: đọc rule (10s), chỉ "Trước" (20s), chỉ "Sau" (20s), nói vì sao (30s), chuyển (10s).
- Mỗi phần B kết thúc bằng 1 dòng "Rule to remember" trong footer slide cuối, không thêm slide.
- Dựng theo thứ tự: L4 -> L3 -> L5 -> còn lại; L4 và L3 quyết định chất lượng bài.
- Mockup tái dùng từ `design/prototype/` của app quản lý học sinh (điểm danh, nhập điểm) để nhất quán ví dụ; dùng nội dung thật (tên dài, 0 và 500 phần tử) theo A4. Lệch spec thì theo spec (AGENTS.md).

## 7. Kiểm tra trước khi đưa ra (QA 6 điểm)

1. Mọi headline là câu, <=2 dòng.
2. Glance test 3s đạt (nhờ 1 người ngoài).
3. Chữ nhỏ nhất >=28px (trừ footnote 24px); đứng cách màn hình chiếu 5-6m vẫn đọc được.
4. Tương phản đã đo; không dùng màu làm tín hiệu duy nhất.
5. Dấu tiếng Việt không bị mất/chồng ở font đã chọn, kể cả khi xuất PDF.
6. Có bản PDF dự phòng và notes in ra.

## 8. Hạn chế

- Không mở được trực tiếp: AE checklist PDF, Presentation Zen, NN/g, Refactoring UI, Apple/Material talks. Số cỡ chữ Alley lấy từ tóm tắt search; px quy đổi là ước lượng của tôi.
- Mục 3 chủ yếu suy luận từ Laws of UX và thực hành chung, không có case study sản xuất được xác minh.
- Chưa thử chiếu thật; cỡ chữ cần kiểm tại phòng họp thật.

## Câu hỏi chưa giải quyết

- Công cụ dựng deck: HTML (Reveal/Slidev), Keynote hay PowerPoint? Ảnh hưởng khả năng nhúng mockup live (HTML thuận nhất).
- Phòng họp: cỡ màn hình, khoảng cách ngồi xa nhất, đã có font đồng bộ chưa?
- Slide viết tiếng Việt hoàn toàn hay giữ thuật ngữ EN (Hick, Fitts, empty state)? Khuyến nghị: headline VN, thuật ngữ EN giữ nguyên trong ngoặc.
- Có phát handout (notes) hay không? Quyết định mức chi tiết đưa vào notes.
