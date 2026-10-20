# Báo cáo rà soát spec và architecture

Ngày rà soát: 2026-10-18  
Phạm vi: đọc toàn văn `docs/spec.md`, `docs/architecture.md`, `AGENTS.md`, `CLAUDE.md`. Chỉ ghi báo cáo này; không sửa tài liệu nguồn. `CLAUDE.md` chỉ dẫn `@AGENTS.md`, không bổ sung quy tắc riêng.

## Phát hiện

### 1. “Chưa lưu” trong giao diện chưa khớp quyết định chỉ hiện lỗi — **Cao**

- **Vị trí:** `docs/spec.md:95,138,166`; `docs/architecture.md:94,99,101`.
- **Trích:** spec: “cảnh báo chưa lưu” (dòng 95), nhưng quyết định giao diện là “chỉ hiện khi LỖI lưu hoặc đồng bộ” (dòng 138). Architecture nói “Gửi nhận xét” có thể xếp hàng nhưng “phải hiện rõ ‘sẽ gửi khi có mạng’” (dòng 99), trong khi dòng 94/101 nói giao diện chỉ hiện lỗi và không hiện số thay đổi chưa đồng bộ.
- **Vì sao:** Chưa rõ “chưa lưu” nghĩa là chưa được ghi vào IndexedDB (lỗi cần báo), hay chỉ là lệnh đã lưu cục bộ nhưng đang chờ mạng (trạng thái không được hiện). Thông báo riêng khi bấm gửi nhận xét cũng có thể bị hiểu là ngoại lệ cho quy tắc ẩn trạng thái đồng bộ.
- **Đề xuất:** định nghĩa riêng ba thời điểm: ghi cục bộ thành công, chờ gửi, và ghi/đồng bộ thất bại; ghi rõ trạng thái nào hiện tự động, trạng thái nào chỉ phản hồi ngay sau thao tác gửi. Đồng bộ cách dùng “cảnh báo chưa lưu” ở dòng 95 với quyết định này.

### 2. Quyền tạo lớp chưa xác định trong mô hình lớp được gán — **Cao**

- **Vị trí:** `docs/spec.md:18,62,64,70,157`; `docs/architecture.md:81-84`.
- **Trích:** spec cho Giáo viên “Tạo lớp” (dòng 18), quyền được giới hạn vào “các lớp được gán cho từng người” (dòng 64), còn Admin “gán lớp” cho nhân sự (dòng 70). Architecture giới hạn nhân sự vào `assigned_classes` và kiểm quyền theo tài nguyên lớp (dòng 82-84).
- **Vì sao:** Lớp mới chưa thể được gán cho người tạo. Chưa rõ nhân sự có thể tạo lớp rồi Admin gán lại, chỉ Admin tạo lớp, hay quyền `classes:write` tự cho phép tạo lớp trong workspace. Cũng chưa định nghĩa ai sửa/lưu trữ lớp và ai có quyền gán lớp.
- **Đề xuất:** chốt riêng quyền tạo lớp, sửa/lưu trữ lớp, và gán lớp; mô tả cách cấp quyền cho lớp mới trước khi có quan hệ `member_classes`.

### 3. Ranh giới quyền quản lý tài khoản/role chưa khóa vào Admin — **Cao**

- **Vị trí:** `docs/spec.md:17,62-67,107`; `docs/architecture.md:81-84`.
- **Trích:** quyền `accounts_roles` là một nhóm trong ma trận (spec dòng 62); Admin tạo/sửa role và gán lớp (dòng 17, 63); kiến trúc lưu quyền nhóm trong `role_permissions` và dùng hàm kiểm quyền chung (architecture dòng 81-84).
- **Vì sao:** Tài liệu không nói nhóm `accounts_roles` chỉ dành riêng cho Admin hay có thể cấp cho role nhân sự tuỳ chỉnh. Nếu role nhân sự có thể nhận mức `write`, chưa rõ họ có thể mời người, gán lớp, sửa quyền, tạo Admin hoặc vô hiệu hoá Admin hay không. Quy tắc “còn ít nhất một Admin” không tự giới hạn các thao tác đó.
- **Đề xuất:** ghi rõ thao tác nào luôn Admin-only ở tầng máy chủ; cấm tạo/sửa role Admin và cấp quyền Admin từ ma trận; nêu chủ thể duy nhất được sửa membership, role và danh sách lớp gán.

### 4. `scope_kind` của role tuỳ chỉnh và role phụ huynh chưa có quy tắc tạo/gán đầy đủ — **Cao**

- **Vị trí:** `docs/spec.md:23,62-66`; `docs/architecture.md:81-84`.
- **Trích:** spec cho phép Admin “tạo thêm role khác” và role có “phạm vi dữ liệu” (spec dòng 23, 64); architecture liệt kê `scope_kind` là `workspace`, `assigned_classes`, `linked_students` (dòng 81-83).
- **Vì sao:** Spec không nói Admin có chọn `scope_kind` khi tạo role hay không, role tuỳ chỉnh nào được xem là role phụ huynh, hoặc làm sao bảo đảm một role `linked_students` chỉ có thể được gán cho tài khoản phụ huynh. Architecture chỉ mô tả mức quyền bị giới hạn cho role `linked_students`, chưa nêu các bất biến lúc tạo role/gán người.
- **Đề xuất:** xác định `scope_kind` có cố định theo loại role hay do Admin chọn; xác định điều kiện gán role và quan hệ guardian/student; mô tả cách ngăn role nhân sự nhận phạm vi workspace hoặc role phụ huynh nhận phạm vi lớp ngoài liên kết.

### 5. Thu hồi quyền khi thiết bị đang offline không có hành vi an toàn được chốt — **Cao**

- **Vị trí:** `docs/spec.md:66,67`; `docs/architecture.md:100-101,124`.
- **Trích:** spec nói đổi role, gỡ lớp, vô hiệu hoá tài khoản “có hiệu lực ngay ở máy chủ” và quyền được kiểm tại máy chủ (dòng 66-67). Architecture thừa nhận cache offline “chưa thu hồi tức thì được” (dòng 124), và lệnh bị từ chối khi đồng bộ thì nội dung vẫn giữ trên máy (dòng 100).
- **Vì sao:** Máy chủ chặn hành động mới, nhưng tài liệu không quy định liệu giao diện còn cho người đã bị thu hồi quyền đọc cache cũ, hoặc xử lý/xoá dữ liệu cục bộ nhạy cảm ra sao. “Hiệu lực ngay” có thể bị hiểu là áp dụng cả trên thiết bị mất mạng.
- **Đề xuất:** quyết định phạm vi của “hiệu lực ngay”: máy chủ hay cả bản cache. Chốt hành vi khi mở app/đồng bộ sau khi membership bị thu hồi, gồm dữ liệu nào bị ẩn hoặc xoá và cách xử lý lệnh chờ bị từ chối.

### 6. “Mỗi người dùng một role” chưa đáp ứng rõ tài khoản vừa là phụ huynh vừa là nhân sự — **Trung**

- **Vị trí:** `docs/spec.md:20,64,66,70`; `docs/architecture.md:81,88`.
- **Trích:** phụ huynh có thể liên kết nhiều con, kể cả khác lớp (spec dòng 20); “Mỗi người dùng một role trong workspace” (dòng 66); architecture mô hình hoá `memberships` theo user/workspace/role, còn liên kết phụ huynh-học sinh ở `guardian_student` (dòng 81, 88).
- **Vì sao:** Chưa rõ cùng một SĐT/tài khoản trong một workspace có thể vừa là nhân sự vừa là phụ huynh của học sinh không. Một role duy nhất dường như loại trừ trường hợp này; chưa có quy tắc chọn tài khoản khác hay ưu tiên một vai trò. Việc một nhân sự thuộc nhiều lớp được hỗ trợ qua `member_classes`, nhưng chưa nêu giới hạn số lớp hoặc xử lý gán lớp rỗng.
- **Đề xuất:** chốt một role hay nhiều membership/role trên cùng tài khoản trong một workspace; ghi riêng rằng nhân sự có thể được gán nhiều lớp và quy tắc khi không được gán lớp.

### 7. Quyền xem bài giảng của người tạo chưa gắn rõ với quyền role và trạng thái tài khoản — **Trung**

- **Vị trí:** `docs/spec.md:58,62,66`; `docs/architecture.md:85`.
- **Trích:** “Người tạo luôn thấy bài giảng của mình, không cần gắn buổi nào” (spec dòng 58); người khác cần nhóm Bài giảng và quyền xem buổi đang dùng bài giảng đó; architecture lặp lại ngoại lệ `created_by` (dòng 85).
- **Vì sao:** “Luôn” chưa nói có áp dụng khi người tạo bị đổi role, mất quyền Bài giảng, bị gỡ khỏi workspace hoặc tài khoản bị vô hiệu hoá hay không. Cũng chưa rõ ngoại lệ `created_by` chỉ cấp quyền đọc nội dung hay cả tệp đính kèm. Đây là ngoại lệ trực tiếp với mô hình kiểm quyền theo role/phạm vi.
- **Đề xuất:** giới hạn ngoại lệ theo membership đang hoạt động trong cùng workspace; nêu rõ quyền này gồm metadata/nội dung/tệp gì và xử lý khi role hoặc tài khoản đổi.

### 8. Khả năng soạn bài giảng offline chưa khớp danh sách dữ liệu cache — **Trung**

- **Vị trí:** `docs/spec.md:59`; `docs/architecture.md:93,99`.
- **Trích:** spec cho phép “soạn phần chữ và gắn bài giảng vào buổi khi mất mạng” (dòng 59); architecture cũng cho hàng đợi các thao tác này (dòng 99), nhưng danh sách “Lưu trên máy” (dòng 93) không nêu thư viện/bài giảng/phần bài giảng.
- **Vì sao:** Không rõ offline chỉ tạo bản nháp mới và gắn tạm, hay được sửa bài giảng đã tồn tại. Trường hợp sửa bài giảng dùng chung cần đồng bộ phiên bản và xử lý xung đột vì mọi buổi đang dùng thấy thay đổi mới (spec dòng 56).
- **Đề xuất:** liệt kê dữ liệu bài giảng nào được cache; xác định thao tác offline được hỗ trợ cho bài giảng mới/đã tồn tại và cách xử lý xung đột khi nhiều người sửa.

### 9. Bản đầu cho phép sửa lịch lặp nhưng chưa chốt quyền và ảnh hưởng — **Trung**

- **Vị trí:** `docs/spec.md:38,40,89-90,159`; `docs/architecture.md:64,89,128-130`.
- **Trích:** spec bản đầu gồm “sửa lịch lặp của lớp” chỉ tác động buổi chưa diễn ra, cùng thêm buổi lẻ/hủy buổi (dòng 159); architecture mô tả cron sinh buổi nhưng không ghi quy tắc cập nhật lịch lặp (dòng 64, 89).
- **Vì sao:** Bảng tính năng theo actor đánh dấu lịch tuần/hủy-dời buổi là chưa có (spec dòng 89-90), còn mục 8 đưa một phần lịch/sửa lịch vào Bản đầu. Cột TK có vẻ là tình trạng màn thiết kế, nên đây chưa chắc là mâu thuẫn phạm vi; tuy nhiên chưa rõ ai được sửa lịch, buổi nào bị tạo/xóa khi đổi lịch, và xử lý lịch đã qua/đã hủy/buổi lẻ.
- **Đề xuất:** ghi rõ TK là trạng thái prototype, không phải phạm vi phát hành; bổ sung quy tắc quyền và cập nhật dữ liệu cho sửa lịch lặp. Nếu mục 5 đã cố ý chỉ trạng thái thiết kế thì thêm chú thích đó.

### 10. Mục 5, 8 và 10 trộn phạm vi sản phẩm với trạng thái thiết kế — **Trung**

- **Vị trí:** `docs/spec.md:79,85-107,154-177,189-200`; `AGENTS.md:13-16`.
- **Trích:** mục 5 đặt ký hiệu TK là “đã có màn/chưa có” (dòng 79); mục 8 đưa sửa/lưu trữ lớp và hồ sơ cơ bản vào Bản đầu nhưng nhiều dòng mục 5 tương ứng ghi ✗ (dòng 87, 92, 157-158); mục 10 lại liệt kê thiết kế thêm các màn này (dòng 195-196). AGENTS yêu cầu chỉ làm tính năng ở Bản đầu (dòng 14).
- **Vì sao:** Nếu không phân biệt “màn prototype chưa có” với “tính năng không thuộc bản đầu”, người đọc/agent có thể bỏ sót tính năng đã chốt trong mục 8 hoặc làm nhầm hạng mục “Làm sau”. Mục 10.8 còn yêu cầu thiết kế bài giảng/nhân sự/role, dù các tính năng đó ở “Làm sau” (mục 8, dòng 176-177); điều này có thể là thiết kế trước nhưng chưa nói rõ.
- **Đề xuất:** thêm cột/trạng thái riêng cho phạm vi phát hành và tình trạng thiết kế; đánh dấu rõ việc mục 10 là thiết kế prototype, không thay đổi mốc triển khai mục 8. Gắn nhãn “Làm sau” cho hạng mục web, bài giảng, role và nhân sự khi xuất hiện ở mục 5/10.

### 11. Câu “cài đặt giáo viên” còn dấu vết mô hình một giáo viên — **Thấp**

- **Vị trí:** `docs/spec.md:7,105`; `AGENTS.md:3`.
- **Trích:** spec dùng mô hình workspace do Admin quản lý và nhiều nhân sự (dòng 7, 17-20), nhưng bảng mục 5 vẫn ghi “ngôn ngữ, cài đặt giáo viên” (dòng 105). AGENTS mô tả app “cho giáo viên dạy lớp riêng” (dòng 3).
- **Vì sao:** “Cài đặt giáo viên” không rõ là cài đặt cá nhân của thành viên, cấu hình workspace của Admin, hay thiết lập chung của một giáo viên duy nhất. Mô tả chung trong AGENTS có thể chỉ là định vị sản phẩm, không nhất thiết là ràng buộc một người dùng.
- **Đề xuất:** đổi nhãn thành “cài đặt tài khoản/thành viên” hoặc “cài đặt workspace” theo đúng chủ thể sở hữu; nếu AGENTS định nghĩa giới hạn một giáo viên thì cập nhật để phù hợp với workspace nhiều nhân sự.

### 12. Phạm vi liên kết phụ huynh theo SĐT qua nhiều lớp/workspace chưa rõ — **Trung**

- **Vị trí:** `docs/spec.md:20,71-75`; `docs/architecture.md:80-84,88`.
- **Trích:** xác nhận OTP sẽ “tự liên kết mọi con có cùng SĐT (kể cả khác lớp)” (spec dòng 71); dữ liệu phụ thuộc workspace và `guardian_student` (architecture dòng 80-84).
- **Vì sao:** “Mọi con” chưa chỉ rõ là mọi học sinh cùng SĐT trong workspace hiện tại hay trên toàn hệ thống. Nếu qua workspace khác thì có thể lộ dữ liệu giữa các giáo viên; nếu chỉ cùng workspace thì cần nói rõ. Dòng 20 cũng không nói phụ huynh có thể xem con ở workspace khác không.
- **Đề xuất:** nêu rõ tự liên kết chỉ trong workspace của lời mời (đề xuất nếu đó là ý định), và cách một SĐT có tài khoản/quan hệ ở nhiều workspace được xác thực.

### 13. Một số quy tắc phạm vi bài giảng còn để trống — **Trung**

- **Vị trí:** `docs/spec.md:54-59`; `docs/architecture.md:85,137`.
- **Trích:** loại tệp và dung lượng “chưa chốt” (spec dòng 57); architecture cũng ghi giới hạn loại/dung lượng là chưa kiểm chứng (dòng 137).
- **Vì sao:** Các quy tắc quyền xem đã mô tả nhưng không có giới hạn tệp được phép, dung lượng, hay quyết định có thể tải tệp lên ngay ở bản nào. Bài giảng nằm “Làm sau” (spec dòng 176), vì vậy chi tiết này không chặn phạm vi bản đầu nhưng cần được quyết trước khi triển khai tính năng.
- **Đề xuất:** giữ rõ trạng thái “chưa chốt” trong backlog triển khai; chốt loại/dung lượng và quyền tải xuống trước khi đưa bài giảng vào phạm vi thực hiện.

### 14. Mục thiết kế trạng thái đồng bộ còn là đầu việc dù quy tắc đã chốt — **Thấp**

- **Vị trí:** `docs/spec.md:138,197,199`.
- **Trích:** dòng 138 chốt giao diện không hiện trạng thái đồng bộ, chỉ hiện lỗi; mục 10.5 yêu cầu “Thiết kế trạng thái rỗng, lỗi, offline”; mục 10.7 yêu cầu bỏ chip trạng thái đồng bộ và thêm lỗi lưu, ghi “đã làm ở prototype”.
- **Vì sao:** Dòng 10.7 có thể là việc cập nhật board chứ không còn việc thiết kế, nhưng trạng thái “đã chốt/đã làm” và thứ tự danh sách không phân biệt rõ. “Thiết kế trạng thái offline” cũng có thể bị hiểu thành hiển thị trạng thái đồng bộ thường trực.
- **Đề xuất:** đánh dấu 10.7 hoàn tất hoặc chỉ giữ việc cập nhật board; ở 10.5 nêu rõ trạng thái offline không được biến thành chip đồng bộ, và chỉ lỗi lưu/đồng bộ được hiển thị theo mục 4.

## Câu hỏi cần người dùng quyết

1. **Tạo lớp:** Nhân sự có quyền tự tạo lớp không? Nếu có, lớp mới tự gán cho người tạo hay chờ Admin gán? Ai được sửa/lưu trữ lớp và gán lớp cho nhân sự?
2. **Role và tài khoản:** Một người có thể vừa là phụ huynh vừa là nhân sự trong cùng workspace không? Role tuỳ chỉnh được phép chọn `scope_kind` hay mỗi loại role có scope cố định? Có role workspace-wide nào ngoài Admin không?
3. **Quản trị:** `accounts_roles:write` có thể cấp cho role không phải Admin không? Thao tác nào tuyệt đối chỉ Admin được làm, nhất là tạo role, mời nhân sự, gán lớp, vô hiệu hoá tài khoản?
4. **Offline và thu hồi:** “Chỉ hiện lỗi” có cho phép thông báo ngay sau thao tác “nhận xét sẽ gửi khi có mạng” không? Khi quyền bị thu hồi lúc offline, có cần ẩn/xoá cache cục bộ ngay lần mở app tiếp theo không?
5. **Bài giảng offline/ownership:** Offline cho phép sửa bài giảng đã có hay chỉ soạn bài mới? Người tạo có giữ quyền xem sau khi role/membership bị thu hồi không, và quyền đó gồm tệp không?
6. **Liên kết SĐT:** “Mọi con cùng SĐT” chỉ trong workspace của lời mời hay qua nhiều workspace? Một tài khoản phụ huynh có thể liên kết con ở workspace khác không?
7. **Lịch lặp và mục 5/8/10:** Xác nhận mục 5 là trạng thái thiết kế prototype, còn mục 8 là phạm vi phát hành; mục 10 được phép thiết kế trước tính năng “Làm sau” hay chỉ các tính năng Bản đầu?

## Ghi chú đối chiếu phạm vi

- Không thấy thuật ngữ bảng dữ liệu nào bị gọi tên khác nhau giữa spec và architecture: spec không quy định tên bảng; architecture dùng các tên `users`, `memberships`, `roles`, `role_permissions`, `member_classes`, `guardian_student`, `lectures`, `lecture_sections`, `section_files`, `session_lectures`.
- Quy tắc chung về `workspace_id` thay `teacher_id` nhất quán giữa spec mục 1, 4, 8 và architecture mục 1, 4. Dấu vết mô hình một giáo viên thấy rõ nhất là nhãn “cài đặt giáo viên” ở spec dòng 105; mô tả “cho giáo viên dạy lớp riêng” ở AGENTS có thể chỉ là bối cảnh sản phẩm.
- Không thấy spec yêu cầu hiện chip “đã đồng bộ/chờ đồng bộ”; ngược lại spec dòng 138 đã cấm. Điểm chưa rõ là “cảnh báo chưa lưu” ở dòng 95 và thông báo gửi nhận xét chờ mạng trong architecture dòng 99.
- Hai quy tắc “mỗi người dùng một role” và phụ huynh có nhiều con/nhiều lớp không tự mâu thuẫn: một phụ huynh có thể liên kết nhiều học sinh. Chưa rõ là tài khoản có đồng thời vai trò nhân sự/phụ huynh hay không.
- Một số mục mục 5 đánh dấu ✗ nhưng mục 8 đã chọn vào Bản đầu. Vì cột được định nghĩa là trạng thái màn TK, đây là chỗ dễ nhầm hơn là mâu thuẫn chắc chắn về phạm vi.

## Status: DONE_WITH_CONCERNS

**Summary:** Đã đọc đủ bốn tài liệu và ghi nhận các mâu thuẫn/điểm cần quyết, gồm trạng thái offline, quyền tạo và gán lớp, ranh giới Admin/role tuỳ chỉnh, thu hồi quyền trên cache, bài giảng và cách đọc các mục 5/8/10. Báo cáo nêu riêng các điểm chưa chắc để người dùng xác nhận; không chỉnh sửa tài liệu nguồn.
