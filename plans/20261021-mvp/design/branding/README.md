# Bộ icon Mít

## Nguồn và prompt

Ảnh gốc `c.png` (1024×1024, RGB) là phương án C đã chọn: Mít đội mũ cử nhân. Ảnh được tạo bằng AI ImageGen; nội dung prompt được ghi trong `options.md`. Pha áp dụng chỉ crop, resize và tách nền để tạo biến thể maskable; không vẽ lại mascot.

Prompt lưu từ `options.md`:

> Use case: stylized-concept. Asset type: square 1024×1024 app icon artwork. Input images: Image 1 is Mít's definitive identity reference; preserve exact chick identity. Close-up portrait, head and face fill most of frame, crop below neck. Soft fluffy 3D fur matching reference. Yellow #FFD633, three soft crest feathers, large dark-brown #2B211B eyes, tiny orange #FF8A00 beak, hint of blue #2F5BEA backpack. Brand-blue background #2F5BEA subtle gradient to #1E43B8. Center full head and crest within 80% safe circle. No text, logo, watermark, transparency, border, rounded corners, extra objects. Child-friendly, readable at 16px. Variant C: friendly smile with compact blue graduation cap above crest; face dominant.

## Cách sinh

Script dùng Pillow và OpenCV, lấy `c.png` làm nguồn. PNG được ghi sRGB, RGB, không alpha. Bộ icon chính giữ nguyên toàn khung; `icon-maskable-512.png` tách nền gradient cũ, đặt mascot trên màu primary `#2f5bea` và thu nội dung vào vùng an toàn tròn 80%. `favicon.ico` dùng crop vuông (97, 0)–(927, 830) để phóng to mặt và mũ ở 16/32/48px.

Chạy từ gốc repo:

```sh
python3 scripts/generate-branding-icons.py \
  --source plans/20261021-mvp/design/branding/c.png \
  --web-dir /Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/public \
  --prototype-dir design/prototype/public \
  --ios-dir /Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Resources/Assets.xcassets/AppIcon.appiconset
```

## File và kích thước

| File | Kích thước | Dùng ở |
|---|---:|---|
| `icon-512.png` | 512×512 | Web, prototype; manifest `any` |
| `icon-192.png` | 192×192 | Web, prototype; manifest `any` |
| `icon-maskable-512.png` | 512×512 | Web, prototype; manifest `maskable` |
| `apple-touch-icon.png` | 180×180 | Web, prototype; iOS/iPadOS web clip |
| `favicon.ico` | 16×16, 32×32, 48×48 | Web, prototype tab icon |
| `shots/favicon-contact-sheet.png` | 1440×1000 | Real ICO frames on light/dark backgrounds; each shown 8× nearest-neighbor and native size |
| `icon-32.png` | 32×32 | Web, prototype PNG favicon fallback |
| `AppIcon.png` | 1024×1024 | iOS AppIcon; c.png, RGB, không alpha, sRGB |

Danh sách trên nằm trong cả `mvp-web/public/` và `design/prototype/public/`, trừ `AppIcon.png` chỉ có trong asset catalog iOS. `icon.svg` cũ đã được bỏ vì nó vẽ cuốn sách trắng, không còn giữ được mascot 3D. Manifest khai báo màu primary cho `theme_color` và `background_color`. Bản dark/tinted không tạo; AppIcon hiện chỉ có slot universal 1024×1024 và ảnh nguồn đã là đầy đủ.

## Kiểm chứng

- `mvp-web`: `npm run build` thành công; `npm test` 75 file passed, 2 skipped; 575 tests passed, 4 skipped.
- Prototype: `npm run build` thành công; `npm test` 62 file passed; 597 tests passed.
- iOS: cấu hình Staging build thành công cho iPhone 16 Simulator; app cài được và icon Mít hiện trên màn hình chính.
- Lighthouse CLI 13.5.0 chạy trên web và prototype: Best Practices 100% cho cả hai; SEO 63% web và 82% prototype. Lighthouse 13 không còn nhóm audit PWA/installability. Chrome hiển thị hành động Install cho app; manifest trả về primary đúng token và cả ba icon `192x192 any`, `512x512 any`, `512x512 maskable` tải được, đúng kích thước, RGB, không alpha; không có icon bị thiếu.
- Vite preview mở tại `http://127.0.0.1:4173/` trong Chrome. Kiểm tra request từ ngữ cảnh Chrome trả `GET http://127.0.0.1:4173/favicon.ico?verify=20261024` → HTTP `200`, `image/x-icon`, 8.253 byte (`fetch(..., {cache: 'no-store'})`); log hiệu năng của tab xác nhận các request tài nguyên preview. Công cụ `list_network_requests` không có trong phiên này, nên bằng chứng status lấy trực tiếp từ fetch chạy trong tab Chrome.
- `shots/favicon-contact-sheet.png` lấy trực tiếp các frame 16/32/48 thật bên trong `favicon.ico`, mỗi frame có bản phóng 8× nearest-neighbor và bản đúng kích thước, trên nền sáng lẫn tối.
- Thiếu quyền Screen Recording nên không chụp được thanh tab Chrome. `shots/favicon-tab.png` chỉ là viewport trang preview, không phải ảnh thanh tab; favicon trong tab được nhìn trực tiếp.
- `shots/ios-home.png` là ảnh chụp màn hình chính iPhone 16 Simulator có icon app.
