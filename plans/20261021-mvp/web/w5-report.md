# W-5: Kiểm bản web trên staging

Status: DONE_WITH_CONCERNS

Ngày: 2026-10-22. Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`, nhánh `mvp-web`.

## Triển khai và kiểm tra build

- Project Pages: `qlh-staging-web`; URL chuẩn đã kiểm: https://qlh-staging-web.pages.dev/ (`/` và `/lop` đều 200). Wrangler trả thêm URL deployment cụ thể https://24f78b48.qlh-staging-web.pages.dev; URL này không dùng để kiểm CORS vì origin đã allowlist là URL chuẩn của project.
- Đã sửa lỗi nhỏ trong `src/data/auth/index.ts`: client giới hạn `device_label` ở 80 ký tự. Trước sửa, Chrome gửi nhãn 100 ký tự và API từ chối đăng nhập bằng 422 `validation_error`; đăng nhập với nhãn 80 ký tự và sau khi deploy lại đều trả 200. Đây là lỗi làm chặn kiểm thật trên trình duyệt.
- `npm run typecheck`: đạt, exit 0.
- `npm test`: 156 passed, 1 skipped; 17 file, không có test lỗi.
- `npm run build`: đạt. Gzip: JS entry 143.924 B, CSS entry 2.059 B; tuyến nhân sự đầu 147.500 B JS + 3.743 B CSS.
- `VITE_API_BASE_URL=https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1 npm run build`: đạt. Gzip staging: JS entry 143.906 B, CSS entry 2.059 B; tuyến nhân sự đầu 147.477 B JS + 3.743 B CSS (tổng 151.220 B).
- `wrangler pages project list`: thấy `qlh-staging-web`; deploy lại bằng `wrangler pages deploy dist --project-name qlh-staging-web --branch main --commit-dirty=true`: thành công.
- Preflight `OPTIONS /v1/auth/login` sau deploy: 204; `access-control-allow-origin` đúng `https://qlh-staging-web.pages.dev`.

## Kiểm thử trên Chrome/Playwright

- Đăng nhập giáo viên demo bằng form thật: đạt; API login, snapshot và pull dữ liệu trả 200. Console error: 0.
- Lớp 6A, chi tiết lớp 5 tab, buổi đã diễn ra 3 tab, bài kiểm tra, nhập điểm và báo cáo tháng đã mở được.
- Điểm danh một học sinh: thay đổi được gửi lên máy chủ, reload vẫn giữ giá trị. Điểm danh khi offline được lưu cục bộ, tự đồng bộ sau khi bật mạng; reload xác nhận giá trị. Đã trả cả hai ô điểm danh về trạng thái ban đầu.
- Bảng điểm: `7,5` được lưu; `7,3` bị từ chối theo quy tắc nửa điểm. Đã trả điểm về giá trị ban đầu và xác nhận sau reload.
- Service worker đã active; khi ngắt mạng, route `/lop` vẫn mở từ app shell. Manifest trả 200, có `start_url` và hai icon. Đã kiểm metadata cài PWA; không mở hộp thoại cài đặt của Chrome trong lượt headless.
- Ảnh thật và prototype: 52 PNG trong `shots/w5/`, gồm đủ 26 ảnh 390×844 và 26 ảnh 1360×934. Ảnh đã che SĐT và bỏ nội dung trong ô ghi chú nhận xét.

## Đối chiếu prototype và bản thật

| Màn | Khác biệt quan sát | Sửa / lý do |
|---|---|---|
| Lớp | Cấu trúc shell và thẻ lớp khớp. Staging có 3 lớp (gồm hai lớp “Smoke”), prototype chỉ có lớp 6A; số học sinh và chuyên cần khác. | Không sửa; dữ liệu staging khác seed prototype. |
| Chi tiết lớp — Buổi học | Bố cục, thứ tự tab và vùng lịch khớp; số buổi, ngày, trạng thái và số học sinh khác. | Không sửa; dữ liệu staging khác seed prototype. |
| Chi tiết lớp — Bài kiểm tra | Bảng và thao tác khớp; staging có hai bài với thang điểm 15 và 100, prototype có bốn bài thang 10. | Không sửa; dữ liệu bài kiểm tra khác. |
| Chi tiết lớp — Điểm | Bảng điểm khớp về bố cục; số cột bài kiểm tra, giá trị và học sinh nghỉ khác. | Không sửa; dữ liệu staging khác seed prototype. |
| Chi tiết lớp — Học sinh | Trang và cấu trúc danh sách khớp; danh sách và trạng thái học sinh lấy từ staging. | Không sửa; khác dữ liệu. |
| Chi tiết lớp — Báo cáo | Bố cục khớp; staging đang chọn tháng 12/2026 và hiển thị thiếu dữ liệu, prototype dùng seed khác. | Không sửa; khác dữ liệu staging. |
| Buổi học — Điểm danh | Bố cục danh sách, nút trạng thái và thao tác lưu khớp; trạng thái từng em khác theo dữ liệu. | Không sửa; khác dữ liệu staging. |
| Buổi học — Nhận xét | Tab, bộ lọc và khung phiếu khớp; trạng thái phiếu và BTVN trước đó khác. Nội dung ô ghi chú đã được che trong ảnh. | Không sửa; khác dữ liệu staging. |
| Buổi học — Bài tập về nhà | Tab và hai phần giao/chấm khớp; staging không có BTVN buổi trước, prototype có bài tập đã seed. | Không sửa; khác dữ liệu staging. |
| Bài kiểm tra / nhập điểm | Cấu trúc danh sách và form điểm khớp; tên, ngày, thang điểm và điểm từng em khác. `7,5` nhận; `7,3` bị chặn. | Không sửa UI; kiểm tra quy tắc nhập điểm đạt. |
| Lịch | Bố cục lịch khớp; lịch hôm nay staging có buổi 6A, ngày tương ứng trong prototype không có buổi; danh sách lớp cũng khác. | Không sửa; khác dữ liệu staging. |
| Cài đặt | Khung hồ sơ và đổi mật khẩu khớp; staging có một role Admin, prototype có role Giáo viên và Phụ huynh. SĐT đã che trong ảnh. | Không sửa; khác membership staging. |
| Đăng nhập | Form khớp. Prototype có lời mời tạo tài khoản chung; bản thật dùng chữ “Đăng ký cho giáo viên” và thẻ hướng dẫn phụ huynh theo quyết định GL 74.1 (đã ghi ở W-4). | Giữ nguyên theo quyết định GL; không mở đăng ký phụ huynh trong đợt này. |

## File và ghi chú

- Ảnh: `plans/20261021-mvp/web/shots/w5/` (`proto-*.png`, `real-*.png`).
- Mã sửa: `src/data/auth/index.ts`; commit `73f7650` (`fix(auth): limit browser device label length`). Không sửa worker, seed hoặc `design/prototype`.
- Build còn cảnh báo hiện hữu về `src/data/sync.ts` được import tĩnh và động; build vẫn đạt.
- Không ghi SĐT, mật khẩu, token hoặc nội dung nhận xét vào báo cáo/log.
