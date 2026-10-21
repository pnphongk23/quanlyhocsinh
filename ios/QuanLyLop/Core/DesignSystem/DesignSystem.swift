import SwiftUI

/// Semantic colors follow prototype tokens in light mode, native equivalents in dark mode.
enum AppColors {
    static let primary = Color(hex: 0x2F5BEA)
    static let background = adaptive(0xF6F7F9, dark: .systemGroupedBackground)
    static let surface = adaptive(0xFFFFFF, dark: .secondarySystemGroupedBackground)
    static let border = adaptive(0xE6E9EE, dark: .separator)
    static let text = adaptive(0x14181F, dark: .label)
    static let muted = adaptive(0x4A5361, dark: .secondaryLabel)
    static let success = adaptive(0x14663F, dark: .systemGreen)
    static let warning = adaptive(0x8A5300, dark: .systemOrange)
    static let error = adaptive(0xB42318, dark: .systemRed)
    static let successSoft = adaptive(0xE7F6EC, dark: .tertiarySystemGroupedBackground)
    static let warningSoft = adaptive(0xFFF3D6, dark: .tertiarySystemGroupedBackground)
    static let errorSoft = adaptive(0xFDECEC, dark: .tertiarySystemGroupedBackground)
    private static func adaptive(_ hex: UInt32, dark: UIColor) -> Color {
        let light = UIColor(red: Double((hex >> 16) & 255) / 255,
                            green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, alpha: 1)
        return Color(UIColor { $0.userInterfaceStyle == .dark ? dark : light })
    }
}
private extension Color {
    init(hex: UInt32) {
        self.init(.sRGB, red: Double((hex >> 16) & 255) / 255,
                  green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255, opacity: 1)
    }
}
enum AppTypography {
    static let title: Font = .title2.weight(.bold)
    static let heading: Font = .headline
    static let body: Font = .body
    static let caption: Font = .caption
}
struct AppButtonStyle: ButtonStyle {
    enum Kind { case primary, secondary, destructive }
    var kind: Kind = .primary
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.headline).frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, 16).padding(.vertical, 4)
            .foregroundStyle(kind == .secondary ? AppColors.primary : .white)
            .background(kind == .secondary ? AppColors.surface : (kind == .destructive ? AppColors.error : AppColors.primary),
                        in: .rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(kind == .secondary ? AppColors.border : .clear))
            .opacity(!isEnabled ? 0.45 : configuration.isPressed ? 0.75 : 1)
    }
}
struct AppTextField: View {
    let title: String
    @Binding var text: String
    var error: String? = nil
    var secure = false
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.medium))
            Group {
                if secure { SecureField(title, text: $text) }
                else { TextField(title, text: $text) }
            }
            .padding(12).frame(minHeight: 44).background(AppColors.surface, in: .rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(error == nil ? AppColors.border : AppColors.error))
            if let error { Text(error).font(.caption).foregroundStyle(AppColors.error) }
        }
    }
}
struct AppCard<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        content.padding(16).frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: .rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppColors.border))
    }
}
struct StatusChip: View {
    let title: String
    var tone: Tone = .neutral
    enum Tone { case neutral, success, warning, error }
    private var foreground: Color {
        switch tone { case .neutral: AppColors.muted; case .success: AppColors.success
        case .warning: AppColors.warning; case .error: AppColors.error }
    }
    private var background: Color {
        switch tone { case .neutral: AppColors.background; case .success: AppColors.successSoft
        case .warning: AppColors.warningSoft; case .error: AppColors.errorSoft }
    }
    var body: some View {
        Text(title).font(.caption.weight(.semibold)).padding(.horizontal, 10).padding(.vertical, 6)
            .foregroundStyle(foreground).background(background, in: .rect(cornerRadius: 10))
    }
    init(title: String, tone: Tone = .neutral) { self.title = title; self.tone = tone }
    init(attendance: AttendanceStatus) {
        switch attendance {
        case .present: self.init(title: "Có mặt", tone: .success)
        case .late: self.init(title: "Muộn", tone: .warning)
        case .excused: self.init(title: "Có phép")
        case .absent: self.init(title: "Vắng", tone: .error)
        }
    }
    init(homework: HomeworkLevel?) {
        switch homework {
        case .excellent: self.init(title: "Hoàn thành tốt", tone: .success)
        case .done: self.init(title: "Hoàn thành", tone: .success)
        case .notDone: self.init(title: "Chưa hoàn thành", tone: .error)
        case nil: self.init(title: "Chưa chấm")
        }
    }
}
struct AppSheet<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView { content.padding(16) }.background(AppColors.background)
                .navigationTitle(title).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Đóng") { dismiss() } } }
        }.presentationDragIndicator(.visible).presentationDetents([.medium, .large])
    }
}
struct AppEmptyState: View {
    let title: String
    var message: String = ""
    var symbol: String = "tray"
    var body: some View { ContentUnavailableView(title, systemImage: symbol, description: Text(message)) }
}
struct AppErrorState: View {
    var message: String = "Không thể tải dữ liệu. Vui lòng thử lại."
    var retry: () -> Void
    var body: some View {
        VStack(spacing: 16) {
            ContentUnavailableView("Đã xảy ra lỗi", systemImage: "exclamationmark.triangle", description: Text(message))
            Button("Thử lại", action: retry).buttonStyle(AppButtonStyle()).padding(.horizontal)
        }
    }
}
#Preview("Thành phần") {
    ScrollView {
        VStack(spacing: 16) {
            Text("Lớp tiếng Anh").font(AppTypography.title)
            AppCard { Text("Buổi học hôm nay").font(AppTypography.heading) }
            AppTextField(title: "Tên lớp", text: .constant("Lớp mẫu"))
            Button("Lưu") {}.buttonStyle(AppButtonStyle())
            ForEach(AttendanceStatus.allCases, id: \.self) { StatusChip(attendance: $0) }
            ForEach(HomeworkLevel.allCases, id: \.self) { StatusChip(homework: $0) }
            AppEmptyState(title: "Chưa có học sinh", message: "Thêm học sinh đầu tiên vào lớp.")
            AppErrorState(retry: {})
        }.padding()
    }.background(AppColors.background)
}
#Preview("Sheet") { AppSheet(title: "Nhận xét") { Text("Chọn mức sao cho học sinh") } }
