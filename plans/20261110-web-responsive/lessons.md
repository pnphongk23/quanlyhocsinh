# Bài học · chuẩn hoá responsive 2 luồng (Cài đặt + Điểm danh)

Đợt mẫu của QL-004 (2026-11-10 → 11). Dùng khi áp cho màn còn lại.

## Cách làm đã chạy được
- Thứ tự: rules + token + mock HTML 3 khổ → chủ duyệt ảnh → khung/component/gate → chuyển từng luồng → reviewer độc lập. Duyệt mock trước khi viết mã tránh làm lại phần lớn: mọi tranh cãi bố cục (sheet phải ở tablet, 1 chip ở mobile, cột "Mặc định") được chốt trên ảnh.
- 4 tầng, chỉ `src/shared/layout` biết mốc. Màn chọn mẫu trang (PageShell / FormPage / MasterDetailPage) và truyền slot; `useLayout()` chỉ dùng cho hành vi (placement sheet), không cho style.
- Component dùng chung không tự đo khổ: Sheet/Modal nhận `placement` từ mẫu trang; khác biệt nội tại dùng `@container` hoặc token mật độ.
- Làm một màn chuẩn trước (Bộ tiêu chí), rồi mới chạy song song các màn còn lại theo màn chuẩn đó. Song song chỉ khi write-set tách nhau, mỗi Dev một worktree, gate dùng cổng/thư mục riêng (`LAYOUT_GATE_PORT`, `LAYOUT_GATE_OUT`).

## Gate: bắt được gì, sót gì
- G1 (vitest, allowlist chỉ thu nhỏ) chặn `@media` bề rộng / `useIsDesktop` / giá trị ghi cứng mới, và màn của luồng không đi qua mẫu trang. Kiểm ngược bắt buộc: thêm tạm vi phạm → phải đỏ.
- G2 (Playwright local, 3 khổ × mọi trạng thái) đo hình học. Baseline Pha 2 bắt đúng lỗi cũ: lệch lề trái 48–72px, nút sắp xếp <44px, sheet chồng footer, cột trạng thái lệch 156px, trạng thái tải/lỗi mất tiêu đề.
- G2 XANH KHÔNG có nghĩa là đúng mock. Cài đặt chưa chuyển vẫn 0 vi phạm dù desktop còn 2 cột + form nhúng. Bắt được nhờ G1 (d) và TL soi ảnh so mock. → luôn soi ảnh nén 3 khổ cạnh mock, không nghiệm thu chỉ bằng G2.
- Mỗi lần soi ảnh thấy lỗi mà G2 sót thì thêm phép đo (chỉ làm chặt) + kiểm ngược trên ảnh cũ:
  - luật "nút desktop ≥90% cột" ban đầu báo sai ở bộ chọn lớp sidebar và nút icon → chỉ xét nút có chữ trong vùng nội dung, so với cột nội dung;
  - khối EmptyState hẹp hơn cột (lệch 74px ở 834, 488px ở 1440) → luật khối cấp đầu rộng bằng cột;
  - footer FormPage ghim đáy viewport ở tablet/desktop, cách xa form → luật khoảng cách trường cuối → footer.
- G2 dễ đỏ giả khi máy tải nặng (2 Dev chạy suite cùng lúc): chờ cố định 900ms không đủ → nên chờ marker `data-measure="title"` thay vì chờ thời gian. Test vitest có timeout cũng đỏ giả lúc tải nặng; chạy lại riêng file trước khi kết luận.

## Lỗi hay gặp khi chuyển màn
- `margin-inline:auto` + `width:min(100%, --form-max)` → màn bị căn giữa ở desktop. Bỏ; cột form căn trái theo PageShell.
- `td { display:flex }` làm lệch cột và viền hàng. Giữ `display: table-cell`, dàn nội dung bằng phần tử con.
- Tiêu đề cạnh nút quay lại ở mobile làm lệch lề trái; nút quay lại đặt hàng riêng phía trên tiêu đề.
- Nút đóng sheet phải là "×" (không dùng chevron); footer sheet nền đặc, nằm trên tab bar/rail.
- Thứ tự nút: Huỷ trước, nút chính bên phải, cùng một thứ tự trên mọi form.
- Đổi route (màn Email riêng) chạm `src/roles/account/routes.ts` dùng chung cho phụ huynh → luôn chụp màn phụ huynh trước/sau.

- Phép đo cũng có thể sai: "cột trạng thái thẳng" ban đầu trộn marker với mọi nút segmented (3 vị trí x mỗi hàng) nên không bao giờ xanh. Dev BLOCKED kèm số đo thay vì nới ngưỡng là đúng; sửa phép đo (chỉ marker, hoặc nút đầu mỗi hàng) + kiểm ngược (dịch 1 hàng 12px → đỏ 12px).
- Chuyển khung màn chi tiết có thể sinh hồi quy ở trạng thái biên: cho detail tự render khi lớp chưa tải xong làm màn hiện "Không tìm thấy buổi học" trong lúc đồng bộ. Kịch bản G2 `dang-tai`/`loi` + soi ảnh bắt được; thêm test phân biệt "đang tải" và "không có".
- Nợ có chủ đích: `ResponsiveSlot` (chọn cây nội dung theo khổ) + `variant` của AttendancePanel còn vì tab BTVN/Nhận xét chưa chuyển và vẫn có bản desktop riêng. Gỡ khi các tab đó chuyển sang component responsive chung.

## Reviewer độc lập (G4) bắt được gì mà G1/G2 + soi ảnh sót
G1/G2 xanh 45/45, ảnh khớp mock, 1118 test pass, nhưng G4 (model khác, có thao tác thật) vẫn FAIL với 6 MAJOR. Tất cả là lỗi HÀNH VI, không lỗi hình học:
- Lưu lỗi vẫn rời màn: callback lưu dùng `void submit()` nên hộp "Chưa lưu" coi `undefined` là thành công. → callback lưu phải trả kết quả thật.
- Đổi khổ mất nháp: chọn cây component theo khổ (`ResponsiveSlot`) làm remount phần có trạng thái. → phần có trạng thái giữ một danh tính; chỉ đổi trình bày.
- Mất kéo-để-tải-lại và nút "Tải lại" desktop khi gộp màn: `containerRef` không gắn. → liệt kê hành vi của màn cũ trước khi gộp.
- Menu "…" hàng cuối bị cắt bởi `overflow-x:auto` của bảng. → menu trong vùng cuộn phải là popover/overlay.
- Sheet tự làm bằng `<section role=dialog>`: không focus trap, không Escape, không trả focus. → dùng Sheet/native dialog có sẵn.
- Đồng bộ đầu lỗi bị đánh dấu "xong" → hiện "Không tìm thấy buổi học"; không reset khi đăng xuất. → tách đang tải/lỗi/offline/không có; chỉ "không tìm thấy" sau khi tải thành công.
Rút ra:
- Ảnh + gate hình học không chứng minh hành vi. Brief chuyển màn phải có danh sách hành vi cần giữ (đã thêm vào `briefs/p3-common.md`) và Dev thao tác thật từng mục.
- Cho reviewer soi màn mẫu (Bộ tiêu chí) trước khi nhân rộng thì M4/M5 đã bị bắt trước khi Điểm danh chép mẫu đó.
- Gate làm chặt sau G4: kịch bản điểm danh trạng thái lẫn đo chính nhóm nút; kịch bản mở menu hàng cuối; thao tác mở editor/menu thất bại thì đỏ (trước đây nuốt lỗi); G1 bắt `@media (width >= …)`, longhand `padding-inline`…, và kiểm mẫu trang theo JSX thật thay vì chỉ tên.
- Đề xuất sửa playbook TL/Dev: `playbook-patch.md` (CEO đã áp 2026-11-12).
- Kịch bản hành vi phải mô phỏng đúng kiến trúc. Kịch bản "lưu lỗi" đầu tiên giả máy chủ trả 500, nhưng app offline-first: lưu nghĩa là ghi Dexie + outbox, máy chủ lỗi thì thử lại sau, nên rời màn là đúng. Lỗi thật là ghi cục bộ thất bại. Trước khi viết kịch bản lỗi, đối chiếu architecture.md (đường ghi, đồng bộ).
- TL thấy nghi vấn trên ảnh thì kiểm mã/dữ liệu trước khi giao. "Thứ tự học sinh khác theo khổ" hoá ra là so hai đoạn khác nhau của cùng một thứ tự (ảnh mobile đã cuộn), trong brief còn trỏ nhầm file; mất một vòng Dev.
- Bản sửa có thể làm hỏng phần nằm ngoài luồng đang chấm. Bản sửa M2 (giữ mount cây BTVN/Nhận xét) làm desktop hiện 2 thanh tab ở tab Nhận xét/BTVN. G2 không có kịch bản cho 2 tab này, và TL chỉ soi tab Điểm danh sau khi sửa. → màn có tab dùng chung khung thì gate phải chụp mọi tab, kể cả tab chưa chuyển.
- Lỗi còn tồn: breadcrumb cách không đều (link có `padding-inline` để đủ vùng bấm 44, crumb cuối không có). Đã thử bỏ padding và mở vùng bấm bằng pseudo-element, nhưng G2 đo khung phần tử nên báo vùng bấm <44 và chữ bị cắt ở Đổi mật khẩu. Không nới luật. Hướng làm sau: cho mọi crumb cùng padding (cả crumb cuối) hoặc dùng separator nằm trong vùng đệm.
- Sau khi gate hành vi xanh vẫn phải soi ảnh: ảnh 1440 sau "Tải lại" lộ trạng thái "Đã tải lại" hiện 2 lần; gate không đo được loại lỗi này.
- Giữ song song hai cây mobile/desktop để không mất nháp sinh ra hai lỗi mới (G4 vòng 2): nháp BTVN mồ côi khi qua mốc 1024 và thanh tab vẽ 2 lần. Sửa gốc: nháp + hàm lưu đưa lên trên lớp chọn trình bày (`useHomeworkSectionDraft`), mọi cây cùng đọc/ghi. Còn tồn cùng loại: nháp chấm điểm desktop chưa hiện ở cây di động.
- Hộp "Chưa lưu thay đổi" của màn nhiều phần phải lưu đúng phần đang dở. Bản đầu gọi hàm lưu điểm danh, trả `false` khi điểm danh không dở, nên Lưu BTVN không bao giờ rời màn. Script tái hiện của reviewer bắt được, vitest thì không.
- Trạng thái đồng bộ: "thành công" chỉ đặt sau một lượt thật sự tải xong. Sự kiện `online` với outbox rỗng không fetch gì nhưng từng đặt `success` → "Không tìm thấy buổi học", mất Thử lại.

- Sửa lỗi a11y có thể làm mất chức năng: bỏ live region trùng bằng cách đổi `<DesktopOnly>` thành `layout === "desktop" &&` làm nút "Tải lại" desktop biến mất (G4 vòng 3, M9), vì nút chỉ hiện khi nằm trong container `page-header`. Gate lúc đó chỉ đo số live region, không đo nút còn nhìn thấy. → mỗi hành vi trong "Giữ hành vi" cần một phép đo trực tiếp (nút tải lại thấy được, bấm được ở ≥1024), không suy ra từ phép đo khác.

## Vận hành worker
- Máy tải nặng (load 10–17) làm vitest lỗi khởi động worker và G2 chụp trang trắng. Không kết luận đỏ từ một lượt: chạy lại riêng file/kịch bản (`LAYOUT_GATE_ONLY`), ghi cả hai log.
- Worker hay quá hạn và treo sau khi tự nén ngữ cảnh. Brief phải có hạn cứng, thứ tự ưu tiên, và "commit phần xanh trước khi làm tiếp"; khi quá hạn, TL nhận phần đã commit và tự kiểm thay vì chờ.

## Quy trình
- Brief ghi rõ write-set; khi mock đã duyệt cần file ngoài write-set (route), Dev BLOCKED đúng cách và TL mở rộng write-set, không đổi thiết kế.
- Ảnh QA chỉ ở `/tmp/qlh-evidence/ql-004/`, không commit.
