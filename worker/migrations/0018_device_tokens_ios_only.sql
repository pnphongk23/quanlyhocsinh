-- 0018_device_tokens_ios_only.sql — bỏ nền tảng 'web' khỏi device token (2026-11-08).
-- Nghiệp vụ: web/PWA không push nữa (bỏ FCM web/VAPID), chỉ app iOS nhận push. `PUT
-- /device-tokens` đã chỉ nhận `platform = 'ios'`; hai trigger dưới đây giữ bất biến đó ở D1
-- phòng khi có đường ghi khác.
-- CHỈ THÊM: không sửa cột, không xoá hàng. Hàng 'web' cũ (nếu có, ví dụ trên dev) giữ
-- nguyên và vẫn đọc/sửa được các cột khác; lần đăng ký lại của thiết bị đó ghi platform
-- = 'ios' qua API. CHECK trong 0001_schema.sql vẫn cho 'web' nên không cần dựng lại bảng.
-- ROLLBACK: DROP hai trigger; dữ liệu không đổi.

CREATE TRIGGER device_tokens_platform_ios_ins
BEFORE INSERT ON device_tokens
WHEN NEW.platform <> 'ios'
BEGIN
  SELECT RAISE(ABORT, 'device_token_platform_ios_only');
END;

-- Chỉ chặn khi ĐỔI platform, để hàng 'web' cũ vẫn cập nhật được updated_at/bound_at mà không
-- phải xoá hay sửa dữ liệu cũ trước.
CREATE TRIGGER device_tokens_platform_ios_upd
BEFORE UPDATE OF platform ON device_tokens
WHEN NEW.platform <> 'ios' AND NEW.platform IS NOT OLD.platform
BEGIN
  SELECT RAISE(ABORT, 'device_token_platform_ios_only');
END;
