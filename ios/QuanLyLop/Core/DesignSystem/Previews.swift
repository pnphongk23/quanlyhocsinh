import SwiftUI

/// Component gallery mirroring `design/prototype/src/shared/ui` so the design system can be
/// checked side by side with the prototype. Screenshot source for `ios/docs/screens/`.
struct DesignSystemGallery: View {
    /// `QLH_DESIGN_GALLERY=sheet` opens the sheet variant for the comparison screenshot.
    @State private var showSheet = ProcessInfo.processInfo.environment["QLH_DESIGN_GALLERY"] == "sheet"

    var body: some View {
        ScrollView {
            DesignSystemGalleryContent()
        }
        .background(AppColors.background)
        .sheet(isPresented: $showSheet) {
            AppSheet(title: "Nhận xét buổi học", content: {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Chọn mức sao cho học sinh").appText(AppText.body).foregroundStyle(AppColors.text)
                    AppTextField(label: "Nhận xét", text: .constant("Con hoàn thành 2 sao 🌟🌟."))
                }
            }, footer: {
                AppButton(title: "Gửi phiếu", size: .large, action: {})
            }, close: { showSheet = false })
        }
    }
}

/// The gallery without the scroll view, so `ImageRenderer` (used for the screenshots) can lay it out.
struct DesignSystemGalleryContent: View {
    @State private var name = ""
    @State private var segment = "attendance"
    @State private var level: HomeworkLevel? = .done

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Lớp 6A").appText(AppText.title).foregroundStyle(AppColors.text)
            Text("Thứ 3, 21/10 · 18:00").appText(AppText.muted).foregroundStyle(AppColors.muted)

            AppCard {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Buổi học hôm nay").appText(AppText.heading).foregroundStyle(AppColors.text)
                    HStack(spacing: 8) {
                        ForEach(AttendanceStatus.allCases, id: \.self) { $0.pill }
                    }
                }
            }

            AppCard(selected: true) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Nguyễn Minh Anh").appText(AppText.subheading).foregroundStyle(AppColors.text)
                    HStack(spacing: 6) {
                        AppChip(title: "3 sao")
                        AppChip(title: "12/15 điểm")
                        AppPill(title: "Đã gửi", tone: .primary)
                    }
                    HStack(spacing: 6) {
                        AppHomeworkPill(level: level)
                        AppHomeworkPill(level: nil)
                    }
                    AppHomeworkLevelControl(level: level) { level = $0 }
                }
            }

            AppSegmented(options: [
                .init(value: "attendance", label: "Điểm danh"),
                .init(value: "comments", label: "Nhận xét"),
                .init(value: "homework", label: "Bài tập về nhà"),
            ], value: segment) { segment = $0 }

            AppTextField(label: "Tên lớp", text: $name, placeholder: "Ví dụ: Lớp 6A")
            AppTextField(label: "Mật khẩu", text: $name, error: "Mật khẩu chưa đúng.", secure: true)

            HStack(spacing: 8) {
                AppButton(title: "Lưu", action: {})
                AppButton(title: "Huỷ", variant: .secondary, action: {})
                AppButton(title: "Xoá", variant: .danger, size: .medium, action: {})
            }
            AppButton(title: "Gửi phiếu buổi học", size: .large, action: {})
            AppButton(title: "Đang lưu", size: .medium, action: {}).disabled(true)

            AppEmptyState(title: "Chưa có học sinh") {
                Text("Thêm học sinh đầu tiên vào lớp.").appText(AppText.body)
            }
            AppErrorState(retry: {})
            HStack { AppSpinner(); Spacer() }

            VStack(spacing: 8) {
                ForEach(AttendanceStatus.allCases, id: \.self) { status in
                    AppListRow {
                        Text(status.label).appText(AppText.body).foregroundStyle(AppColors.text)
                        Spacer()
                        status.pill
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }
}

#Preview("Thành phần") { DesignSystemGallery() }

#Preview("Sheet") {
    Color.clear.sheet(isPresented: .constant(true)) {
        AppSheet(title: "Nhận xét buổi học", content: {
            VStack(alignment: .leading, spacing: 12) {
                Text("Chọn mức sao cho học sinh").appText(AppText.body)
                AppTextField(label: "Nhận xét", text: .constant("Con hoàn thành 2 sao."))
            }
        }, footer: {
            AppButton(title: "Gửi phiếu", size: .large, action: {})
        }, close: {})
    }
}

/// Empty states with Mít, the four save-button states and the save status lines.
struct DesignSystemStatesGallery: View {
    @State private var controller = AppSaveController()

    var body: some View {
        VStack(spacing: 16) {
            AppEmptyState(title: String(localized: "ds.preview.empty.students.title", table: "DesignSystem"),
                          description: String(localized: "ds.preview.empty.students.description", table: "DesignSystem"),
                          actionTitle: String(localized: "ds.preview.empty.students.action", table: "DesignSystem"), action: {})
            AppEmptyState(title: String(localized: "ds.preview.empty.results.title", table: "DesignSystem"), mascot: .main, size: .compact)
            AppSaveButton(title: "Lưu", controller: controller) {}
            VStack(alignment: .leading, spacing: 8) {
                AppSaveStatus(kind: .pending)
                AppSaveStatus(kind: .offline)
                AppSaveStatus(kind: .error)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 8) {
                AppChip(title: "Tất cả", selected: true)
                AppChip(title: "Hôm nay")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(20)
        .background(AppColors.background)
    }
}

#Preview("Trạng thái") { DesignSystemStatesGallery() }
