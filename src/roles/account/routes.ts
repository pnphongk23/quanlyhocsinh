import type { RouteObject } from "react-router-dom";
import { placeholderRoute } from "../../app/placeholderRoute";
/** W-4 owns account UI; W-1 adds real session/guards in Phase B. */
export const accountRoutes: RouteObject[] = [
  { path: "/dang-nhap", lazy: placeholderRoute("Đăng nhập") },
  { path: "/dang-ky", lazy: placeholderRoute("Tạo không gian làm việc") },
  { path: "/quen-mat-khau", lazy: placeholderRoute("Quên mật khẩu") },
  { path: "/doi-mat-khau-bat-buoc", lazy: placeholderRoute("Đổi mật khẩu") },
  { path: "/chon-vai-tro", lazy: placeholderRoute("Chọn vai trò") },
  { path: "/cai-dat", lazy: placeholderRoute("Cài đặt") },
  { path: "/cai-dat/doi-mat-khau", lazy: placeholderRoute("Đổi mật khẩu") },
];
