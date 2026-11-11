// Pha 2 baseline snapshot. Reduce only; remove route entries after Pha 3 migration.
// Guardian width breakpoints are temporary legacy entries and must be removed after Pha 3.
export const layoutAllowlist = {
  "routeTemplate": {
    // Remove Cài đặt routes after Pha 3 template migration.
    "src/features/settings/SettingsPage.tsx": 1,
    // Remove after Cài đặt migration in Pha 3.
    "src/features/settings/ChangePasswordPage.tsx": 1,
    "src/features/settings/EmailSettings.tsx": 1,
    "src/features/comments/CriteriaSetSettingsPage.tsx": 1,
    // Remove Điểm danh route after Pha 3 template migration.
    "src/features/class-space/SessionDetailPage.tsx": 1
  },
  "media": {
    // Remove after Điểm danh migration in Pha 3.
    "src/features/attendance/AttendancePanel.module.css": 1,
    "src/features/auth/auth.module.css": 1,
    "src/features/class-space/classSpace.module.css": 1,
    "src/features/class-space/desktop.module.css": 1,
    "src/features/class-space/sessionDetail.module.css": 2,
    "src/features/class-space/sessions.module.css": 1,
    "src/features/classes/classes.module.css": 1,
    "src/features/classes/classesForm.module.css": 3,
    "src/features/classes/dialogs.module.css": 1,
    "src/features/classes/editClassSchedule.module.css": 2,
    "src/features/classes/today.module.css": 1,
    "src/features/comments/CommentsDesktop.module.css": 1,
    "src/features/comments/CommentsPanel.module.css": 2,
    "src/features/comments/CriteriaMode.module.css": 1,
    "src/features/comments/SlipCriteriaFields.module.css": 2,
    "src/features/comments/SlipLevelFields.module.css": 1,
    // Remove after Cài đặt/Điểm danh migration in Pha 3.
    "src/features/comments/criteriaSetSettings.module.css": 1,
    "src/features/comments/notesImport.module.css": 1,
    "src/features/homework/HomeworkPanel.module.css": 1,
    "src/features/pwa/pwa.module.css": 1,
    "src/features/reports/ReportsPage.module.css": 3,
    "src/features/reports/reportDialog.module.css": 1,
    "src/features/schedule/schedule.module.css": 2,
    "src/features/scores/scores.module.css": 5,
    // Remove after Cài đặt migration in Pha 3.
    "src/features/settings/settings.module.css": 1,
    "src/features/students/importStudents.module.css": 2,
    "src/features/students/students.module.css": 2,
    // Legacy guardian breakpoints: reduce, then remove after later responsive work.
    "src/roles/guardian/guardian.module.css": 1,
    "src/roles/guardian/guardianShell.module.css": 1
  },
  "responsiveHook": {
    // Remove after Điểm danh migration in Pha 3.
    "src/features/attendance/AttendancePanel.tsx": 1,
    "src/features/class-space/ClassSpaceLayout.tsx": 1,
    "src/features/class-space/ScoreGridTab.tsx": 1,
    // Remove Điểm danh route after Pha 3 template migration.
    "src/features/class-space/SessionDetailPage.tsx": 1,
    "src/features/class-space/SessionsTab.tsx": 1,
    "src/features/class-space/TestsTab.tsx": 1,
    "src/features/classes/ClassListPage.tsx": 1,
    "src/features/comments/CommentTicketSheet.tsx": 1,
    "src/features/reports/ReportBatchDetail.tsx": 1,
    "src/features/reports/ReportBatchList.tsx": 1,
    "src/features/scores/TestScoresPage.tsx": 1,
    // Remove after Cài đặt migration in Pha 3.
    "src/features/settings/ChangePasswordPage.tsx": 1,
    // Remove Cài đặt routes after Pha 3 template migration.
    "src/features/settings/SettingsPage.tsx": 1,
    "src/features/staff/StaffPage.tsx": 1,
    "src/features/students/StudentsPage.tsx": 1,
    "src/shared/hooks/useIsDesktop.ts": 3,
    "src/shared/hooks/usePullToRefresh.ts": 1
  },
  "hardcoded": {
    "src/app/shell.module.css": 2,
    // Remove after Điểm danh migration in Pha 3.
    "src/features/attendance/AttendanceDesktop.module.css": 9,
    "src/features/attendance/AttendancePanel.module.css": 16,
    "src/features/auth/auth.module.css": 108,
    "src/features/class-space/classSpace.module.css": 7,
    "src/features/class-space/desktop.module.css": 54,
    "src/features/class-space/sessionDetail.module.css": 12,
    "src/features/class-space/sessions.module.css": 15,
    "src/features/classes/classes.module.css": 8,
    "src/features/classes/classesForm.module.css": 9,
    "src/features/classes/dialogs.module.css": 9,
    "src/features/classes/editClassSchedule.module.css": 14,
    "src/features/classes/today.module.css": 6,
    "src/features/comments/CommentsDesktop.module.css": 25,
    "src/features/comments/CommentsPanel.module.css": 35,
    "src/features/comments/CriteriaMode.module.css": 1,
    "src/features/comments/SlipCriteriaFields.module.css": 3,
    "src/features/comments/SlipLevelFields.module.css": 2,
    // Remove after Cài đặt/Điểm danh migration in Pha 3.
    "src/features/comments/criteriaSetSettings.module.css": 1,
    "src/features/comments/notesImport.module.css": 2,
    "src/features/comments/slipLevelSkeleton.module.css": 1,
    "src/features/homework/HomeworkDesktop.module.css": 40,
    "src/features/homework/HomeworkPanel.module.css": 50,
    "src/features/pwa/pwa.module.css": 64,
    "src/features/reports/ReportsPage.module.css": 45,
    "src/features/reports/reportDialog.module.css": 2,
    "src/features/schedule/schedule.module.css": 24,
    "src/features/scores/ScoreGridDesktop.module.css": 12,
    "src/features/scores/TestsDesktop.module.css": 18,
    "src/features/scores/scores.module.css": 47,
    // Remove after Cài đặt migration in Pha 3.
    "src/features/settings/emailSettings.module.css": 6,
    "src/features/settings/settings.module.css": 89,
    "src/features/staff/staff.module.css": 1,
    "src/features/students/StudentsDesktop.module.css": 14,
    "src/features/students/importStudents.module.css": 9,
    "src/features/students/students.module.css": 21,
    "src/roles/guardian/guardian.module.css": 62,
    "src/roles/guardian/guardianEmpty.module.css": 5,
    "src/roles/guardian/guardianShell.module.css": 25,
    "src/shared/SaveStatus/RejectedBanner.module.css": 2,
    "src/shared/SaveStatus/SaveStatus.module.css": 2,
    "src/shared/styles/reset.css": 1,
    "src/shared/ui/fab.module.css": 1,
    "src/shared/ui/levelSummary.module.css": 3,
    "src/shared/ui/pullToRefresh.module.css": 1,
    "src/shared/ui/ui.module.css": 23
  }
};
