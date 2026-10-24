import { lazy, Suspense, useEffect } from "react";
import {
  Navigate,
  Outlet,
  redirect,
  useRouteError,
  useLocation,
} from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import {
  enterDemoSession,
  getAuthSession,
} from "../data/repositories/auth";
import { useStore } from "../data/store";
import TeacherShell from "./TeacherShell";
import { Spinner } from "../shared/ui";
import { features } from "../shared/features";
import RedirectTo from "./RedirectTo";
import {
  activeRoleIsGuardian,
  roleLandingPath,
} from "../roles/guardian/roleLanding";
const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const RegisterPage = lazy(() => import("../features/auth/RegisterPage"));
const ResetPasswordPage = lazy(
  () => import("../features/auth/ResetPasswordPage"),
);
const ForgotPasswordPage = lazy(
  () => import("../features/auth/ForgotPasswordPage"),
);
const RolePickerPage = lazy(() => import("../features/auth/RolePickerPage"));
const ChangePasswordPage = lazy(
  () => import("../features/settings/ChangePasswordPage"),
);
const ClassListPage = lazy(() => import("../features/classes/ClassListPage"));
const NewClassPage = lazy(() => import("../features/classes/NewClassPage"));
const ClassSpaceLayout = lazy(
  () => import("../features/class-space/ClassSpaceLayout"),
);
const SessionsTab = lazy(
  () => import("../features/class-space/SessionsTab"),
);
const SessionDetailPage = lazy(
  () => import("../features/class-space/SessionDetailPage"),
);
const TestsTab = lazy(() => import("../features/class-space/TestsTab"));
const TestScoresPage = lazy(
  () => import("../features/scores/TestScoresPage"),
);
const ScoreGridTab = lazy(
  () => import("../features/class-space/ScoreGridTab"),
);
const StudentsPage = lazy(() => import("../features/students/StudentsPage"));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage"));
const NewTestPage = lazy(() => import("../features/scores/NewTestPage"));
const SchedulePage = lazy(() => import("../features/schedule/SchedulePage"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const LibraryPage = lazy(() => import("../features/lectures/LibraryPage"));
const LectureEditorPage = lazy(
  () => import("../features/lectures/LectureEditorPage"),
);
const LectureDetailPage = lazy(
  () => import("../features/lectures/LectureDetailPage"),
);
const MembersPage = lazy(() => import("../features/staff/MembersPage"));
const MemberDetailPage = lazy(
  () => import("../features/staff/MemberDetailPage"),
);
const RolesPage = lazy(() => import("../features/staff/RolesPage"));
const RoleEditorPage = lazy(
  () => import("../features/staff/RoleEditorPage"),
);
const AssignmentsPage = lazy(
  () => import("../features/staffing/AssignmentsPage"),
);
const TeachingSchedulePage = lazy(
  () => import("../features/staffing/TeachingSchedulePage"),
);
const PayrollPage = lazy(() => import("../features/payroll/PayrollPage"));
const PayrollDetailPage = lazy(
  () => import("../features/payroll/PayrollDetailPage"),
);
const TuitionPage = lazy(() => import("../features/tuition/TuitionPage"));
const TuitionDetailPage = lazy(
  () => import("../features/tuition/TuitionDetailPage"),
);
const ScoreReportPage = lazy(
  () => import("../features/scores/ScoreReportPage"),
);
const StudentScoreReportPage = lazy(
  () => import("../features/scores/StudentScoreReportPage"),
);

/** Màn phụ huynh tách chunk riêng để phụ huynh không tải mã của nhân sự. */
const GuardianShell = lazy(
  () => import("../roles/guardian/GuardianShell"),
);
const GuardianClassPage = lazy(
  () => import("../roles/guardian/GuardianClassPage"),
);
const GuardianScoresPage = lazy(
  () => import("../roles/guardian/GuardianScoresPage"),
);
const GuardianCommentsPage = lazy(
  () => import("../roles/guardian/GuardianCommentsPage"),
);
const GuardianSessionPage = lazy(
  () => import("../roles/guardian/GuardianSessionPage"),
);
const GuardianReportPage = lazy(
  () => import("../roles/guardian/GuardianReportPage"),
);

/**
 * Chặn chéo hai khu vực bằng loader (chạy trước khi render nên kiểm chứng được
 * bằng createMemoryRouter): vai trò phụ huynh vào tuyến nhân sự thì về /ph,
 * vai trò nhân sự vào /ph thì về /lop.
 */
const staffOnlyLoader = () => (activeRoleIsGuardian() ? redirect("/ph") : null);
const guardianOnlyLoader = () =>
  activeRoleIsGuardian() ? null : redirect("/lop");
/** "*" và trang đầu: phụ huynh về /ph, nhân sự về /lop. */
const homeLoader = () => redirect(roleLandingPath());

/**
 * Lối vào Lương: cờ tắt thì mọi đường dẫn `/luong*` chuyển về trang chính.
 * Dùng loader (không dùng <Navigate>) để chuyển hướng xảy ra trước khi render,
 * nhờ vậy route được kiểm chứng bằng createMemoryRouter trong test.
 */
const payrollRoutes: RouteObject[] = features.payroll
  ? [
      { path: "/luong", element: <PayrollPage /> },
      { path: "/luong/:memberId", element: <PayrollDetailPage /> },
    ]
  : [
      { path: "/luong", loader: () => redirect("/lop") },
      { path: "/luong/*", loader: () => redirect("/lop") },
    ];

const lectureRoutes: RouteObject[] = features.lectures
  ? [
      { path: "/bai-giang", element: <LibraryPage /> },
      { path: "/bai-giang/moi", element: <LectureEditorPage /> },
      { path: "/bai-giang/:lectureId", element: <LectureDetailPage /> },
      { path: "/bai-giang/:lectureId/sua", element: <LectureEditorPage /> },
    ]
  : [
      { path: "/bai-giang", loader: () => redirect("/lop") },
      { path: "/bai-giang/*", loader: () => redirect("/lop") },
    ];

/** Trang đầu theo vai trò, dùng cho các đường dẫn đã bị tắt bằng cờ. */
const roleHome = () =>
  redirect(getAuthSession() ? roleLandingPath() : "/dang-nhap");

/** Nhân sự, phân công, lịch dạy, vai trò: ngoài Bản đầu (spec mục 8). */
const staffingRoutes: RouteObject[] = features.staffing
  ? [
      { path: "/nhan-su", element: <MembersPage /> },
      { path: "/nhan-su/:memberId", element: <MemberDetailPage /> },
      { path: "/phan-cong", element: <AssignmentsPage /> },
      { path: "/lich-day", element: <TeachingSchedulePage /> },
      { path: "/vai-tro", element: <RolesPage /> },
      { path: "/vai-tro/moi", element: <RoleEditorPage /> },
      { path: "/vai-tro/:roleId", element: <RoleEditorPage /> },
    ]
  : [
      { path: "/nhan-su", loader: roleHome },
      { path: "/nhan-su/*", loader: roleHome },
      { path: "/phan-cong", loader: roleHome },
      { path: "/lich-day", loader: roleHome },
      { path: "/vai-tro", loader: roleHome },
      { path: "/vai-tro/*", loader: roleHome },
    ];

/** Học phí: ngoài Bản đầu (spec mục 8). */
const tuitionRoutes: RouteObject[] = features.tuition
  ? [
      { path: "/hoc-phi", element: <TuitionPage /> },
      { path: "/hoc-phi/:studentId", element: <TuitionDetailPage /> },
    ]
  : [
      { path: "/hoc-phi", loader: roleHome },
      { path: "/hoc-phi/*", loader: roleHome },
    ];

/** Báo cáo điểm tổng hợp/từng học sinh: ngoài Bản đầu. */
const scoreReportRoutes: RouteObject[] = features.scoreReports
  ? [
      {
        path: "bao-cao-diem",
        element: <ScoreReportPage />,
        handle: { detail: true },
      },
      {
        path: "bao-cao-diem/:studentId",
        element: <StudentScoreReportPage />,
        handle: { detail: true },
      },
    ]
  : [
      { path: "bao-cao-diem", loader: () => redirect("/lop") },
      { path: "bao-cao-diem/*", loader: () => redirect("/lop") },
    ];

function Guard() {
  useStore();
  return getAuthSession() ? <Outlet /> : <Navigate to="/dang-nhap" replace />;
}

/** Cài đặt dùng chung cho cả hai vai trò: khung nhân sự hoặc khung phụ huynh. */
function SettingsShell() {
  return activeRoleIsGuardian() ? <GuardianShell /> : <TeacherShell />;
}

/**
 * Chặn khi vai trò đang dùng bị thu hồi (thành viên bị vô hiệu hoá hoặc không
 * còn). Người dùng buộc chọn lại vai trò trước khi xem bất kỳ dữ liệu nào.
 */
function RoleGuard() {
  const state = useStore();
  const memberIds = state.auth?.memberIds ?? [];
  const active = state.members.find(
    (member) =>
      memberIds.includes(member.id) && member.id === state.activeMemberId,
  );
  if (!active || active.status === "disabled")
    return <Navigate to="/chon-vai-tro" replace />;
  return <Outlet />;
}

function Loading() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles: Array<[RegExp, string]> = [
      [/^\/ph\/buoi\/[^/]+$/, "Buổi học"],
      [/^\/ph\/nhan-xet$/, "Nhận xét của cô"],
      [/^\/ph\/diem$/, "Điểm số"],
      [/^\/ph\/bao-cao\/[^/]+$/, "Báo cáo"],
      [/^\/ph\/bao-cao$/, "Báo cáo"],
      [/^\/ph$/, "Lớp học của con"],
      [/^\/doi-mat-khau-bat-buoc$/, "Đổi mật khẩu"],
      [/^\/dang-nhap$/, "Đăng nhập"],
      [/^\/dang-ky$/, "Tạo không gian làm việc"],
      [/^\/quen-mat-khau$/, "Quên mật khẩu"],
      [/^\/dat-lai-mat-khau$/, "Đặt mật khẩu mới"],
      [/^\/chon-vai-tro$/, "Chọn vai trò"],
      [/^\/bai-giang\/moi$/, "Soạn bài giảng"],
      [/^\/bai-giang\/[^/]+\/sua$/, "Sửa bài giảng"],
      [/^\/bai-giang\/[^/]+$/, "Chi tiết bài giảng"],
      [/^\/bai-giang$/, "Bài giảng"],
      [/^\/nhan-su\/[^/]+$/, "Chi tiết nhân sự"],
      [/^\/nhan-su$/, "Nhân sự"],
      [/^\/phan-cong$/, "Phân công giảng dạy"],
      [/^\/luong\/[^/]+$/, "Chi tiết lương"],
      [/^\/luong$/, "Lương"],
      [/^\/hoc-phi\/[^/]+$/, "Phiếu học phí"],
      [/^\/hoc-phi$/, "Học phí"],
      [/^\/vai-tro\/moi$/, "Tạo vai trò"],
      [/^\/vai-tro\/[^/]+$/, "Sửa vai trò"],
      [/^\/vai-tro$/, "Vai trò"],
      [/^\/lop\/moi$/, "Tạo lớp mới"],
      [/^\/lop\/[^/]+\/buoi-hoc\/[^/]+$/, "Chi tiết buổi học"],
      [/^\/lop\/[^/]+\/buoi-hoc$/, "Buổi học"],
      [/^\/lop\/[^/]+\/bai-kiem-tra\/moi$/, "Tạo bài kiểm tra"],
      [/^\/lop\/[^/]+\/bai-kiem-tra\/[^/]+$/, "Bảng điểm bài kiểm tra"],
      [/^\/lop\/[^/]+\/bai-kiem-tra$/, "Bài kiểm tra"],
      [/^\/lop\/[^/]+\/diem$/, "Điểm"],
      [/^\/lop\/[^/]+\/hoc-sinh$/, "Học sinh"],
      [/^\/lop\/[^/]+\/bao-cao-diem\/[^/]+$/, "Báo cáo điểm học viên"],
      [/^\/lop\/[^/]+\/bao-cao-diem$/, "Báo cáo điểm"],
      [/^\/lop\/[^/]+\/bao-cao$/, "Báo cáo"],
      [/^\/lop$/, "Lớp của tôi"],
      [/^\/lich-day$/, "Lịch dạy"],
      [/^\/lich$/, "Lịch"],
      [/^\/cai-dat\/doi-mat-khau$/, "Đổi mật khẩu"],
      [/^\/cai-dat$/, "Cài đặt"],
    ];
    document.title =
      titles.find(([route]) => route.test(pathname))?.[1] ?? "Quản lý lớp";
  }, [pathname]);
  return (
    <Suspense fallback={<Spinner />}>
      <Outlet />
    </Suspense>
  );
}
function RouteError() {
  useRouteError();
  return (
    <main>
      <h1>Không thể mở màn hình</h1>
      <p>Vui lòng tải lại hoặc quay về lớp.</p>
      <a href="/lop">Về danh sách lớp</a>
    </main>
  );
}
export const routes: RouteObject[] = [
  {
    element: <Loading />,
    errorElement: <RouteError />,
    children: [
      {
        path: "/dang-nhap",
        element: <LoginPage />,
        loader: () => {
          if (!features.skipLogin) return null;
          if (!getAuthSession()) enterDemoSession();
          return redirect("/chon-vai-tro");
        },
      },
      { path: "/dang-ky", element: <RegisterPage /> },
      { path: "/quen-mat-khau", element: <ForgotPasswordPage /> },
      { path: "/dat-lai-mat-khau", element: <ResetPasswordPage /> },
      {
        element: <Guard />,
        children: [
            { path: "/chon-vai-tro", element: <RolePickerPage /> },
            {
              element: <Outlet />,
            children: [
              {
                path: "/cai-dat",
                element: <SettingsShell />,
                children: [
                  { index: true, element: <SettingsPage /> },
                  { path: "doi-mat-khau", element: <ChangePasswordPage /> },
                ],
              },
              {
                element: <RoleGuard />,
                children: [
                  {
                    loader: staffOnlyLoader,
                    element: <TeacherShell />,
                    children: [
                      { path: "/lop", element: <ClassListPage /> },
                      { path: "/lop/moi", element: <NewClassPage /> },
                      {
                        path: "/lop/:classId",
                        element: <ClassSpaceLayout />,
                        children: [
                          {
                            index: true,
                            element: <Navigate to="buoi-hoc" replace />,
                          },
                          { path: "buoi-hoc", element: <SessionsTab /> },
                          {
                            path: "buoi-hoc/:sessionId",
                            element: <SessionDetailPage />,
                            handle: { detail: true },
                          },
                          { path: "bai-kiem-tra", element: <TestsTab /> },
                          {
                            path: "bai-kiem-tra/moi",
                            element: <NewTestPage />,
                            handle: { detail: true },
                          },
                          {
                            path: "bai-kiem-tra/:testId",
                            element: <TestScoresPage />,
                            handle: { detail: true },
                          },
                          { path: "diem", element: <ScoreGridTab /> },
                          { path: "hoc-sinh", element: <StudentsPage /> },
                          { path: "bao-cao", element: <ReportsPage /> },
                          ...scoreReportRoutes,
                        ],
                      },
                      {
                        path: "/lop/:classId/diem-danh",
                        element: (
                          <RedirectTo
                            to={(params) => `/lop/${params.classId}/buoi-hoc`}
                          />
                        ),
                      },
                      {
                        path: "/lop/:classId/nhan-xet",
                        element: (
                          <RedirectTo
                            to={(params) => `/lop/${params.classId}/buoi-hoc`}
                          />
                        ),
                      },
                      {
                        path: "/lop/:classId/diem/bai-moi",
                        element: (
                          <RedirectTo
                            to={(params) =>
                              `/lop/${params.classId}/bai-kiem-tra/moi`
                            }
                          />
                        ),
                      },
                      ...lectureRoutes,
                      ...staffingRoutes,
                      ...payrollRoutes,
                      ...tuitionRoutes,
                      { path: "/lich", element: <SchedulePage /> },
                    ],
                  },
                  {
                    path: "/ph",
                    loader: guardianOnlyLoader,
                    element: <GuardianShell />,
                    children: [
                      { index: true, element: <GuardianClassPage /> },
                      { path: "nhan-xet", element: <GuardianCommentsPage /> },
                      {
                        path: "buoi/:sessionId",
                        element: <GuardianSessionPage />,
                        handle: { detail: true },
                      },
                      { path: "diem", element: <GuardianScoresPage /> },
                      { path: "diem-danh", loader: () => redirect("/ph") },
                      { path: "diem-so", loader: () => redirect("/ph/diem") },
                      { path: "btvn", loader: () => redirect("/ph") },
                      {
                        path: "nhan-xet/:sessionId",
                        loader: ({ params }) =>
                          redirect(`/ph/buoi/${params.sessionId}`),
                      },
                      {
                        path: "btvn/:sessionId",
                        loader: ({ params }) =>
                          redirect(`/ph/buoi/${params.sessionId}`),
                      },
                      { path: "bao-cao", element: <GuardianReportPage /> },
                      {
                        path: "bao-cao/:reportId",
                        element: <GuardianReportPage />,
                        handle: { detail: true },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", loader: homeLoader },
    ],
  },
];
