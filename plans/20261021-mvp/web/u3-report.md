# U-3 · UX v2 giáo viên desktop

Status: DONE_WITH_CONCERNS

## Đã làm

- Đồng bộ `TodayCard.tsx`, `today.module.css`, `todayModel.ts`, `ClassListPage.tsx` và `classes.module.css` với prototype hiện tại. `diff -u` xác nhận cả năm file giống hệt; test model dùng fixture của harness thật.
- Danh sách lớp có thẻ Hôm nay màu trắng, lịch buổi kế tiếp trên thẻ lớp, hàng buổi có giờ/tên lớp/ngày-buổi/pill trạng thái; việc còn dở là dải vàng nhạt có dòng phụ và mũi tên, phần còn lại là chữ phụ.
- Tạo lớp: chuyển nút Huỷ vào thanh nút như prototype để mobile chỉ hiện nút Tạo lớp toàn chiều rộng; desktop vẫn có hai nút trong thanh. Thanh tab mobile được giới hạn theo dynamic viewport và shell cắt phần tràn ngang ngoài vùng cuộn nội dung.
- Sửa lớp: CSS module giới hạn dialog ở chiều rộng viewport trên mobile. Báo cáo: giới hạn nội dung `Collapse` và khung chi tiết theo chiều rộng thẻ.
- Điểm danh, Học sinh, Báo cáo, Bài kiểm tra: cột theo nội dung; bảng điểm hiển thị cuộn ngang trong vùng bảng; báo cáo dùng lưới 1fr/380px và panel dính; điểm dùng `formatScore`.
- Harness U-3 có các route kiểm tra/chụp ảnh; fixture không được import vào bundle production.

## Đối chiếu ảnh

Đã chụp lại toàn bộ 18 ảnh `proto-*` từ server prototype hiện tại (seed prototype, 1440×900 và 390×844), và chụp lại 21 ảnh `real-*` của harness thật; riêng Tạo lớp, Sửa lớp và Báo cáo được chụp lại sau chỉnh CSS. Đã xem từng cặp với ảnh chuẩn `after/final` và `after/teacher`; so sánh khác dữ liệu fixture được cho phép. Ảnh nằm tại `plans/20261021-mvp/web/shots/u3/`.

| Màn | Khác biệt còn lại sau so sánh | Trạng thái / bằng chứng |
|---|---|---|
| Lớp | Fixture harness có hai lớp, tên/điểm danh/việc khác; prototype có một lớp. Bố cục, màu và thành phần thẻ Hôm nay, việc còn dở, buổi kế tiếp khớp ảnh chuẩn. | Chỉ khác nội dung dữ liệu. Nguồn năm file lớp nêu trên giống byte với prototype hiện tại. |
| Tạo lớp | Nội dung dữ liệu giống seed; form và chân nút khớp. | Chụp lại `proto/real-{d,m}-gv-tao-lop.png`; document và body ở mobile đều 390px. |
| Sửa lớp | Không còn tràn ngang trên mobile. | 390×844: document 390px, dialog `scrollWidth`/width 390px. Ảnh mới `real-{d,m}-gv-sua-lop.png`. |
| Buổi học và buổi chi tiết | Dữ liệu học sinh, điểm danh và giáo viên theo fixture khác ảnh chuẩn; một số nội dung phụ thuộc trạng thái phân công. Bố cục tổng thể khớp. | Ảnh `proto-*` và `real-*` đã chụp lại; không thay fixture nghiệp vụ chỉ để đổi dữ liệu ảnh. |
| Buổi chưa tới | Ngày/buổi theo fixture. | Có ảnh riêng `proto-m-gv-buoi-chua-toi.png` và `real-m-gv-buoi-chua-toi.png`; nội dung dữ liệu khác được phép. |
| Bài kiểm tra, Điểm, Học sinh | Tên, số lượng, điểm và trạng thái học sinh khác seed; khung, khoảng cách, thành phần và thứ bậc chữ khớp. | So với cả hai bộ chuẩn desktop/mobile. Không còn tràn document: đã giới hạn thanh tab theo `100dvw` và vùng shell theo chiều ngang; bảng điểm vẫn cuộn riêng. |
| Báo cáo | Dữ liệu học sinh khác seed. Khung mở rộng không vượt chiều rộng card. | 390×844: document/body 390px; chi tiết học sinh 326px. Ảnh mới `real-{d,m}-gv-bao-cao.png`. |
| Cài đặt | Harness thật hiện lỗi React Router “404 Not Found”; ảnh chuẩn và prototype hiển thị Cài đặt. | Không sửa route/Page thuộc phần U-2. Ảnh lỗi `real-{d,m}-gv-cai-dat.png` được giữ làm bằng chứng và cần người phụ trách U-2 xử lý. |

### Đo tràn mobile

- Prototype hiện tại: ở viewport 390×844, document/body đều 390px cho `/lop`, `/lop/moi`, các tab buổi học, bài kiểm tra, điểm, học sinh, báo cáo và cài đặt.
- Harness thật: `/lop`, `/lop/moi`, `/lop/6a/bai-kiem-tra`, `/lop/6a/hoc-sinh`, `/lop/6a/bao-cao` đều có document/body 390px; sửa lớp có document/dialog 390px. Báo cáo mở chi tiết có document/body 390px và chi tiết 326px.
- Các route giáo viên đã kiểm tra ở viewport 390×844 đều có `innerWidth`, `documentElement.scrollWidth` và `body.scrollWidth` bằng 390px. Bảng Điểm giữ thao tác cuộn ngang bên trong thẻ.

## W-7 · Bổ sung vùng bấm

Đo bằng Puppeteer trên harness sau khi mở các route tương ứng ở 1440×900 và 390×844. Script lấy bounding box phần tử và pseudo `::before`; với mỗi loại đã xác nhận điểm ngoài bounding box cũ nhưng trong vùng mở rộng vẫn hit đúng nút/link qua `elementFromPoint`. Pseudo trong suốt, không tham gia flow và giữ kích thước vẽ cũ.

| Màn / điều khiển | Trước | Sau (hộp vẽ → vùng bấm) | Kết quả ở viewport còn lại |
|---|---:|---:|---|
| Buổi học · menu hàng buổi (desktop) | 27.7×44px | 27.7×44px → 36×44px | Mobile không có điều khiển dưới 44px. |
| Buổi học · link tên buổi (desktop) | 43.9–83.5×19px | giữ nguyên hộp vẽ → chiều cao hit 36px | Mobile link hàng buổi cao tối thiểu 44px. |
| Học sinh · menu hàng học sinh (desktop) | 32×44px | 32×44px → 36×44px | Mobile không có điều khiển dưới 44px. |
| Báo cáo · nút mở dòng học sinh (mobile) | 40–41.1×326px | giữ nguyên hộp vẽ → 44×326px | Desktop hành động chính đạt tối thiểu 36×36px. Dòng cao 58.7px giữ nguyên. |
| Bài kiểm tra · link tên bài (desktop) | 24.6–70.7×19px | giữ nguyên hộp vẽ → tối thiểu 36×36px | Mobile không có điều khiển dưới 44px. |
| Điểm danh · nút chọn trạng thái (desktop/mobile) | Tối thiểu 74×44px / 96×44px | Không cần sửa | Nút “Tất cả có mặt” và “Lưu điểm danh” cũng cao ít nhất 44px. |

Sau chỉnh, script xác nhận hit-test bên ngoài hộp vẽ nhưng bên trong pseudo-element cho menu buổi (36×44), menu học sinh (36×44), tên bài (36×36) và nút báo cáo (44px cao); kích thước vẽ của bốn phần tử vẫn lần lượt 27.7×44, 32×44, 24.6×19 và 326×41.1px. Các route của cả năm màn đã được mở và đo ở cả hai viewport; không sửa `src/shared/**`, guardian hoặc settings.

## Kiểm chứng

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | Đạt |
| `npm test` | 31 file đạt, 1 bỏ qua; 246 test đạt, 1 bỏ qua |
| `npm run build` | Đạt; `check-bundle.mjs` đạt. JS entry gzip 146.52 KB (dưới 200 KB). |

Commit trước: `69a49a7`; đồng bộ prototype/tràn ngang `839a3d0`; vùng bấm W-7 `0d1f125`. Chỉ các file U-3/W-7 liên quan được stage; file W-2 không được stage.
