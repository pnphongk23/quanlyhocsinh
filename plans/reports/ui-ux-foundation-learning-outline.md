# Khung bài giảng: UX Foundation & UI Foundation (45 phút)

> Mỗi mục gồm: **thông điệp chính**, **ý cần nói**, **minh họa / slide gợi ý**. Phần accessibility không tách riêng mà lồng vào từng trụ cột UI.
> Nguồn tổng hợp: skill local `design-ui-ux` (các module better-layout / typography / colors / writing / ui / accessibility), `app-design`; WCAG 2.2, Apple HIG, Material 3, Nielsen Norman Group, Laws of UX.

## Phân bổ thời gian

| Phần | Nội dung | Thời lượng | Slide gợi ý |
| --- | --- | --- | --- |
| 0 | Mở đầu | 3' | 2–3 |
| A | UX Foundation | 17' | 10–12 |
| B | UI Foundation | 20' | 12–14 |
| C | Tổng kết + checklist | 5' | 2–3 |
| | **Tổng** | **45'** | **~28–32** |

> Q&A để ngoài 45'. Nếu bắt buộc gói Q&A trong 45', cắt mục A4 còn 2' và B6 còn 1'.

**Câu chốt cả bài:** *UX quyết định làm cái gì và theo thứ tự nào; UI quyết định làm cho nó dễ thấy, dễ hiểu, dễ bấm. Giải bài toán trước, trang trí sau.*

---

## 0. Mở đầu (3')

- **Thông điệp:** UI tốt là UI người dùng không phải nghĩ.
- **Ý cần nói:**
  - UX là toàn bộ trải nghiệm để hoàn thành một việc, kể cả lúc chờ, lúc lỗi, lúc mất mạng. UI là lớp người dùng nhìn và chạm vào.
  - Một màn hình có thể đẹp mà vẫn hỏng UX, và ngược lại.
  - Phân biệt 3 loại căn cứ: **bằng chứng** (research, số đo, chuẩn), **quy ước** (nền tảng, design system), và **gu**. Gu không phải bằng chứng.
- **Slide:** đặt 2 màn hình cạnh nhau, một cái "đẹp" mà khó dùng, một cái giản dị mà xong việc trong 3 giây. Hỏi khán giả muốn dùng cái nào.

---

## A. UX FOUNDATION (17')

### A1. Bắt đầu từ người dùng và mục tiêu (3')
- **Thông điệp:** Mỗi màn hình có đúng một mục tiêu chính.
- **Ý cần nói:**
  - Điền vào câu: *"Người dùng đến màn hình này để ___"*.
  - Jobs-to-be-done: người dùng "thuê" sản phẩm để làm việc gì, trong bối cảnh nào (đang đứng lớp, một tay cầm điện thoại, mạng chập chờn).
  - Research tối thiểu: hỏi vài người dùng thật, quan sát họ làm việc, xem sản phẩm cùng loại để rút ra **nguyên tắc** chứ không chép pixel.
- **Slide:** một màn hình thật, gạch bỏ những thứ không phục vụ mục tiêu chính.

### A2. Kiến trúc thông tin, luồng và điều hướng (5')
- **Thông điệp:** Người dùng phải luôn biết mình đang ở đâu, đi tiếp thế nào và quay lại ra sao.
- **Ý cần nói:**
  - Kiến trúc thông tin (IA): nhóm và đặt tên nội dung theo cách người dùng nghĩ, không theo cấu trúc database.
  - User flow: vẽ luồng chuẩn (happy path) trước, rồi đến luồng lỗi và cách phục hồi.
  - Ngữ nghĩa điều hướng:
    - Tab là các điểm đến ngang hàng, không phải các bước tuần tự.
    - Push để đi sâu vào nội dung con; sheet cho việc chen ngang ngắn; modal hay overlay khi ngữ cảnh bên dưới vẫn còn liên quan.
    - Nút Back luôn chạy được; chỉ chặn khi có dữ liệu chưa lưu, và phải hỏi xác nhận.
  - Progressive disclosure: chỉ hiện chi tiết khi người dùng cần.
- **Slide:** sơ đồ flow 5–6 bước của một tác vụ (ví dụ: điểm danh một buổi học), đánh dấu chỗ người dùng hay bị lạc.

### A3. Nguyên tắc tâm lý và heuristic (5')
- **Thông điệp:** Đã có sẵn những quy luật về cách con người nhìn, nhớ và quyết định. Dùng chúng thay cho đoán.
- **Ý cần nói (chọn 5–6 thứ đáng nhớ nhất):**
  - **Jakob:** người dùng mong app của bạn chạy giống những app họ đã quen, nên ưu tiên quy ước.
  - **Hick:** càng nhiều lựa chọn thì quyết định càng chậm, nên giảm và nhóm lựa chọn.
  - **Fitts:** mục tiêu càng to và càng gần thì càng dễ bấm (nối sang phần vùng chạm ở B4).
  - **Gestalt:** những thứ gần nhau, giống nhau được hiểu là cùng nhóm (nối sang B1).
  - **Recognition over recall:** cho người dùng nhận ra thay vì bắt họ nhớ.
  - Trích 3 trong 10 heuristic của Nielsen: hiển thị trạng thái hệ thống, ngăn lỗi tốt hơn báo lỗi, nhất quán và tuân thủ chuẩn.
  - Lưu ý: con số "7±2" của Miller hay bị dùng sai. Nên nói về giảm tải nhận thức.
- **Slide:** mỗi luật một slide, gồm 1 câu và 1 ví dụ trước/sau.

### A4. Thiết kế cho mọi trạng thái (4')
- **Thông điệp:** Đừng chỉ thiết kế cho ảnh chụp lý tưởng.
- **Ý cần nói:**
  - Trạng thái dữ liệu: loading, empty, partial, error, offline, dữ liệu cũ, success.
  - Trạng thái control: default, hover, focus, pressed, selected, disabled.
  - Hành động nguy hiểm: xác nhận trước khi làm, hoặc tốt hơn là cho hoàn tác (undo).
  - Nội dung thật: tên rất dài, số rất lớn, danh sách 0 phần tử và 500 phần tử.
- **Slide:** một màn hình danh sách vẽ đủ 4 trạng thái: loading, empty, error, offline.

---

## B. UI FOUNDATION (20')

> Thứ tự trình bày cũng là thứ tự ưu tiên khi làm: cấu trúc trước, polish sau.

### B1. Bố cục và khoảng cách (4')
- **Thông điệp:** Khoảng trắng là công cụ để nhóm, không phải chỗ trống bị thừa.
- **Ý cần nói:**
  - Nhóm bằng khoảng trắng, hạn chế đường kẻ. Khoảng cách trong nhóm nhỏ hơn khoảng cách giữa các nhóm.
  - Căn theo cạnh chung; sắp xếp theo mức độ quan trọng; thứ bậc thị giác dẫn mắt đi đúng thứ tự.
  - Hệ khoảng cách 4/8pt.
  - Tách rõ control và nội dung. Nội dung được tràn mép (bleed), control thì cách mép một khoảng. Tôn trọng safe area.
  - Gợi ý khi còn nội dung bị ẩn; tính trước trường hợp nội dung dài ra hoặc chữ được phóng to.
- **Slide:** cùng một form trình bày bằng đường kẻ và bằng khoảng trắng.

### B2. Typography (4')
- **Thông điệp:** Chữ chiếm phần lớn giao diện. Làm đúng chữ là đã đúng được một nửa.
- **Ý cần nói:**
  - Ít font, ít size, ít weight. Dùng type scale có tên theo vai trò: title, heading, body, caption.
  - Heading giảm dần theo cấp. Line-height theo vai trò: body thoáng (khoảng 1.4–1.6), heading chặt hơn.
  - Body tối thiểu khoảng 16px trên web, 17pt trên iOS. Hỗ trợ phóng to chữ.
  - Dùng số tabular cho bảng và điểm số; cắt chữ (truncation) có chủ đích; độ dài dòng vừa phải.
- **Slide:** một đoạn dùng 5 size và 4 weight, so với bản dùng 3 size và 2 weight.

### B3. Màu sắc (4')
- **Thông điệp:** Màu dùng để truyền nghĩa, không chỉ để trang trí.
- **Ý cần nói:**
  - Đặt màu theo **ngữ nghĩa** (primary, surface, text, muted, danger, success), không theo tên màu.
  - Một màu nhấn chính, một họ màu trung tính; không trộn nhiều họ xám.
  - Tương phản theo WCAG: chữ thường ≥ 4.5:1; chữ lớn và thành phần UI ≥ 3:1. Đo trên cặp màu thực tế hiển thị.
  - Không dùng màu làm tín hiệu duy nhất, luôn kèm icon hoặc chữ.
  - Nâng cao (nhắc qua): OKLCH giúp tạo dải màu đều và làm chế độ tối dễ hơn.
- **Slide:** chữ xám nhạt trên nền trắng kèm số đo tương phản, rồi bản đã sửa.

### B4. Component và tương tác (3')
- **Thông điệp:** Mỗi thứ bấm được phải trông như bấm được, bấm dễ và phản hồi ngay.
- **Ý cần nói:**
  - Ưu tiên control native và quen thuộc trước khi tự chế.
  - Vùng chạm: Apple 44pt, Material 48dp, WCAG 2.2 tối thiểu 24×24px. Đủ khoảng cách giữa các vùng chạm.
  - Phản hồi tức thì (trạng thái pressed); có trạng thái loading khi hành động mất thời gian; focus ring nhìn thấy được khi dùng bàn phím.
  - Mọi control có nhãn; icon không có chữ thì cần tên truy cập được (cho screen reader).
- **Slide:** hàng icon nhỏ sát nhau, so với bản đủ vùng chạm và có nhãn.

### B5. Chữ trên giao diện, UX writing (3')
- **Thông điệp:** Câu chữ cũng là UI.
- **Ý cần nói:**
  - Nói trực tiếp với người dùng, từ ngữ đơn giản, một bộ từ vựng thống nhất trong cả luồng.
  - Nút bắt đầu bằng động từ và nói rõ kết quả: "Lưu điểm" thay vì "OK".
  - Thông báo lỗi nói cách sửa và đặt ngay cạnh chỗ bị lỗi.
  - Màn hình trống chỉ ra việc nên làm tiếp theo.
  - Phần cài đặt mô tả trạng thái BẬT.
- **Slide:** 3 cặp trước/sau: nút, thông báo lỗi, màn hình trống.

### B6. Hoàn thiện và chuyển động (2')
- **Thông điệp:** Polish chỉ làm sau khi mọi thứ đã đúng.
- **Ý cần nói:**
  - Bo góc đồng tâm (radius ngoài = radius trong + padding); bóng đổ thể hiện độ nổi, đường viền thể hiện cấu trúc.
  - Mỗi animation cần một mục đích: phản hồi, chuyển trạng thái, định hướng. Thao tác lặp nhiều thì animation phải tinh tế. Tôn trọng cài đặt reduced-motion.
  - Tránh hiệu ứng không có lý do: gradient, glow, glass, emoji dùng làm icon, card lồng card.
- **Slide:** card lồng card nhiều bóng đổ, so với bản phẳng gọn.

---

## C. Tổng kết (5')

- **Checklist mang về** (1 slide):
  - [ ] Viết được câu "Người dùng đến đây để ___"
  - [ ] Flow có cả luồng lỗi và nút Back chạy đúng
  - [ ] Có đủ trạng thái loading / empty / error / offline
  - [ ] Thứ bậc rõ ràng: nhóm bằng khoảng trắng, căn theo cạnh chung
  - [ ] Type scale gọn, chữ body đủ to
  - [ ] Màu theo ngữ nghĩa, tương phản ≥ 4.5:1, không chỉ dựa vào màu
  - [ ] Vùng chạm đủ lớn, có focus ring và nhãn
  - [ ] Nút bắt đầu bằng động từ, lỗi nói cách sửa
- **Tự chấm nhanh 5 trục, mỗi trục 0–2 điểm:** rõ việc cần làm, thứ bậc thông tin, độ phủ trạng thái, accessibility, nhất quán thị giác. Đạt khi ≥ 8/10 và không trục nào 0 điểm.
- **3 thói quen:** viết câu mục tiêu trước khi vẽ; luôn vẽ trạng thái empty và error; thử dùng app chỉ bằng bàn phím hoặc chữ phóng to trước khi merge.
- **Tài nguyên:**
  - Laws of UX: https://lawsofux.com
  - NN/g 10 heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
  - Apple HIG: https://developer.apple.com/design/human-interface-guidelines/
  - Material 3: https://m3.material.io/
  - WCAG 2.2: https://www.w3.org/TR/WCAG22/
  - interfaces.dev / jakubkrehel/skills: https://github.com/jakubkrehel/skills
