# Việc 02: cập nhật docs/spec.md và docs/architecture.md: push bằng FCM

Người giao: General Lead. Thư mục: `/Users/phamnhuphong/Git/quanlyhocsinh` (thư mục chính, có thay đổi chưa commit của người dùng).

## Đọc

`AGENTS.md`, `docs/spec.md`, `docs/architecture.md`, `plans/20261021-mvp/lead-brief.md` mục 1. Dùng `srcwalk` thay `rg/grep/cat`.

## Được sửa

Chỉ `docs/spec.md` và `docs/architecture.md`. KHÔNG sửa file khác (agent khác đang sửa `plans/20261021-mvp/backend/`), KHÔNG git checkout/reset/stash/commit/push. Sửa tại chỗ bằng sửa văn bản, không viết lại cả file. Giữ nguyên mọi nội dung không liên quan.

## Quyết định cần phản ánh (người dùng chốt 2026-10-21)

1. Backend giữ Cloudflare Worker + D1, KHÔNG dùng Firestore. Firebase CHỈ dùng cho Firebase Cloud Messaging (FCM) để đẩy thông báo.
2. Push = FCM cho cả iOS native (FCM qua APNs, SDK Firebase Messaging trong app SwiftUI) và PWA/web (FCM web token), THAY cho Web Push VAPID tự gửi. Bảng D1 lưu device token theo user và membership (nền tảng `ios|web`, ngày tạo/cập nhật; xoá khi FCM trả token không hợp lệ).
3. Worker gửi bằng FCM HTTP v1: cần access token OAuth ký JWT RS256 từ service account; ký RSA tốn CPU trên Worker (10 ms) nên cache access token khoảng 50 phút (KV hoặc D1, chưa chốt chỗ lưu) và đo thực tế (chưa đo, ghi "chưa kiểm chứng"). Service account để trong secret của Worker, không commit, không in log.
4. Nội dung push KHÔNG chứa nhận xét hay điểm chi tiết (chỉ tiêu đề kiểu "Có phiếu buổi học mới của Minh Anh"); lý do: quy tắc không đưa nội dung nhận xét vào log và kênh ngoài.
5. Chỉ gửi khi giáo viên bấm gửi phiếu hoặc phát hành báo cáo, giao BTVN, có điểm mới (đúng spec 5.3). Chi tiết gộp thông báo chưa chốt.
6. Câu hỏi cũ "Push: APNs/Web Push, iOS cần APNs" (architecture mục 2 và mục 9, spec mục 5.3, mục 6) coi là đã chốt theo FCM.

## Chỗ cần sửa (rà thêm bằng srcwalk các từ: push, Web Push, VAPID, APNs, thông báo, FCM, Firebase, SMS, Zalo)

spec.md: mục 5.3 hàng Thông báo (có nhận xét, BTVN, điểm, báo cáo mới; push bằng FCM; "Thông báo quan trọng gửi thêm qua Zalo hoặc SMS" nằm ở "Làm sau" nên giữ như hiện tại, đừng làm mất); mục 6 (PWA: push trên iPhone chỉ sau khi cài và từ iOS 16.4: giữ đúng sự thật; thêm rằng web nhận push qua FCM web token; iOS native nhận qua FCM/APNs); mục 8 Bản đầu dòng "thông báo trong app và push" (ghi push là FCM); dòng "Cập nhật" đầu file thêm câu ngắn; thêm quy tắc nội dung push không chứa nhận xét/điểm chi tiết ở nơi hợp lý (mục 5.3 hoặc mục 9 phi chức năng).
architecture.md: mục 2 bảng Stack hàng Push (đổi thành FCM; loại bỏ "Web Push chuẩn (VAPID)" khỏi cột chọn, thêm vào cột loại bỏ cùng "APNs gọi trực tiếp từ Worker"; thêm chú thích Firebase chỉ cho FCM, không dùng Firestore), bảng "Loại bỏ" của hàng Cơ sở dữ liệu có thể thêm "Firestore"; mục 3 cây thư mục (`routes/` thêm device token, push); mục 4 thêm bullet về device token (bảng, ràng buộc, xoá khi FCM báo token không hợp lệ) và gửi push (HTTP v1, cache access token, secret, nội dung tối thiểu); mục 7 bảng rủi ro (thêm dòng ký RS256 tốn CPU và lộ service account; sửa dòng push iOS nếu có); mục 9 (thay "APNs chưa chốt" bằng các điều chưa kiểm chứng: CPU ký RS256 trên Worker, hạn mức subrequest khi gửi đồng loạt, FCM web trên iOS PWA).

## Quy tắc viết

Tiếng Việt, ngắn, đúng giọng hiện có. Gắn nhãn "(đã chốt 2026-10-21)" cho điểm 1, 2, 4, 6; điểm 3 và 5 ghi phần chưa chốt là "chưa chốt". Không bịa quyết định ngoài danh sách. Không ghi khoá, token, giá trị thật.

## Xong khi (tự kiểm bằng srcwalk)

- Không còn chỗ nào nói app tự gửi Web Push VAPID hoặc Worker gọi APNs trực tiếp, trừ câu nói rõ đã thay.
- spec.md và architecture.md không mâu thuẫn nhau về push, Firebase, backend.
- Link nội bộ còn đúng.

Ghi báo cáo ngắn vào `plans/20261021-mvp/briefs/02-docs-fcm.report.md`. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
