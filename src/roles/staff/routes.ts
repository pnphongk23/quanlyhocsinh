import type { RouteObject } from "react-router-dom";
import { redirect } from "react-router-dom";
import { placeholderRoute } from "../../app/placeholderRoute";
/** W-2 owns staff features. Keep feature pages lazy, including desktop scores/reports. */
export const staffRoutes: RouteObject[] = [{
  lazy: () => import("./StaffShell"),
  children: [
    { path: "/lop", lazy: placeholderRoute("Lớp của tôi") },
    { path: "/lop/moi", lazy: placeholderRoute("Tạo lớp mới") },
    { path: "/lop/:classId", children: [
      { index: true, loader: ({ params }) => redirect(`/lop/${params.classId}/buoi-hoc`) },
      { path: "buoi-hoc", lazy: placeholderRoute("Buổi học") },
      { path: "buoi-hoc/:sessionId", lazy: placeholderRoute("Chi tiết buổi học"), handle: { detail: true } },
      { path: "bai-kiem-tra", lazy: placeholderRoute("Bài kiểm tra") },
      { path: "bai-kiem-tra/moi", lazy: placeholderRoute("Tạo bài kiểm tra"), handle: { detail: true } },
      { path: "bai-kiem-tra/:testId", lazy: placeholderRoute("Bảng điểm bài kiểm tra"), handle: { detail: true } },
      { path: "diem", lazy: placeholderRoute("Điểm") },
      { path: "hoc-sinh", lazy: placeholderRoute("Học sinh") },
      { path: "bao-cao", lazy: placeholderRoute("Báo cáo") },
    ] },
    { path: "/lop/:classId/diem-danh", loader: ({ params }) => redirect(`/lop/${params.classId}/buoi-hoc`) },
    { path: "/lop/:classId/nhan-xet", loader: ({ params }) => redirect(`/lop/${params.classId}/buoi-hoc`) },
    { path: "/lop/:classId/diem/bai-moi", loader: ({ params }) => redirect(`/lop/${params.classId}/bai-kiem-tra/moi`) },
    { path: "/lich", lazy: placeholderRoute("Lịch") },
  ],
}];
