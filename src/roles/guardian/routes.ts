import type { RouteObject } from "react-router-dom";
import { placeholderRoute } from "../../app/placeholderRoute";
/** W-3 owns guardian features. No staff component imports in this module. */
export const guardianRoutes: RouteObject[] = [{
  path: "/ph", lazy: () => import("./GuardianShell"),
  children: [
    { index: true, lazy: placeholderRoute("Tổng quan") },
    { path: "diem-danh", lazy: placeholderRoute("Điểm danh") },
    { path: "diem-so", lazy: placeholderRoute("Điểm số") },
    { path: "nhan-xet", lazy: placeholderRoute("Nhận xét") },
    { path: "nhan-xet/:sessionId", lazy: placeholderRoute("Phiếu buổi học"), handle: { detail: true } },
    { path: "btvn", lazy: placeholderRoute("Bài tập về nhà") },
    { path: "btvn/:sessionId", lazy: placeholderRoute("Bài tập về nhà"), handle: { detail: true } },
    { path: "bao-cao", lazy: placeholderRoute("Báo cáo tháng") },
  ],
}];
